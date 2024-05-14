// Converts the responses from the database into a format which is safe to send back to users by truncating sensitive fields.

const { getResourceURL } = require("./urls");

module.exports.getSafeUser = (user) => {
    return { id: user.id, type: user.type, username: user.username, first_name: user.first_name, avatar_url: user.avatar_url };
}

module.exports.getSafeDMMessage = (message) => {
    const parsedMessage = { id: message.id, user_id: message.user_id, channel_id: message.channel_id, type: message.type, content: message.content, date: message.date };
    if (message.has_attachments) {
        // Parse all message attachments into a friendly format and attach to message.
        parsedMessage.attachments = message.attachments.map(attachment => {
            return { id: attachment.id, size_bytes: attachment.size_bytes, name: attachment.name, mime_type: attachment.mime_type, url: getResourceURL(attachment) };
        });
    }

    return parsedMessage;
}