<script lang="ts">
    import { fullscreenImageStore } from "../../app-global";
    import { currentChannelParsedMessagesStore, currentChannelStore, doDMMessageSend, usersTypingStore } from "./script";
    import { API } from "../../../../types/api";
    import { MessageTypeColour, UITypes } from "../../../../types/ui";
    import { accessibleClickHandler } from "../../misc/accessibility";

    let messageTextContent: string = "";

    function handleInputTyping(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            // Send the message.

            const messageContent = messageTextContent.trim();
            if (!messageContent) return false;

            messageTextContent= "";

            doDMMessageSend(messageContent, API.MessageType.TEXT);
            return false;
        }

        return true;
    }

    function handleSendPress() {
        const messageContent = messageTextContent.trim();
        if (!messageContent) return false;

        messageTextContent= "";

        doDMMessageSend(messageContent, API.MessageType.TEXT);
    }

    // Scroll to bottom on new message.
    let channelMessagesRef: HTMLDivElement;
    $: $currentChannelParsedMessagesStore, (() => {
        if (!channelMessagesRef) return;
        if ((channelMessagesRef.scrollTop + channelMessagesRef.clientHeight) === channelMessagesRef.scrollHeight)
            setTimeout(() => channelMessagesRef.scrollTo(0, channelMessagesRef.scrollHeight), 100);
    })();

    let typingText: string = "";
    usersTypingStore.subscribe((value) => {
        const typingUsers = value;
        if (!typingUsers.length) typingText = "";
        else {
            if (typingUsers.length === 1) typingText = `${typingUsers[0].user.username} is typing...`;
            else typingText = `${typingUsers.slice(0, -1).join(", ")} and ${typingUsers[typingUsers.length - 1].user.username} are typing...`;
        }
    });
</script>

<div class="chat-container">
    <div id="chat-messages" class="chat-messages" bind:this={channelMessagesRef}>
        {#each $currentChannelParsedMessagesStore as bundle}
            <div class="chat-message">
                <img class="chat-message-avatar" alt="message user avatar" src={bundle.user.avatar_url} />
                <div class="chat-message-body">
                    <span>{bundle.user.username}</span>
                    <div class="chat-message-content">
                        {#each bundle.messages as message}
                            {#if message.type === 1}
                                <p style="color: {MessageTypeColour[message.pending_data?.status || UITypes.UserMessageStatus.SENT]};">{message.content}</p>
                            {:else if message.type === 2}
                                <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <img src="{message.content}" alt="" loading="lazy" on:click={() => $fullscreenImageStore = { active: true, src: message.content }}/>
                            {/if}
                        {/each}
                    </div>
                </div>
            </div>
        {/each}
    </div>

    <div class="chat-input">
        <span style="visibility: {typingText ? "visible" : "hidden"};">{typingText || "A"}</span>

        <div style="width: 100%; display: flex; justify-content: space-around;">
            <textarea id="message-input" bind:value={messageTextContent} placeholder="Message {$currentChannelStore ? $currentChannelStore.user.first_name : "content"}" maxlength="500" on:keypress={handleInputTyping}></textarea>
            <i style="display: none;"id="message-submit" class="gg-arrow-right-r" on:click={handleSendPress} on:keypress={accessibleClickHandler} tabindex=0 role="button"></i>
        </div>
    </div>
</div>

<style>
    @import url('/static/icons/arrow-right-r.css');
    
    p, span {
        font-family: "Roboto", sans-serif;
        color: rgb(235, 235, 235);
    }

    .chat-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .chat-messages {
        padding: 10px;
        height: 100%;
        
        background-color: #1c1c1f;
        border: solid;
        border-color: #1c1c1f;
        border-radius: 12px;
        overflow-y: scroll;
        overflow-x: auto;
    }

    ::-webkit-scrollbar {
        width: 12px; /* Width of the scrollbar */
    }

    ::-webkit-scrollbar-track {
        background: #292828; /* Color of the track */
        border-radius: 17px;
        margin-top: 3px;
        margin-bottom: 3px;
    }

    ::-webkit-scrollbar-thumb {
        background: #535252; /* Color of the scroll thumb */
        border-radius: 5px;
    }

    .chat-input {
        margin-top: 5px;
        padding: 8px;
        padding-top: 3px;
        display: flex;
        flex-direction: column;
        background-color: #1c1c1f;
        border: solid;
        border-color: #1c1c1f;
        border-radius: 12px;
    }

    .chat-input span {
        visibility: hidden;
        font-style: italic;
        margin: 0;
        margin-left: 16px;
        font-size: 13px;
        color: gray;
    }

    .chat-input button {
        font-family: "Roboto", sans-serif;
        font-size: 16px;
        margin-left: 20px;
        background-color: #2b292b;
        border: solid;
        border-color: #1c1c1f;
        border-radius: 5px;
        height: 90%;
    }

    .chat-input i {
        --ggs: 1.7;
        margin-left: 15px;
        margin-right: 4px;
        color: rgb(219, 219, 219);
        transition: transform 0.05s ease;
    }

    .chat-input i:active {
        transform: scale(1.5);
    }

    @media (hover: hover) {
        .chat-input i:hover {
            color: rgb(248, 248, 248);
            --ggs: 1.8;
        }
    }

    .chat-input textarea {
        font-family: "Roboto", sans-serif;

        margin-top: 6px;
        resize: none;
        border: solid;
        border-color: #333538;
        border-radius: 7px;
        border-width: 1px;
        height: 62%;

        outline: none;
        color: rgb(202, 202, 202);
        background-color: #141414;
        font-size: 17px;
        padding: 8px;
        width: 100%;
    }

    .chat-message {
        margin-top: 10px;
        padding: 10px;
        display: flex;
        justify-content: space-between;
    }

    .chat-message:first-child {
        margin-top: 0;
    }

    .chat-message:hover {
        border-radius: 10px;
        background-color: rgb(36, 36, 36)
    }

    .chat-message-avatar {
        width: 50px;
        height: 50px;
        border-radius: 100%;
    }

    .chat-message-body {
        resize: none;
        width: 100%;
        margin-left: 20px;
        overflow: hidden;
    }

    .chat-message-body span {
        font-weight: 500;
    }

    .chat-message-content {
        width: 100%;
        overflow: hidden;
        overflow-wrap: break-word;
    }

    .chat-message-content p {
        color: rgb(207, 206, 206);
        margin-bottom: 5px;
        margin-top: 10px;
    }

    .chat-message-content p:first-child {
        margin-top: 9px;
    }

    .chat-message-content p:last-child {
        margin-bottom: 0;
    }

    .chat-message-content img {
        margin-top: 9px;
        max-width: 70%;
        object-fit: cover;
    }

    @media only screen and (min-width: 1224px) {
        .chat-message-content img {
            max-width: 800px;
        }
    }
</style>