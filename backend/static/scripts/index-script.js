let navbarDisplay = true;
let currentUser;
let currentChannel;
let session;

const users = {};
const dm_channels = {};

function fullscreenImage(name) {
    const overlay = document.getElementById("image-fullscreen");
    const img = overlay.children[0];
    img.src = name;
    overlay.style.display = "flex";
}

function addMessage(message, colour) {
    let messageContentDiv;

    // Can append if latest message was sent by user already.
    if (currentChannel.latestAuthorID === message.user.id) {
        messageContentDiv = document.getElementById("chat-messages").lastChild.childNodes[1].childNodes[1];
    } else {
        currentChannel.latestAuthorID = message.user.id;

        const messageDiv = document.createElement("div");
        messageDiv.className = "chat-message";

        const avatarImg = document.createElement("img");
        avatarImg.loading = "eager";
        avatarImg.className = "chat-message-avatar";
        avatarImg.src = message.user.avatar_url;
        messageDiv.appendChild(avatarImg);

        const messageBodyDiv = document.createElement("div");
        messageBodyDiv.className = "chat-message-body";

        const usernameSpan = document.createElement("span");
        usernameSpan.innerText = message.user.username;
        messageBodyDiv.appendChild(usernameSpan);

        messageContentDiv = document.createElement("div");
        messageContentDiv.className = "chat-message-content";
        messageBodyDiv.appendChild(messageContentDiv);

        messageBodyDiv.appendChild(messageContentDiv);
        messageDiv.appendChild(messageBodyDiv);

        document.getElementById("chat-messages").appendChild(messageDiv);
    }

    let newMessageElement;

    // Message is normal text.
    if (message.type === 1) {
        const messageP = document.createElement("p");
        if (colour) messageP.style.color = colour;

        newMessageElement = messageP;
        messageP.innerText = message.content;
        messageContentDiv.appendChild(messageP);
    }

    // Message is an image.
    else if (message.type === 2) {
        const imageImg = document.createElement("img");
        newMessageElement = imageImg;
        imageImg.loading = "lazy";
        imageImg.addEventListener("click", function(e) { fullscreenImage(this.src) });
        imageImg.src = message.content;
        messageContentDiv.appendChild(imageImg);
    }

    return newMessageElement;
}

document.getElementById("menu-button").addEventListener("click", () => {
    navbarDisplay = !navbarDisplay;
    document.getElementById("navigation-bar").style.display = navbarDisplay ? "flex" : "none";
});

document.getElementById("image-fullscreen").addEventListener("click", (event) => {
    if (event.target != document.getElementById("image-fullscreen")) return;
    document.getElementById("image-fullscreen").style.display = "none";
});

// Runtime scripts.

function scrollToLatestMessages() {
    setTimeout(() => {
        const messagesDiv = document.getElementById("chat-messages");
        messagesDiv.scrollTo(0, messagesDiv.scrollHeight)
    }, 50);
}

function isScrollMessagesBottom() {
    const messagesDiv = document.getElementById("chat-messages");
    return (messagesDiv.scrollTop + messagesDiv.clientHeight) === messagesDiv.scrollHeight;
}

async function makeAPIRequest(method, path, body) {
    const headers = { "X-Session": session };
    if (typeof body === "object") {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(body);
    }

    const request = await fetch(path, {
        method, headers, body
    }).catch((e) => console.error("Request failed!", e));
    if (!request) return null;

    return request;
}

async function populateOpenDMS() {
    const openDmsDiv = document.getElementById("navbar-open-dms");
    const openDmsEntries = [];

    const request = await makeAPIRequest("GET", "/api/dms");
    if (!request || !request.ok) {
        console.error(request);
        const errorMessage = document.createElement("p");
        errorMessage.innerText("Could not load DM list");
        openDmsEntries.push(errorMessage);
        return;
    }

    const openDms = await request.json();
    for (const entry of openDms) {
        const dmDiv = document.createElement("div");
        dmDiv.className = "navbar-dms-entry";
        dmDiv.setAttribute("c-id", entry.id);

        const avatarImg = document.createElement("img");
        avatarImg.loading = "eager";
        avatarImg.className = "chat-message-avatar";
        avatarImg.src = entry.user.avatar_url;
        
        const usernameSpan = document.createElement("span");
        usernameSpan.innerText = entry.user.username;

        dmDiv.addEventListener("click", function(e) { window.location.replace(`/index.html#id=${this.getAttribute("c-id")}&t=1`) });

        dmDiv.replaceChildren(avatarImg, usernameSpan);
        openDmsEntries.push(dmDiv);
    }

    openDmsDiv.replaceChildren(...openDmsEntries);
}

function setMessageTextColour(messageElement, colour) {
    messageElement.style.color = colour;
}

