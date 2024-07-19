<script lang="ts">
    import type { Writable } from "svelte/store";
    import { MessageTypeColour, UITypes } from "../../../types/ui";
    import { GENERIC_FILE_PREVIEW_URL, STATIC_PREVIEW_MIME_TYPES, readClientImageAsB64 } from "../misc/attachments";
    import { fullscreenImageStore, currentUserStore } from "../app-global";
    import { afterUpdate, beforeUpdate, onMount, tick } from "svelte";
    import { accessibleClickHandler } from "../misc/accessibility";

    // CSS imports.
    import "../css/font-awesome.css";
    import "../general/button.css";
    import { afterNavigate, beforeNavigate } from "$app/navigation";
    import MessageBundle from "./message-bundle.svelte";
    import ContextMenu from "../general/context-menu.svelte";
    import { API } from "../../../types/api";

    // Attribute exports.
    export let messageInputPlaceholder: string;
    export let typingUsers: Writable<UITypes.UserTyping[]>;
    export let parsedMessages: UITypes.MessageBundle[];
    export let allowInput: Writable<boolean>;
    export let onMessageSubmit: (content: string, attachments?: UITypes.MessageAttachment[]) => void;
    export let onTypingIndicatorTrigger: () => void;
    export let uploadInProgress: Writable<boolean>;
    export let onUploadCancel: () => void;
    export let onContentLoadNeeded: (direction: number) => Promise<boolean>;
    export let onPossibleContentUnload: (direction: number) => Promise<void>;

    let messageTextContent: string = "";
    let messageAttachments: UITypes.MessageAttachment[] = [];
    let typingSignalTimeout: number | null = null;

    async function handleSendPress() {
        if (!$allowInput) return false;

        const messageContent = messageTextContent.trim();
        if (!messageContent && !messageAttachments.length) return false;

        await onMessageSubmit(messageContent, messageAttachments);

        // Clear typing timeout, if any.
        if (typingSignalTimeout !== null) {
            clearTimeout(typingSignalTimeout);
            typingSignalTimeout = null;
        }

        messageTextContent = "";
        messageAttachments = [];
    }

    function handleInputTyping(event: KeyboardEvent) {
        if (typingSignalTimeout === null) {
            // Send a typing indicator signal.
            onTypingIndicatorTrigger();

            // Set a timeout to not send another one for 9 seconds or until a message is sent.
            typingSignalTimeout = setTimeout(() => {
                typingSignalTimeout = null;
            }, 4000);
        }

        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!$allowInput) return false;

            // Send the message.

            handleSendPress();
            return false;
        }

        return true;
    }

    // Scroll to bottom on new message.
    let channelMessagesRef: HTMLDivElement;
    $: parsedMessages, (async() => {
        if (channelMessagesRef && parsedMessages.length) {
            let shouldScrollOnMessage = (channelMessagesRef.scrollHeight - channelMessagesRef.clientHeight) === channelMessagesRef.scrollTop;
            if (shouldScrollOnMessage) {
                await tick();
                channelMessagesRef.scrollTo(0, channelMessagesRef.scrollHeight);
            }
        }
    })();

    // Scrolls to the bottom on channel changes instead of retaining old scroll.
    afterNavigate(() => {
        if (channelMessagesRef) {
            channelMessagesRef.scrollTo(0, channelMessagesRef.scrollHeight)
        }
    });

    async function handleFileUpload(files: FileList) {
        if (messageAttachments.length + files.length >= 10) {
            return alert("Cannot upload more than 10 attachments in one message!");
        }

        const currentScroll = (channelMessagesRef.scrollTop + channelMessagesRef.clientHeight);
        const shouldScroll = currentScroll === channelMessagesRef.scrollHeight;

        for (const file of files) {
            const attachment: UITypes.MessageAttachment = { file };

            // Show a preview for files which are images.
            if (STATIC_PREVIEW_MIME_TYPES.has(file.type)) {
                attachment.preview_data = await readClientImageAsB64(file);
            }

            messageAttachments.push(attachment);
            messageAttachments = messageAttachments;
        }

        if (shouldScroll) {
            await tick();
            channelMessagesRef.scrollTo(0, channelMessagesRef.scrollHeight);
        }
    }

    function handleFileDrop(event: DragEvent) {
        event.preventDefault();
        if (!$allowInput) return false;

        if (!event.dataTransfer || !event.dataTransfer.files.length) return;
        
        handleFileUpload(event.dataTransfer.files);
    }

    function handleFilePaste(event: ClipboardEvent) {
        if (!event.clipboardData || !event.clipboardData.files.length) return;
        event.preventDefault();

        if (!$allowInput) return false;
        handleFileUpload(event.clipboardData.files);
    }

    let uploadElement: HTMLInputElement;
    async function handleFileManualSubmit() {
        if (!$allowInput) return false;
        if (!uploadElement.files || !uploadElement.files.length) return;

        await handleFileUpload(uploadElement.files);

        // Clear the uploaded element.
        // @ts-ignore
        uploadElement.value = null;
    }

    let typingText: string = "";
    $: typingUsers, (() => {
        if (!$typingUsers.length) typingText = "";
        else {
            if ($typingUsers.length === 1) typingText = `${$typingUsers[0].user.username} is typing...`;
            else typingText = `${$typingUsers.slice(0, -1).join(", ")} and ${$typingUsers[$typingUsers.length - 1].user.username} are typing...`;
        }
    })();

    let lastScrollDirection = 1;
    let maxScrollInDirection = true;
    let ignoreScroll = false;
    async function onMessagesScroll() {
        if (!channelMessagesRef || ignoreScroll) return;
        let maxScroll = channelMessagesRef.scrollHeight - channelMessagesRef.clientHeight;

        // If there is no scrollbar.
        if (!maxScroll) return;

        let lastScroll = channelMessagesRef.scrollTop;
        if (lastScroll <= maxScroll * 0.1) {
            if (maxScrollInDirection && lastScrollDirection === -1) return;
            maxScrollInDirection = false;
            lastScrollDirection = -1;

            ignoreScroll = true;
            maxScrollInDirection = !(await onContentLoadNeeded(-1));
            channelMessagesRef.scrollTo(0, lastScroll + ((channelMessagesRef.scrollHeight - channelMessagesRef.clientHeight) - maxScroll));
            await onPossibleContentUnload(-1);
            ignoreScroll = false;
        }

        else if (lastScroll >= maxScroll - (maxScroll * 0.1)) {
            if (maxScrollInDirection && lastScrollDirection === 1) return;
            maxScrollInDirection = false;
            lastScrollDirection = 1;

            ignoreScroll = true;
            maxScrollInDirection = !(await onContentLoadNeeded(1));
            maxScroll = channelMessagesRef.scrollHeight - channelMessagesRef.clientHeight;
            await onPossibleContentUnload(1);
            channelMessagesRef.scrollTo(0, lastScroll + ((channelMessagesRef.scrollHeight - channelMessagesRef.clientHeight) - maxScroll));
            ignoreScroll = false;
        }
    }

    let contextMessageHook: MouseEvent;
    let contextMessage: API.IncomingDM;
