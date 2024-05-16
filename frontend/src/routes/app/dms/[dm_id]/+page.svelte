<script lang="ts">
    import { fullscreenImageStore } from "../../app-global";
    import { currentChannelParsedMessagesStore, sendCurrentDMChannelTypingSignal, currentChannelStore, doDMMessageSend, fileUploadInProgressStore, inputAllowedStore, usersTypingStore, cancelCurrentUploadController } from "./script";
    import { API } from "../../../../types/api";
    import { MessageTypeColour, UITypes } from "../../../../types/ui";
    import { accessibleClickHandler } from "../../misc/accessibility";
    import { readClientImageAsB64, STATIC_PREVIEW_MIME_TYPES, GENERIC_FILE_PREVIEW_URL } from "../../misc/attachments";

    // Import CSS.
    import "../../css/font-awesome.css";

    let messageTextContent: string = "";
    let messageAttachments: UITypes.MessageAttachment[] = [];
    let typingSignalTimeout: number | null = null;

    async function handleSendPress() {
        if (!$inputAllowedStore) return false;

        const messageContent = messageTextContent.trim();
        if (!messageContent && !messageAttachments.length) return false;

        // Don't wait for message send to complete if sending just text.     
        if (messageAttachments.length) await doDMMessageSend(messageContent, messageAttachments);
        else doDMMessageSend(messageContent);

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
            sendCurrentDMChannelTypingSignal();

            // Set a timeout to not send another one for 9 seconds or until a message is sent.
            typingSignalTimeout = setTimeout(() => {
                typingSignalTimeout = null;
            }, 4000);
        }

        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!$inputAllowedStore) return false;

            // Send the message.

            handleSendPress();
            return false;
        }

        return true;
    }

    // Scroll to bottom on new message.
    let channelMessagesRef: HTMLDivElement;
    $: $currentChannelParsedMessagesStore, (() => {
        if (!channelMessagesRef) return;
        if ((channelMessagesRef.scrollTop + channelMessagesRef.clientHeight) === channelMessagesRef.scrollHeight)
            setTimeout(() => channelMessagesRef.scrollTo(0, channelMessagesRef.scrollHeight), 100);
    })();

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
            setTimeout(() => channelMessagesRef.scrollTo(0, channelMessagesRef.scrollHeight), 50);
        }
    }

    function handleFileDrop(event: DragEvent) {
        event.preventDefault();
        if (!$inputAllowedStore) return false;

        if (!event.dataTransfer || !event.dataTransfer.files.length) return;
        
        handleFileUpload(event.dataTransfer.files);
    }

    function handleFilePaste(event: ClipboardEvent) {
        if (!event.clipboardData || !event.clipboardData.files.length) return;
        event.preventDefault();

        if (!$inputAllowedStore) return false;
        handleFileUpload(event.clipboardData.files);
    }

    let uploadElement: HTMLInputElement;
    async function handleFileManualSubmit() {
        if (!$inputAllowedStore) return false;
        if (!uploadElement.files || !uploadElement.files.length) return;

        await handleFileUpload(uploadElement.files);

        // Clear the uploaded element.
        // @ts-ignore
        uploadElement.value = null;
    }

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
                    <span class="chat-message-user-username">{bundle.user.username}</span>
                    <div class="chat-message-content">
                        {#each bundle.messages as message}
                            {#if message.content}
                                <p style="color: {MessageTypeColour[message.pending_data?.status || UITypes.UserMessageStatus.SENT]};">{message.content}</p>
                            {/if}

                            {#each (message.attachments || []) as attachment}
                                {#if STATIC_PREVIEW_MIME_TYPES.has(attachment.mime_type)}
                                    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <div class="chat-message-body-image-container">
                                        <img src="{attachment.url}" alt="" loading="lazy" on:click={() => $fullscreenImageStore = { active: true, src: attachment.url }} />
                                    </div>
                                {/if}
                            {/each}

                            {@const genericAttachments = message.attachments?.filter(a => !STATIC_PREVIEW_MIME_TYPES.has(a.mime_type))}
                            {#if genericAttachments && genericAttachments.length}
                                <div class="chat-message-generic-attachments">
                                    {#each genericAttachments as attachment}
                                        <div class="chat-message-generic-attachments-container">
                                            <a href={attachment.url} download>
                                                <i class="fa fa-download" ></i>
                                            </a>
                                            
                                            <img title={attachment.name} src={GENERIC_FILE_PREVIEW_URL} alt="generic attachment" />
                                            <div class="chat-message-generic-attachments-container-text-container">
                                                <span title={attachment.name}>{attachment.name}</span>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        {/each}
                    </div>
                </div>
            </div>
        {/each}
    </div>

    <div class="chat-input" on:drop={handleFileDrop} on:dragover={(e) => e.preventDefault()} role="none">
        <span style="visibility: {typingText ? "visible" : "hidden"};">{typingText || "A"}</span>

        <div style="width: 100%; display: flex; justify-content: space-around;">
            <textarea id="message-input" disabled={!$inputAllowedStore} on:paste={handleFilePaste} bind:value={messageTextContent} placeholder="Message {$currentChannelStore ? $currentChannelStore.user.first_name : "content"}" maxlength="500" on:keypress={handleInputTyping}></textarea>
            <div class="chat-input-actions"  >
                <i class="fa fa-upload" style:cursor={$inputAllowedStore ? "" : "not-allowed"} style:color={$inputAllowedStore ? "" : "rgb(81 81 81)"} on:click={() => $inputAllowedStore && uploadElement.click()} on:keypress={accessibleClickHandler} tabindex=0 role="button"></i>
                <i class="fa fa-paper-plane" style:cursor={$inputAllowedStore ? "" : "not-allowed"} style:color={$inputAllowedStore ? "" : "rgb(81 81 81)"} on:click={handleSendPress} on:keypress={accessibleClickHandler} tabindex=0 role="button"></i>
            </div>

            <!-- Hidden upload element for icon. -->
            <input style="display: none;" type="file" multiple on:change={handleFileManualSubmit} bind:this={uploadElement} />
        </div>

        <div class="chat-input-attachments-parent" style:display={messageAttachments.length ? "" : "none"}>
            <div class="chat-input-attachments-overlay" style:display={$fileUploadInProgressStore ? "" : "none"}>
                <h2>Upload In Progress</h2>
                <button on:click={() => cancelCurrentUploadController()}>💾 Cancel Upload</button>
            </div>
            <div class="chat-input-attachments" style:pointer-events={$inputAllowedStore ? "" : "none"} style:filter={$fileUploadInProgressStore ? "blur(2px) grayscale(80%)" : ""}>
                {#each messageAttachments as attachment, i}
                    <div class="chat-input-attachments-container" title={attachment.file.name}>
                        <button disabled={!$inputAllowedStore} on:click={() => { messageAttachments.splice(i, 1); messageAttachments = messageAttachments } }>🗑️</button>
                        <img alt="preview" width="100" height="100" src={attachment.preview_data || "/logos/file-generic.png"} />
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
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
        position: relative;
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
        margin: 0;
        margin-top: 5px;
        margin-right: 8px;
        position: absolute;
        width: 35px;
        height: 30px;
        color: white;
        background-color: rgba(172, 2, 2, 0.726);
        border: none;
    }
    
    .chat-input-attachments-container button:hover {
        cursor: pointer;
        background-color: rgba(172, 2, 2, 0.945);
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

    .chat-message-user-username {
        font-weight: 550;
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

    .chat-message-body-image-container img {
        margin-top: 9px;
        max-width: 550px;
        width: 83%;
        object-fit: cover;
    }

    .chat-message-generic-attachments {
        margin-top: 5px;
        display: flex;
        flex-direction: row;
        gap: 8px;
        border-radius: 10px;
        background-color: rgb(48, 48, 48);
        padding: 6px;
        max-width: fit-content;
        overflow-x: auto;
    }

    .chat-message-generic-attachments-container {
        position: relative;
        display: flex;
        flex-direction: column;
    }

    .chat-message-generic-attachments-container img {
        width: 85px;
    }

    .chat-message-generic-attachments-container i {
        position: absolute;
        color: rgb(0, 255, 64);
        right: 7px;
        font-size: 25px;
        background-color: rgba(37, 37, 37, 0.678);
        padding: 3px;
        border-radius: 5px;
    }

    .chat-message-generic-attachments-container-text-container {
        margin-top: 5px;
        max-width: 90px;
        text-wrap: nowrap;
        overflow-x: hidden;
        text-align: center;
    }

    .chat-message-generic-attachments-container-text-container span {
        color: rgb(179, 179, 179);
        font-size: 15px;
    }
</style>