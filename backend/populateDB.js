// Populates the database with some mock data.
// To be used after changes to database structure or after erasing a database.

const db = require("./handlers/database");

(async() => {
    // Create an account for the login user.
    const loginAccount = await db.users.create(1, "Speedy", "speedy", "speedy123");
    console.log("Login Account:", loginAccount);

    // Create a mock target user.
    const targetUser = await db.users.create(1, "Target", "target", "target123");
    console.log("Target Account:", targetUser);

    // Create a DM between login and target user.
    const dm = db.dm_channels.create(loginAccount.id, targetUser.id);
    console.log("DM:", dm);
})();