const { sessions, users } = require("../handlers/database");
const { app } = require("../index");

// This middleware handles all authentication by restricting routes (such as /api/**) to logged in users only
// and attaching the session of the user automatically to the request for handlers to use.

app.addHook("preHandler", (request, reply, done) => {
    if (!request.routeOptions.url) return done();

    // Check if route URLs do not need authentication.
    // routeOptions.url is automatically verified by Fastify so obfuscation will not bypass this check.
    if (!request.routeOptions.url.startsWith("/api")) return done();

    // Login is the only route under /api which does not need authentication.
    if (request.routeOptions.url === "/api/login") return done();

    const session = sessions.fetchByToken(request.headers["x-session"] || "");
    if (!session) {
        return reply.status(401).send();
    }

    // Attach the user to the session.
    if (!session.user) {
        session.user = users.fetchByID(session.user_id);
    }

    request.session = session;

    done();
});