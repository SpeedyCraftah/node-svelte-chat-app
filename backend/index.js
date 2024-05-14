const path = require("path");
const fastify = require("fastify");
const { WebSocketServer } = require("ws");

// Create the app and wss and export for middleware and routes.
const app = fastify({ logger: true });
const wss = new WebSocketServer({ server: app.server, path: "/api/gateway" });
module.exports.app = app;
module.exports.wss = wss;

// Setup the static middleware functions.
app.register(require('@fastify/static'), {
    root: [path.join(__dirname, '../static'), path.join(__dirname, './static')],
    prefix: '/'
});

app.register(require("@fastify/cors"), {
    origin: ["http://localhost:5173", "http://localhost:4173"]
});

app.register(require('@fastify/multipart'), {
    limits: {
        fileSize: 20971520,
        files: 5,
    }
});

// Import and setup the middleware functions.
require("./middleware/authentication");

// Setup the routes.
require("./routes/auth");
require("./routes/dms");
require("./routes/users");
require("./routes/developer");
require("./routes/dynamics");

// Setup handlers that need to hook to app or wss.
require("./handlers/gateway/websocket");
require("./handlers/gateway/events");

// Listen to incoming connections.
app.listen({ port: 8000 });