<script lang="ts">
    import { API } from "../../../types/api";
    import { MessageTypeColour, UITypes } from "../../../types/ui";
    import { GENERIC_FILE_PREVIEW_URL, STATIC_PREVIEW_MIME_TYPES } from "../misc/attachments";

    export let bundle: UITypes.MessageBundle;
    export let onPreviewAttachmentClick: ((attachment: API.IncomingAttachment) => void) | null = null;
    export let onContextMenuHandler: ((event: MouseEvent, message: API.IncomingDM) => void);
</script>

<div class="chat-message">
    <img class="chat-message-avatar" alt="message user avatar" src={bundle.user.avatar_url} />
    <div class="chat-message-body">
        <span class="chat-message-user-username">{bundle.user.username}</span>
        <div class="chat-message-container">
            {#each bundle.messages as message}
                {@const genericAttachments = message.attachments?.filter(a => !STATIC_PREVIEW_MIME_TYPES.has(a.mime_type))}

                <div class="chat-message-content" role="row" tabindex="0" on:contextmenu|preventDefault={e => onContextMenuHandler(e, message)}>
                    {#if message.content}
                        <p style="color: {MessageTypeColour[message.pending_data?.status || UITypes.UserMessageStatus.SENT]};">{message.content}</p>
                    {/if}

                    {#each (message.attachments || []) as attachment}
                        {#if STATIC_PREVIEW_MIME_TYPES.has(attachment.mime_type)}
                            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div class="chat-message-body-image-container">
                                {#if onPreviewAttachmentClick}
                                    <img src="{attachment.url}" alt="" loading="lazy" on:click={() => onPreviewAttachmentClick(attachment)} />
                                {:else}
                                    <img src="{attachment.url}" alt="" loading="lazy" />
                                {/if}
                            </div>
                        {/if}
                    {/each}

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
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    span, p {
        font-family: "Roboto", sans-serif;
        color: rgb(235, 235, 235);
    }

    .chat-message {
        margin-right: 10px;
        margin-top: 10px;
        padding: 10px;
        display: flex;
        justify-content: space-between;
    }

    .chat-message:first-child {
        margin-top: 0;
    }

    .chat-message-avatar {
        width: 50px;
        height: 50px;
        border-radius: 100%;
    }

    .chat-message-body {
        resize: none;
        width: 100%;
        
        overflow: hidden;
    }

    .chat-message-user-username {
        margin-left: 20px;
        font-weight: 550;
    }

    .chat-message-content {
        padding-left: 20px;
        width: 100%;
        overflow: hidden;
        overflow-wrap: break-word;
    }

    .chat-message-content:hover {
        border-radius: 7px;
        background-color: rgba(44, 44, 44, 0.356);
    }

    .chat-message-content p {
        color: rgb(207, 206, 206);
        margin-bottom: 7px;
        margin-top: 7px;
    }

    .chat-message-container > .chat-message-content:first-child {
        margin-left: 10px;
        padding-left: 10px;
    }

    .chat-message-container > .chat-message-content:first-child p {
        margin-top: 9px;
    }

    .chat-message-container > .chat-message-content:last-child p {
        margin-bottom: 2px;
    }

    .chat-message-body-image-container img {
        margin-top: 9px;
        max-width: 550px;
        max-height: 800px;
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