async function doMessageSend(content, type) {
    // Create message element with gray colour.
    const messageElement = addMessage({
        content, type,
        user: currentUser
    }, "#757575");

    scrollToLatestMessages();

    // Generate random nonce for gateway verification.
    const readbackNonce = Math.floor(Math.random() * 1000000) + 1;
    messageElement.id = `message-pending-${readbackNonce}`;

    // Gateway timeout error message.
    messageElement.gatewayTimeout = setTimeout(() => {
        console.log("Gateway DM message readback timed out!", readbackNonce);
        messageElement.style.color = "rgb(195 131 84)";
    }, 10000);

    if (type === 1) {
        // If channel is DM.
        if (currentChannel.user) {
            const sendRequest = await makeAPIRequest("POST", `/api/dms/${currentChannel.id}/messages`, {
                content,
                type,
                nonce: readbackNonce
            });

            if (!sendRequest || !sendRequest.ok) {
                clearTimeout(messageElement.gatewayTimeout);
                setMessageTextColour(messageElement, "#d56666");
                console.error("Message failed to send!", sendRequest);
                return;
            }

            const message = await sendRequest.json();
            return message;
        }
    }
}

async function initPage() {
    // Set username and avatar.
    document.getElementById("navbar-username").innerText = currentUser.username;
    document.getElementById("navbar-avatar").src = currentUser.avatar_url;

    // Load current page.
    const rawParams = window.location.hash;
    if (rawParams) {
        const params = new URLSearchParams(rawParams.slice(1));
        const channelID = params.get("id");
        const channelType = parseInt(params.get("t"));

        if (channelType === 1) {
            const channelRequest = await makeAPIRequest("GET", `/api/dms/${channelID}`);
            if (!channelRequest || !channelRequest.ok) {
                alert("DM channel does not exist or request was unsuccessful.");
                return;
            }

            const channel = await channelRequest.json();
            dm_channels[channel.id] = channel;
            channel.user.dm_channel = channel;
            users[channel.user.id] = channel.user;
            currentChannel = channel;

            console.log("DM channel:", channel);

            document.getElementById("page-title").innerText = `✉️ ${channel.user.username}`;
            document.getElementById("message-input").placeholder = `Message ${channel.user.first_name}`;

            // Clear existing messages.
            document.getElementById("chat-messages").replaceChildren();

            // Load channels messages.
            const messageLoadRequest = await makeAPIRequest("GET", `/api/dms/${currentChannel.id}/messages`);
            if (!messageLoadRequest || !messageLoadRequest.ok) {
                alert(`Failed to load DM channels messages! Status code ${messageLoadRequest.status} (${messageLoadRequest.statusText})`);
                return;
            } 

            const loadedMessages = await messageLoadRequest.json();
            for (let i = loadedMessages.length - 1; i >= 0; i--) {
                const message = loadedMessages[i];
                addMessage({ id: message.id, content: message.content, type: message.type, user: users[message.user_id] });
            }

            scrollToLatestMessages();

            const messageInputElement = document.getElementById("message-input");

            // Add event listener for typing enter.
            messageInputElement.addEventListener("keypress", function(event) {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();

                    // Send the message.

                    const messageContent = this.value.trim();
                    if (!messageContent) return false;

                    this.value = "";

                    doMessageSend(messageContent, 1);
                    return false;
                }

                return true;
            });

            // Add listener for traditional send button.
            document.getElementById("message-submit").addEventListener("click", function(event) {
                const messageContent = messageInputElement.value.trim();
                if (!messageContent) return false;

                messageInputElement.value = "";
                doMessageSend(messageContent, 1);
            });
        }
    }
}

async function main() {
    session = sessionStorage.getItem("session");
    //if (!session) window.location.replace("/login.html");

    const wss = new WebSocket(`ws://${window.location.hostname}:8081/api/gateway?token=${encodeURIComponent(session)}`);
    wss.addEventListener("open", () => {
        console.log("WS open!");
    });

    wss.addEventListener("close", event => {
        console.log("WS closed! Code", event.code);
        alert("Chat websocket disconnected!");

        if (event.code === 1008) {
            sessionStorage.clear();
            window.location.replace("/login.html");
        }
    });

    wss.addEventListener("error", err => {
        console.error("WS error!", err);
    });

    wss.addEventListener("message", event => {
        const rawData = JSON.parse(event.data);
        const op = rawData.op;
        const data = rawData.data;

        switch (op) {
            case "READY": {
                currentUser = data.user;
                users[currentUser.id] = currentUser;
                console.log("Logged in as user:", data);

                // Populate open DMs.
                populateOpenDMS();

                initPage();
                break;
            }

            case "NEW_DM_MESSAGE": {
                if (currentChannel && currentChannel.id === data.channel_id) {
                    const shouldScroll = isScrollMessagesBottom();

                    addMessage({
                        id: data.id,
                        user: currentChannel.user,
                        type: data.type,
                        content: data.content
                    });

                    if (shouldScroll) scrollToLatestMessages();
                }
                break;
            }

            case "DM_MESSAGE_READBACK": {
                const messageElement = document.getElementById(`message-pending-${data.nonce}`);
                if (!messageElement) {
                    console.log("Received readback for unknown message?", data);
                    break;
                }

                // Cancel gateway timeout.
                if (messageElement.gatewayTimeout) {
                    clearTimeout(messageElement.gatewayTimeout);
                    messageElement.gatewayTimeout = null;
                }

                // Clear the grey colour back to default and set ID.
                messageElement.id = data.id;
                messageElement.style.color = "";
                break;
            }
        }
    });

    window.addEventListener("hashchange", () => {
        initPage();
    });
}

main();