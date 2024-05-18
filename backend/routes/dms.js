const { app } = require("..");
const db = require("../handlers/database");
const { broadcastDMChannelNewMessage } = require("../handlers/gateway/channels");
const { getDMTargetUser } = require("../misc/dms");
const { getSafeUser, getSafeDMMessage } = require("../misc/safe-parser");
const fs = require("fs");
const util = require("util");
const { pipeline } = require('node:stream');
const { multipartHook } = require("../middleware/multipart");
const pump = util.promisify(pipeline)
const crypto = require("crypto");

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
    return response.status(200).send(messages.map(m => getSafeDMMessage(m)));
});

app.post("/api/dms/:channel_id/messages", {
    schema: {
        consumes: ['multipart/form-data'],
        body: {
            type: "object",
            properties: {
                content: { type: "string", maxLength: 1000 },
                nonce: { type: "number" },
                attachments: {
                    type: "array",
                    maxItems: 5,
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", minLength: 1, maxLength: 255 },
                            size_bytes: { type: "number", maximum: 20971520 } // 20M limit per file.
                        },
                        required: ["name", "size_bytes"]
                    },
                }
            },
            required: ["content"]
        }
    },
    preValidation: multipartHook
}, async (request, response) => {
    const channel = db.dm_channels.fetchByID(request.params["channel_id"]);
    if (!channel) return response.status(404).send();
    
    const targetUser = getDMTargetUser(channel, request.session.user);
    if (!targetUser) return response.status(401).send();

    const data = request.body;
    if (!data.content.length && !data.attachments.length) {
        return response.status(400).send();
    }

    const messageID = crypto.randomUUID();
    let parsedAttachments;

    if (data.attachments && data.attachments.length) {
        if (!request.isMultipart()) return response.status(400).send();

        parsedAttachments = [];

        try {
            for (const attachment of data.attachments) {
                const stream = (await request.incomingParts.next()).value;
                if (!stream) throw new Error("Multipart data does not match described attachments.");

                // If mimetype is too large.
                if (stream.mimetype && stream.mimetype.length > 50) throw new Error("Mimetype for file is too long!");
    
                const id = crypto.randomUUID();
    
                // Read the contents into a file.cd
                const handle = fs.createWriteStream(`./data/dynamic/attachments/${id}`);
                await pump(stream.file, handle);
                if (stream.file.truncated) throw new Error("Multipart data part was too large!");

                await (new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve();
                    }, 1200);
                }));

                // Add the file to the database.
                parsedAttachments.push(db.dynamics.createEntry(id, "attachments", messageID, handle.bytesWritten, stream.mimetype || null, attachment.name));
            }
        } catch(err) {
            console.log("Attachment upload abort", err);

            // Undo all entry additions.
            db.dynamics.deleteEntriesByRID(messageID);

            return response.status(400).send();
        }
    }

    // Create message.
    const message = db.messages.create(request.session.user.id, channel.id, data.content, messageID, data.attachments && data.attachments.length !== 0);
    message.attachments = parsedAttachments;

    // Broadcast the message to connected client (if any).
    broadcastDMChannelNewMessage(channel, message, data.nonce);
    
    response.status(201).send(getSafeDMMessage(message));
});