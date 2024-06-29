const { app } = require("..");
const db = require("../handlers/database");
const { TargetUserHook } = require("../middleware/contextual");
const { getDMVisibilityOfUser } = require("../misc/dms");
const { getSafeUser } = require("../misc/safe-parser");

app.post("/api/users/:user_id/dms/create", { onRequest: TargetUserHook }, (request, response) => {
    const targetUser = request.targetUser;

    // If target user does not exist or is the same as the logged in user.
    if (targetUser.id === request.session.user.id) return response.status(400).send();

    let dmChannel = db.dm_channels.fetchByMembers(request.session.user.id, targetUser.id);
    if (!dmChannel) {
        dmChannel = db.dm_channels.create(request.session.user.id, targetUser.id, true, false);
    }
    
    else {
        if (!getDMVisibilityOfUser(dmChannel, request.session.user)) {
            db.dm_channels.updateVisibilityByID(dmChannel.id, dmChannel.user1_id === request.session.user.id ? true : dmChannel.user1_visible, dmChannel.user2_id === request.session.user.id ? true : dmChannel.user2_visible);
        }
    }

    return response.status(200).send({ id: dmChannel.id, user: getSafeUser(targetUser) });
});

app.get("/api/users/:user_id", { onRequest: TargetUserHook }, (request, response) => {
    const targetUser = db.users.fetchByID(request.params["user_id"]);
    if (!targetUser) return response.status(404).send();

    return response.status(200).send(getSafeUser(targetUser));
});

app.post("/api/users/search", {
    schema: {
        body: {
            type: "object",
            properties: {
                limit: { type: "number", maximum: 20, minimum: 1 },
                username: { type: "string", maxLength: 30, minLength: 2 }
            },
            required: []
        }
    },
}, (request, response) => {
    const limit = request.body.limit || 20;
    if (request.body.username) {
        const username = request.body.username;
        const result = db.users.searchMultipleByUsername(username, limit, request.session.user.id).map(u => getSafeUser(u));
        return response.status(200).send(result);
    } 
    
    else {
        // Get LIMIT random users to show with no filter.
        const result = db.users.searchMultipleByUsername("", limit, request.session.user.id).map(u => getSafeUser(u));
        return response.status(200).send(result);
    }
});