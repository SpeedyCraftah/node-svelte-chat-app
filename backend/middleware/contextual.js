// This middleware collection automatically fetches, verifies and
// attaches objects to the request depending on the route.

const db = require("../handlers/database");
const { isMemberOfDMChannel } = require("../misc/dms");

module.exports.DMChannelHook = (request, reply, done) => {
    const channelID = request.params["channel_id"];
    if (!channelID) return reply.status(404).send();

    const channel = db.dm_channels.fetchByID(channelID);
    if (!channel) return reply.status(404).send();

    // Check access rights to channel.
    // Timing of our response will likely give away the channel exists anyways, so a 404 isn't necessary.
    if (!isMemberOfDMChannel(channel, request.session.user)) return reply.status(401).send();

    request.channel = channel;

    done();
};

module.exports.TargetUserHook = (request, reply, done) => {
    const userID = request.params["user_id"];
    if (!userID) return reply.status(404).send();

    const user = db.users.fetchByID(channelID);
    if (!user) return reply.status(404).send();

    // Name is very explicit to avoid confusion with session#user.
    request.targetUser = user;

    done();
};