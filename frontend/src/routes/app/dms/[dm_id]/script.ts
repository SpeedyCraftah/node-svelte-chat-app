import { Writable, writable } from "svelte/store";
import { API } from "../../../../types/api";
import { UITypes } from "../../../../types/ui";
import { PageType,  pageNameStore } from "../../app-global";
import { currentUser, hookAppWS, makeAPIRequest, sendTypingSignal, users} from "../../app-global-script";

export let currentChannelMessagesStore: Writable<API.IncomingDM[]> = writable([]);
export let currentChannelStore: Writable<API.GenericChannel | null> = writable();
export let usersTypingStore: Writable<UITypes.UserTyping[]> = writable([]);
export let inputAllowedStore: Writable<boolean> = writable(true);
export let fileUploadInProgressStore: Writable<boolean> = writable(false);

let usersTyping: {[key: string]: UITypes.UserTyping} = {};
let currentChannel: API.DMChannel;
let currentChannelMessages: API.IncomingDM[] = [];
let currentChannelPendingMessages: {[key: number]: API.IncomingDM} = {};
let currentUploadController: AbortController | undefined;
export let viewingUpToDateMessages = true;

function renderCurrentChannelMessages() {
    currentChannelMessagesStore.set(currentChannelMessages);
}

function renderCurrentTyping() {
    usersTypingStore.set(Object.values(usersTyping));
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

                // Add the message here.
                if (viewingUpToDateMessages) {
                    currentChannelMessages.unshift(event.data);
                    renderCurrentChannelMessages();
                }

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

const DM_FETCH_SIZE = 50;
export async function fetchDMMessages(direction: number) {
    const pivotMessage = currentChannelMessages[direction === -1 ? currentChannelMessages.length - 1 : 0];
    const request = await makeAPIRequest("POST", `/api/dms/${currentChannel.id}/messages/fetch`, {
        limit: DM_FETCH_SIZE,
        pivot: {
            date: pivotMessage.date,
            direction
        }
    });

    if (!request || !request.ok) {
        alert("Could not fetch latest messages!");
        return true;
    }

    const newMessages: API.IncomingDM[] = await request.json();
    console.log("Response", newMessages);

    if (direction === 1 && newMessages.length !== DM_FETCH_SIZE) {
        viewingUpToDateMessages = true;
    }

    if (!newMessages.length) {
        return false;
    }

    if (direction === -1) {
        currentChannelMessages = [...currentChannelMessages, ...newMessages];
    } else {
        currentChannelMessages = [...newMessages, ...currentChannelMessages];
    }

    renderCurrentChannelMessages();

    return newMessages.length === DM_FETCH_SIZE;
}

export async function unloadDMMessages(direction: number) {
    if (currentChannelMessages.length > 200) {
        if (direction === -1) viewingUpToDateMessages = false;
        currentChannelMessages = [...(direction === -1 ? currentChannelMessages.slice(DM_FETCH_SIZE) : currentChannelMessages.slice(0, -DM_FETCH_SIZE))];
        renderCurrentChannelMessages();
    }
}

async function fetchLatestDMMessages() {
    const request = await makeAPIRequest("POST", `/api/dms/${currentChannel.id}/messages/fetch`, { limit: 100 });
    if (!request || !request.ok) {
        alert("Could not fetch latest messages!");
        return;
    }

    const messages: API.IncomingDM[] = await request.json();
    currentChannelMessages = messages;
    console.log("Messages", messages);

    viewingUpToDateMessages = true;
    renderCurrentChannelMessages();
}

export function resolveUserByID(user_id: string): API.User {
    return users[user_id];
}

export async function initDMPage(channel_id: string) {
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

export function sendCurrentDMChannelTypingSignal() {
    sendTypingSignal(API.ChannelType.DM, currentChannel.id);
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
        currentChannelMessages.unshift(parsedMessage);
        renderCurrentChannelMessages();

        request = await makeAPIRequest("POST", `/api/dms/${currentChannel.id}/messages`, message);
    }

    // Potentially unload messages if context is too long.
    if (viewingUpToDateMessages) unloadDMMessages(1);

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
        currentChannelMessages.unshift(parsedMessage);
        renderCurrentChannelMessages();
    }
}