import { Writable, writable } from "svelte/store";
import { API } from "../../../../types/api";
import { UITypes } from "../../../../types/ui";
import { PageType,  pageNameStore } from "../../app-global";
import { currentUser, hookAppWS, makeAPIRequest, users} from "../../app-global-script";

export let currentChannelStore: Writable<API.GenericChannel | null> = writable();
export let currentChannelParsedMessagesStore: Writable<UITypes.DMBundle[]> = writable([]);
export let usersTypingStore: Writable<UITypes.UserTyping[]> = writable([]);
export let inputAllowedStore: Writable<boolean> = writable(true);
export let fileUploadInProgressStore: Writable<boolean> = writable(false);

let usersTyping: {[key: string]: UITypes.UserTyping} = {};
let currentChannel: API.DMChannel;
let currentChannelParsedMessages: UITypes.DMBundle[] = [];
let currentChannelPendingMessages: {[key: number]: API.IncomingDM} = {};
let currentUploadController: AbortController | undefined;

function renderCurrentChannelMessages() {
    currentChannelParsedMessagesStore.set(currentChannelParsedMessages);
}

function renderCurrentTyping() {
    usersTypingStore.set(Object.values(usersTyping));
}

function addMessage(message: API.IncomingDM) {
    const bundles = currentChannelParsedMessages;
    let bundle: UITypes.DMBundle = bundles[bundles.length - 1];
    if (!bundle || bundle.user.id !== message.user_id) {
        bundle = { messages: [message], user: users[message.user_id] };
        bundles.push(bundle);
    } else {
        bundle.messages.push(message);
    }
}

function registerWebsocketEvents() {
    hookAppWS((rawEvent: API.WS.Event) => {
        switch (rawEvent.op) {
            case "NEW_DM_MESSAGE": {
                const event: API.WS.EventNewDM = rawEvent;
                if (currentChannel.id !== event.data.channel_id) break;

                // If the message is a readback.
                if (event.data.nonce) {
                    const pendingMessage = currentChannelPendingMessages[event.data.nonce];
                    if (pendingMessage) {
                        if (pendingMessage.pending_data?.timeout) {
                            clearTimeout(pendingMessage.pending_data.timeout);
                        }
    
                        delete pendingMessage["pending_data"];
                        delete currentChannelParsedMessages[event.data.nonce];
    
                        renderCurrentChannelMessages();
                        break;   
                    }
                }

                // Cancel users typing if it exists.
                if (event.data.user_id in usersTyping) {
                    const typingInfo = usersTyping[event.data.user_id];
                    clearTimeout(typingInfo.timeout);
                    delete usersTyping[event.data.user_id];
                    renderCurrentTyping();
                }
                
                addMessage(event.data);
                renderCurrentChannelMessages();
                break;
            }

            case "TYPING_START": {
                const event: API.WS.EventTypingStart = rawEvent;
                if (currentChannel.id !== event.data.channel_id) break;

                const typingUser = users[event.data.user_id];
                if (!typingUser) break;

                let typingInfo = usersTyping[typingUser.id];
                if (!typingInfo) {
                    typingInfo = { user: typingUser, timeout: 0 };
                    usersTyping[typingUser.id] = typingInfo;
                    console.log("yes", typingInfo);
                    renderCurrentTyping();
                } else clearTimeout(typingInfo.timeout);

                typingInfo.timeout = setTimeout(() => {
                    delete usersTyping[typingUser.id];
                    renderCurrentTyping();
                }, 5000);
                break;
            }
        }
    });
    
    console.log("WS events hooked");
}

async function fetchLatestDMMessages() {
    const request = await makeAPIRequest("GET", `/api/dms/${currentChannel.id}/messages`);
    if (!request || !request.ok) {
        alert("Could not fetch latest messages!");
        return;
    }

    const messages: API.IncomingDM[] = await request.json();
    console.log("Messages", messages);

    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        addMessage(message);
    }

    renderCurrentChannelMessages();
    console.log("Parsed Messages", currentChannelParsedMessages);
}

export async function initDMPage(channel_id: string) {
    currentChannelParsedMessages = [];
    currentChannelParsedMessagesStore.set([]);

    const channelRequest = await makeAPIRequest("GET", `/api/dms/${channel_id}`);
    if (!channelRequest || !channelRequest.ok) {
        alert("DM channel does not exist or request was unsuccessful.");
        return;
    }

    const channel: API.DMChannel = await channelRequest.json();
    users[channel.user.id] = channel.user;

    currentChannel = channel;
    currentChannelStore.set(currentChannel);
    
    pageNameStore.set(`✉️ ${channel.user.username}`);

    console.log("DM channel:", currentChannel);

    fetchLatestDMMessages();
    registerWebsocketEvents();
}

export function cancelCurrentUploadController() {
    currentUploadController?.abort();
    currentUploadController = undefined;
}

export async function doDMMessageSend(content: string, attachments?: UITypes.MessageAttachment[]) {
    const message: API.OutgoingDM = { content, nonce: Math.floor(Math.random() * 1000000) + 1 };
    const parsedMessage: API.IncomingDM = {
        channel_id: currentChannel.id,
        user_id: currentUser.id,
        id: "",
        content,
        date: Date.now(),
        pending_data: {
            nonce: message.nonce,
            status: UITypes.UserMessageStatus.WAITING_FOR_ACK
        }
    };

    // TODO - check for pending messages leaks when sending/cancelling/erroring.
    currentChannelPendingMessages[message.nonce] = parsedMessage;

    parsedMessage.pending_data!.timeout = setTimeout(() => {
        console.log("Gateway DM message readback timed out!", message.nonce);
        parsedMessage.pending_data!.status = UITypes.UserMessageStatus.ACK_TIMEOUT;
        renderCurrentChannelMessages();
    }, 10000);

    let request: Response | null;

    // Do a specialised attachment message send.
    if (attachments && attachments.length) {
        currentUploadController = new AbortController();

        // Lock input to avoid interruption and enable upload mode.
        inputAllowedStore.set(false);
        fileUploadInProgressStore.set(true);

        const data = new FormData();

        // Append the actual attachments.
        message.attachments = attachments.map(a => ({ name: a.file.name, size_bytes: a.file.size }));
        renderCurrentChannelMessages();
        data.append("", JSON.stringify(message));
        
        // Append the attachments to the form data.
        for (const attachment of attachments) data.append("", attachment.file);

        request = await makeAPIRequest("POST", `/api/dms/${currentChannel.id}/messages`, data, "", currentUploadController);

        // Unlock the inputs and cancel upload.
        inputAllowedStore.set(true);
        fileUploadInProgressStore.set(false);
        currentUploadController = undefined;
    } 
    
    // Do a normal message send.
    else {
        addMessage(parsedMessage);
        renderCurrentChannelMessages();

        request = await makeAPIRequest("POST", `/api/dms/${currentChannel.id}/messages`, message);
    }

    if (!request || !request.ok) {
        parsedMessage.pending_data!.status = UITypes.UserMessageStatus.FAILED;
        renderCurrentChannelMessages();
        console.log("Message sent failed, status", request?.status);
        return;
    }

    const messageConfirm: API.IncomingDM = await request.json();
    parsedMessage.id = messageConfirm.id;
    parsedMessage.date = messageConfirm.date;

    if (attachments && attachments.length) {
        // Attach uploaded attachments to message.
        parsedMessage.attachments = messageConfirm.attachments;

        // Render message with attachments.
        addMessage(parsedMessage);
        renderCurrentChannelMessages();
    }
}