</script>

<div class="chat-container">
    <div id="chat-messages" class="chat-messages" bind:this={channelMessagesRef} on:scrollend={onMessagesScroll} on:wheel={onMessagesScroll}>
        {#each parsedMessages as bundle}
            <MessageBundle bundle={bundle} onPreviewAttachmentClick={(attachment) => $fullscreenImageStore = { active: true, src: attachment.url }} onContextMenuHandler={(e, message) => { contextMessage = message; contextMessageHook = e}} />
        {/each}
    </div>

    <div class="chat-input" on:drop={handleFileDrop} on:dragover={(e) => e.preventDefault()} role="none">
        <span class="chat-typing-indicator" style="visibility: {typingText ? "visible" : "hidden"};">{typingText || "A"}</span>

        <div style="width: 100%; display: flex; justify-content: space-around;">
            <textarea id="message-input" disabled={!$allowInput} on:paste={handleFilePaste} bind:value={messageTextContent} placeholder={messageInputPlaceholder} maxlength="500" on:keypress={handleInputTyping}></textarea>
            <div class="chat-input-actions"  >
                <i class="fa fa-upload" style:cursor={$allowInput ? "" : "not-allowed"} style:color={$allowInput ? "" : "rgb(81 81 81)"} on:click={() => $allowInput && uploadElement.click()} on:keypress={accessibleClickHandler} tabindex=0 role="button"></i>
                <i class="fa fa-paper-plane" style:cursor={$allowInput ? "" : "not-allowed"} style:color={$allowInput ? "" : "rgb(81 81 81)"} on:click={handleSendPress} on:keypress={accessibleClickHandler} tabindex=0 role="button"></i>
            </div>

            <!-- Hidden upload element for icon. -->
            <input style="display: none;" type="file" multiple on:change={handleFileManualSubmit} bind:this={uploadElement} />
        </div>

        <div class="chat-input-attachments-parent" style:display={messageAttachments.length ? "" : "none"}>
            <div class="chat-input-attachments-overlay" style:display={$uploadInProgress ? "" : "none"}>
                <h2>Upload In Progress</h2>
                <button on:click={() => onUploadCancel()}>💾 Cancel Upload</button>
            </div>
            <div class="chat-input-attachments" style:pointer-events={$allowInput ? "" : "none"} style:filter={$uploadInProgress ? "blur(2px) grayscale(80%)" : ""}>
                {#each messageAttachments as attachment, i}
                    <div class="chat-input-attachments-container" title={attachment.file.name}>
                        <button class="general-button" disabled={!$allowInput} on:click={() => { messageAttachments.splice(i, 1); messageAttachments = messageAttachments } }>🗑️</button>
                        <img alt="preview" width="100" height="100" src={attachment.preview_data || "/logos/file-generic.png"} />
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<ContextMenu bind:triggerEventHook={contextMessageHook} customClass={"message-context-style"}>
    {#if contextMessage.user_id === $currentUserStore.id}
        <div class="delete-button" role="button" tabindex="0" on:keypress={accessibleClickHandler}>
            <span><i class="fa fa-trash" aria-hidden="true"></i> Delete Message</span>
        </div>
    {/if}

    <hr />

    <div role="button" tabindex="0" on:click={() => navigator.clipboard.writeText(contextMessage.id)} on:keypress={accessibleClickHandler}>
        <span><i class="fa fa-code" aria-hidden="true"></i> Copy Message ID</span>
    </div>
</ContextMenu>

<style>
    :global(.message-context-style) .delete-button {
        background-color: #eb0c0c94;
    }

    :global(.message-context-style) .delete-button i {
        margin-left: 2px;
        margin-right: 11px;
    }

    :global(.message-context-style) .delete-button:hover {
        background-color: rgb(175, 35, 35)
    }

    span {
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
        position: relative;
    }

    .chat-typing-indicator {
        visibility: hidden;
        font-style: italic;
        margin: 0;
        margin-left: 16px;
        font-size: 13px;
        color: gray;
        animation: typing-pulse 3s infinite;
    }

    @keyframes typing-pulse {
        0%, 100% {
            color: #A9A9A9;
        }
        50% {
            color: #D3D3D3;
        }
    }

    .chat-input-actions {
        display: flex;
        align-items: center;
        flex-direction: row;
        gap: 10px;
        margin-left: 8px;
    }

    .chat-input-actions i {
        padding: 4px;
        font-size: 36px;
        border: solid;
        color: rgb(218, 218, 218);
        border-width: 1px;
        border-radius: 5px;
    }

    .chat-input-actions i:hover {
        cursor: pointer;
        color: rgb(252, 252, 252);
    }

    .chat-input-attachments {
        display: flex;
        gap: 10px;
        flex-direction: row;
        justify-content: flex-start;
        margin-top: 8px;
        background-color: #141414;
        padding: 10px;
        border-radius: 12px;
        border-color: #333538;
        border-style: solid;
        border-width: 1px;
        overflow-x: auto;
        position: relative;
    }

    .chat-input-attachments-parent {
        overflow:hidden;
        position: relative;
    }

    .chat-input-attachments-overlay {
        background-color: rgba(31, 31, 31, 0.918);
        position: absolute;
        margin: 0 auto;
        z-index: 2;
        padding: 10px;
        top: 50%;
        right: 20px;
        transform: translate(0, -50%);
        border-radius: 6px;
    }

    .chat-input-attachments-overlay button {
        margin: 0;
        padding: 7px;
        color: white;
        width: 100%;
        background-color: rgba(245, 45, 45, 0.808);
        border: none;
        text-wrap:nowrap;
    }

    .chat-input-attachments-overlay button:hover {
        cursor: pointer;
        background-color: rgba(196, 37, 37, 0.808);
    }

    .chat-input-attachments-overlay h2 {
        margin: 0;
        margin-bottom: 8px;
        font-family: "Roboto", sans-serif;
        color: rgb(218, 218, 218);
        font-size: 20px;
        text-wrap: nowrap;
    }

    .chat-input-attachments::-webkit-scrollbar {
        height: 10px;
    }

    .chat-input-attachments img {
        border: solid;
        border-width: 0px;
        border-radius: 15px;
    }

    .chat-input-attachments-container {
        display: flex;
        justify-content: flex-end;
    }

    .chat-input-attachments-container button {
        position: absolute;
        margin-top: 5px;
        margin-right: 8px;
        padding: 6px;
        background-color: rgba(207, 2, 2, 0.74);
    }
    
    .chat-input-attachments-container button:hover {
        cursor: pointer;
        background-color: rgba(199, 2, 2, 0.829);
    }

    .chat-input textarea {
        font-family: "Roboto", sans-serif;

        margin-top: 6px;
        resize: none;
        border: solid;
        border-color: #333538;
        border-radius: 7px;
        border-width: 1px;
        height: 35px;

        outline: none;
        color: rgb(202, 202, 202);
        background-color: #141414;
        font-size: 17px;
        padding: 8px;
        width: 100%;
    }
</style>