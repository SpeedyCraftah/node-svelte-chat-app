<script lang="ts">
    import ChatComponent from "../../chat/chat-component.svelte";
    import { cancelCurrentUploadController, currentChannelParsedMessagesStore, currentChannelStore, doDMMessageSend, fileUploadInProgressStore, inputAllowedStore, sendCurrentDMChannelTypingSignal, usersTypingStore } from "./script";
</script>

<ChatComponent
    messageInputPlaceholder="Message {$currentChannelStore?.user.first_name}" allowInput={inputAllowedStore} typingUsers={usersTypingStore} parsedMessages={currentChannelParsedMessagesStore} uploadInProgress={fileUploadInProgressStore} onUploadCancel={cancelCurrentUploadController} onTypingIndicatorTrigger={sendCurrentDMChannelTypingSignal} onMessageSubmit={doDMMessageSend}
/>