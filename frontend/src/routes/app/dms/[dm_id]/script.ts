import { Writable, writable } from "svelte/store";
import { API } from "../../../../types/api";
import { UITypes } from "../../../../types/ui";
import { PageType,  pageNameStore } from "../../app-global";
import { currentUser, hookAppWS, makeAPIRequest, users} from "../../app-global-script";

export let currentChannelStore: Writable<API.GenericChannel | null> = writable();
export let currentChannelParsedMessagesStore: Writable<UITypes.DMBundle[]> = writable([]);
export let usersTypingStore: Writable<UITypes.UserTyping[]> = writable([]);

let usersTyping: {[key: string]: UITypes.UserTyping} = {};
let currentChannel: API.DMChannel;
let currentChannelParsedMessages: UITypes.DMBundle[] = [];
let currentChannelPendingMessages: {[key: number]: API.IncomingDM} = {};

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
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        addMessage(message);
    }

    renderCurrentChannelMessages();
    console.log("Messages", currentChannelParsedMessages);
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

export async function doDMMessageSend(content: string, type: API.MessageType) {
    const message: API.OutgoingDM = { content, type, nonce: Math.floor(Math.random() * 1000000) + 1 };
    const parsedMessage: API.IncomingDM = {
        channel_id: currentChannel.id,
        user_id: currentUser.id,
        id: "",
        content,
        type: API.MessageType.TEXT,
        date: Date.now(),
        pending_data: {
            nonce: message.nonce,
            status: UITypes.UserMessageStatus.WAITING_FOR_ACK
        }
    };

    currentChannelPendingMessages[message.nonce] = parsedMessage;
    addMessage(parsedMessage);
    renderCurrentChannelMessages();

    parsedMessage.pending_data!.timeout = setTimeout(() => {
        console.log("Gateway DM message readback timed out!", message.nonce);
        parsedMessage.pending_data!.status = UITypes.UserMessageStatus.ACK_TIMEOUT;
        renderCurrentChannelMessages();
    }, 10000);

    const request = await makeAPIRequest("POST", `/api/dms/${currentChannel.id}/messages`, message);
    if (!request || !request.ok) {
        parsedMessage.pending_data!.status = UITypes.UserMessageStatus.FAILED;
        renderCurrentChannelMessages();
        console.log("Message sent failed, status", request?.status);
        return;
    }

    const messageConfirm: API.OutgoingDMResponse = await request.json();
    parsedMessage.id = messageConfirm.id;
    parsedMessage.date = messageConfirm.date;
}