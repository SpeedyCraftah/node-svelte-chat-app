// Populates the database with some mock data.
// To be used after changes to database structure or after erasing a database.

const db = require("./handlers/database");
const { faker } = require('@faker-js/faker');

// Create some base accounts.
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
});

// Create some mock accounts for testing involving multiple users.
(async() => {
    for (let i = 0; i < 100; i++) {
        const name = faker.person.firstName();
        const username = faker.internet.userName({ firstName: name });
        const password = faker.internet.password({ memorable: true });
        const avatar = faker.image.avatar();

        const account = await db.users.create(1, name, username, password, avatar);
        console.log("Created account:", account);
    }
})();