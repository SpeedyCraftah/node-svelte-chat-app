const { app } = require("..");
const db = require("../handlers/database");
const { broadcastDMChannelNewMessage } = require("../handlers/gateway/channels");
const { getDMTargetUser } = require("../misc/dms");
const { getSafeUser } = require("../misc/safe-parser");

app.get("/api/dms/:channel_id", {}, (request, response) => {
    const channel = db.dm_channels.fetchByID(request.params["channel_id"]);
    if (!channel) return response.status(404).send();

    // Get the target user of the DM channel.
    const targetUser = getDMTargetUser(channel, request.session.user);
    if (!targetUser) return response.status(401).send();

    return response.status(200).send({ id: channel.id, user: getSafeUser(targetUser) });
});

app.get("/api/dms", {}, async (request, response) => {
    // Get the open DMs the user has and parse into response format.
    const dmChannels = db.dm_channels.fetchBySingleMember(request.session.user.id)
        .map(c => ({ id: c.id, user: getSafeUser(db.users.fetchByID(c.user1_id === request.session.user.id ? c.user2_id : c.user1_id)) }));
    
    return response.status(200).send(dmChannels);
});

app.get("/api/dms/:channel_id/messages", {}, (request, response) => {
    const channel = db.dm_channels.fetchByID(request.params["channel_id"]);
    if (!channel) return response.status(404).send();
    if (request.session.user.id !== channel.user1_id && request.session.user.id !== channel.user2_id) return response.status(401).send();

    const messages = db.messages.fetchAll(channel.id);
    return response.status(200).send(messages);
});

app.post("/api/dms/:channel_id/messages", {
    schema: {
        body: {
            type: "object",
            properties: {
                type: { enum: [1, 2] },
                content: { type: "string", maxLength: 500, minLength: 1 },
                nonce: { type: "number" },
                attachments: { type: "array", items: { 
                    type: "object",
                    properties: {
                        name: { type: "string", minLength: 1 },
                        mimetype: { type: "string", minLength: 1 }
                    },
                    required: ["name", "mimetype"]
                }}
            },
            required: ["type", "content"]
        }
    }
}, async (request, response) => {
    const channel = db.dm_channels.fetchByID(request.params["channel_id"]);
    if (!channel) return response.status(404).send();
    
    const targetUser = getDMTargetUser(channel, request.session.user);
    if (!targetUser) return response.status(401).send();

    // AI specific, remove?
    if (targetUser.type === 2 && targetUser.aiBusy) return response.status(423).send();

    const details = request.body;
    const message = db.messages.create(request.session.user.id, channel.id, details.type, details.content);

    // Send the response.
    response.status(200).send({ id: message.message.id, date: message.message.date });

    // Pass the message on for broadcasting.
    broadcastDMChannelNewMessage(channel, message, details.nonce || 0);
});