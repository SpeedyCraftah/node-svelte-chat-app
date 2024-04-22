const { getDMTargetUser } = require("../../misc/dms");
const { getSafeDMMessage } = require("../../misc/safe-parser");
const db = require("../database");
const { websockets, sendToSocket } = require("./websocket");

// Emits a typing signal to connected clients to the recipients DM channel.
module.exports.emitDMTypingSignal = (channel, user) => {
    const targetUser = getDMTargetUser(channel, user);
    
    if (websockets.has(targetUser.id)) {
        for (const socket of Object.values(websockets.get(targetUser.id))) {
            sendToSocket(socket, {
                op: "TYPING_START",
                data: {
                    channel_id: channel.id,
                    user_id: user.id
                }
            });
        }
    }
};

module.exports.broadcastDMChannelNewMessage = (channel, messageObject, readbackNonce) => {
    const message = messageObject.message;
    const emittingUser = db.users.fetchByID(message.user_id);
    const targetUser = db.users.fetchByID(channel.user1_id === message.user_id ? channel.user2_id : channel.user1_id);

    // Send notification to the target users sockets.
    if (websockets.has(targetUser.id)) {
        for (const socket of Object.values(websockets.get(targetUser.id))) {
            sendToSocket(socket, {
                op: "NEW_DM_MESSAGE",
                data: { ...getSafeDMMessage(message) }
            });
        }
    }

    // Informs the user the message was sent correctly and gateway is working.
    if (websockets.has(emittingUser.id)) {
        for (const socket of Object.values(websockets.get(emittingUser.id))) {
            sendToSocket(socket, {
                op: "NEW_DM_MESSAGE",
                data: { ...getSafeDMMessage(message), nonce: readbackNonce }
            });
        }
    }
};