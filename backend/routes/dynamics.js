const { app } = require("..");
const db = require("../handlers/database");

app.get("/cdn/attachments/:resource_id/:id/:filename", {}, (request, response) => {
    const resource_id = request.params["resource_id"];
    const id = request.params["id"];
    const filename = request.params["filename"];

    // Check if entry exists and matches the resource ID.
    const entry = db.dynamics.getEntryByID(id);
    if (!entry || entry.resource_id !== resource_id || entry.name !== filename) return response.status(404).send();

    response.header("Content-Type", entry.mime_type);
    response.sendFile(id, "./data/dynamic/attachments", { cacheControl: true, etag: true, lastModified: true });
});