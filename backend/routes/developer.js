const { app } = require("..");
const db = require("../handlers/database");

app.post("/api/dev/channel/:channel_id/delete_all_messages", {}, (request, response) => {
    const channel = db.dm_channels.fetchByID(request.params["channel_id"]);
    if (!channel) return response.status(404).send();

    db.messages.deleteAll(channel.id);
    response.status(200).send();
});