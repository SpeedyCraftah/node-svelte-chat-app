<script lang="ts">
    import ChatComponent from "../../chat/chat-component.svelte";
    import type { UITypes } from "../../../../types/ui";
    import { cancelCurrentUploadController, currentChannelStore, currentChannelMessagesStore, doDMMessageSend, fileUploadInProgressStore, inputAllowedStore, sendCurrentDMChannelTypingSignal, usersTypingStore, resolveUserByID, fetchDMMessages, unloadDMMessages, viewingUpToDateMessages } from "./script";
    import { API } from "../../../../types/api";

    let parsedMessages: UITypes.MessageBundle[] = [];
    
    $: $currentChannelMessagesStore, (() => {
        let newParsedMessages: UITypes.MessageBundle[] = [];
        let lastUser: API.User | undefined;
        for (let i = $currentChannelMessagesStore.length - 1; i >= 0; i--) {
            const message = $currentChannelMessagesStore[i];
            const parsedMessage = newParsedMessages[newParsedMessages.length - 1];
            if (parsedMessage && message.user_id === lastUser?.id) {
                parsedMessage.messages.push(message);
            } else {
                lastUser = resolveUserByID(message.user_id);
                newParsedMessages.push({
                    messages: [message],
                    user: lastUser
                });
            }
        }

        console.log("Parsed messages", newParsedMessages);
        parsedMessages = newParsedMessages;
    })();

    async function onContentLoadNeeded(direction: number) {
        if (viewingUpToDateMessages && $currentChannelMessagesStore.length < 100) return false;

        const moreContentPresent = await fetchDMMessages(direction);
        console.log("load");
        return moreContentPresent;
    }

    async function onPossibleContentUnload(direction: number) {
        if (viewingUpToDateMessages && $currentChannelMessagesStore.length < 100) return;

        await unloadDMMessages(direction);
        console.log("unload");
    }
</script>

<ChatComponent
    onPossibleContentUnload={onPossibleContentUnload} onContentLoadNeeded={onContentLoadNeeded} messageInputPlaceholder="Message {$currentChannelStore?.user.first_name}" allowInput={inputAllowedStore} typingUsers={usersTypingStore} bind:parsedMessages={parsedMessages} uploadInProgress={fileUploadInProgressStore} onUploadCancel={cancelCurrentUploadController} onTypingIndicatorTrigger={sendCurrentDMChannelTypingSignal} onMessageSubmit={doDMMessageSend}
/>