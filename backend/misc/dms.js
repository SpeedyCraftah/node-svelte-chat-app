const db = require("../handlers/database");

// Function to get the user object of the target user.
module.exports.getDMTargetUser = (channel, session_user) => {
    let targetUser;

    if (session_user.id === channel.user1_id) targetUser = db.users.fetchByID(channel.user2_id);
    else if (session_user.id === channel.user2_id) targetUser = db.users.fetchByID(channel.user1_id);

    // User is not part of the DM.
    else return null;

    return targetUser;
};

// Function to verify if user is part of the DM channel.
module.exports.isMemberOfDMChannel = (channel, user) => {
    return channel.user1_id === user.id || channel.user2_id === user.id;
};