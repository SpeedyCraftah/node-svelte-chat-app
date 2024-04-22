const { users, sessions } = require("../handlers/database");
const { app } = require("../index");
const bcrypt = require("bcrypt");

app.post("/api/login", {
    schema: {
        body: {
            type: "object",
            properties: {
                username: { type: "string" },
                password: { type: "string" }
            },
            required: ["username", "password"]
        }
    }
}, async (request, response) => {
    const creds = request.body;

    const user = users.fetchByUsername(creds.username);
    if (!user) return response.status(401).send();

    // Validate the password with the hash.
    const validation = await bcrypt.compare(creds.password, user.password_encoded).catch(console.error);
    if (!validation) return response.status(401).send();

    // For now use a single session for users.
    const session = sessions.fetchByUserID(user.id) || sessions.create(user.id);

    // Send the session token back to the client.
    response.status(200).send({ session: session.token });
});