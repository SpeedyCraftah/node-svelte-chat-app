const { wss } = require("../..");
const { getDMTargetUser, isMemberOfDMChannel } = require("../../misc/dms");
const { getSafeUser } = require("../../misc/safe-parser");
const URL = require("url");
const crypto = require("crypto");
const Util = require("util");
const db = require("../database");
const { emitDMTypingSignal } = require("./channels");
const { websockets, sendToSocket } = require("./websocket");

async function setupConnectionHandlers(ws, session, user) {
    ws.on("close", () => {
        // Delete the connected socket.
        delete websockets.get(user.id)[ws.id];
        console.log("Disconnected! User:", Util.inspect(user, {depth: 0}));
    });
    
    ws.on("error", console.error);
    ws.on("message", (payload) => {
        // Attempt to parse the message.

        try {
            payload = JSON.parse(payload.toString());
        } catch(err) {
            payload = null;
        }

        if (!payload || !payload.op || !payload.data || typeof payload.data !== "object") {
            console.log(ws.id, "Invalid payload!");
            ws.close(1003);
            return;
        }

        const data = payload.data;

        // Handle the received data from client.
        switch (payload.op) {
            case "TYPING_START": {
                if (!data.channel_type || !data.channel_id || typeof data.channel_id !== "string") {
                    console.log("Invalid payload!");
                    ws.close(1003);
                    return;
                }

                // If channel is a DM.
                if (data.channel_type === 1) {
                    const channel = db.dm_channels.fetchByID(data.channel_id);
                    if (!channel || !isMemberOfDMChannel(channel, user)) return;

                    emitDMTypingSignal(channel, user);
                    break;
                }
            }

            default: {
                console.log("Invalid payload!");
                ws.close(1003);
                return;
            }
        }
    });
}

wss.on("connection", (ws, request) => {
    const query = URL.parse(request.url || "", true).query;
    const session = db.sessions.fetchByToken(query.token);

    // Close the connection if session does not exist.
    if (!session) {
        ws.close(1008);
        return;
    }

    const user = db.users.fetchByID(session.user_id);
    ws.id = crypto.randomUUID();

    // Save the connected socket.
    let userWebsockets = websockets.get(user.id);
    if (!userWebsockets) {
        userWebsockets = { [ws.id]: ws };
        websockets.set(user.id, userWebsockets);
    } else userWebsockets[ws.id] = ws;

    console.log("Connection! User:", Util.inspect(user, {depth: 0}));

    // Passed authentication.

    setupConnectionHandlers(ws, session, user);

    // Let the socket know that the connection is ready as well as sending information about the connected user.
    sendToSocket(ws, { op: "READY", data: {
        user: getSafeUser(user)
    }});
});