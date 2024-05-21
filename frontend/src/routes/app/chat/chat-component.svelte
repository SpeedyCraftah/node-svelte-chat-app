<script lang="ts">
    import { Writable } from "svelte/store";
    import { MessageTypeColour, UITypes } from "../../../types/ui";
    import { GENERIC_FILE_PREVIEW_URL, STATIC_PREVIEW_MIME_TYPES, readClientImageAsB64 } from "../misc/attachments";
    import { fullscreenImageStore } from "../app-global";
    import { beforeUpdate } from "svelte";
    import { accessibleClickHandler } from "../misc/accessibility";

    // CSS imports.
    import "../../css/font-awesome.css";
    import "../../general/button.css";

    // Attribute exports.
    export let messageInputPlaceholder: string;
    export let typingUsers: Writable<UITypes.UserTyping[]>;
    export let parsedMessages: Writable<UITypes.MessageBundle[]>;
    export let allowInput: Writable<boolean>;
    export let onMessageSubmit: (content: string, attachments?: UITypes.MessageAttachment[]) => void;
    export let onTypingIndicatorTrigger: () => void;
    export let uploadInProgress: Writable<boolean>;
    export let onUploadCancel: () => void;

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
    let shouldScrollOnMessage = false;
    $: $parsedMessages, (() => {
        if (!channelMessagesRef) return;
        if (shouldScrollOnMessage)
            setTimeout(() => channelMessagesRef.scrollTo(0, channelMessagesRef.scrollHeight), 100);
    })();

    // Keep status of scrollbar.
    beforeUpdate(() => {
        if (!channelMessagesRef) return;
        shouldScrollOnMessage = channelMessagesRef.scrollTop > (channelMessagesRef.scrollHeight - channelMessagesRef.offsetHeight);
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
            setTimeout(() => channelMessagesRef.scrollTo(0, channelMessagesRef.scrollHeight), 50);
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
    typingUsers.subscribe((value) => {
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
        {#each $parsedMessages as bundle}
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

<style>

</style>