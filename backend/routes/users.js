const { app } = require("..");
const db = require("../handlers/database");
const { getSafeUser } = require("../misc/safe-parser");

app.post("/api/users/:user_id/dms/create", {}, (request, response) => {
    const targetUser = db.users.fetchByID(request.params["user_id"]);

    // If target user does not exist or is the same as the logged in user.
    if (!targetUser) return response.status(404).send();
    if (user_id === request.session.user.id) return response.status(400).send();

    let dmChannel = db.dm_channels.fetchByMembers(request.session.user.id, user_id);
    if (!dmChannel) {
        dmChannel = db.dm_channels.create(request.session.user.id, user_id);
    }

    return response.status(200).send({ id: dmChannel.id, user: getSafeUser(targetUser) });
});

app.get("/api/users/:user_id", {}, (request, response) => {
    const targetUser = db.users.fetchByID(request.params["user_id"]);
    if (!targetUser) return response.status(404).send();

    return response.status(200).send(getSafeUser(targetUser));
});