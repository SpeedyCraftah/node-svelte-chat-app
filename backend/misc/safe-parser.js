// Converts the responses from the database into a format which is safe to send back to users by truncating sensitive fields.

module.exports.getSafeUser = (user) => {
    return { id: user.id, type: user.type, username: user.username, first_name: user.first_name, avatar_url: user.avatar_url };
}

module.exports.getSafeDMMessage = (message) => {
    return { id: message.id, user_id: message.user_id, channel_id: message.channel_id, type: message.type, content: message.content, date: message.date };
}