const DB = require("better-sqlite3");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const db = new DB("../backend/data/db.sqlite");
module.exports.db = db;

// Define the tables.
db.prepare(`CREATE TABLE IF NOT EXISTS users(
    id VARCHAR(36) PRIMARY KEY,
    created_date UNSIGNED BIGINT,
    first_name VARCHAR(20),
    username VARCHAR(30),
    avatar_url TEXT,
    type UNSIGNED TINYINT,
    password_encoded TEXT,
    mfa_secret TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS attachments(
    id VARCHAR(36) PRIMARY KEY,
    resource_id VARCHAR(36),
    date UNSIGNED BIGINT,
    size_bytes UNSIGNED BIGINT,
    mime_type TEXT,
    name TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS images(
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    channel_id VARCHAR(36),
    message_id VARCHAR(36)
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS dm_channels(
    id VARCHAR(36) PRIMARY KEY,
    user1_id VARCHAR(36),
    user2_id VARCHAR(36)
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS sessions(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token VARCHAR(172),
    user_id VARCHAR(36),
    created_date UNSIGNED BIGINT
)`).run();

module.exports.users = {
    PASSWORD_SALT_ROUNDS: 11,
    cache: {
        usernameKey: new Map(),
        idKey: new Map()
    },

    fetchByID: (id) => {
        let user = this.users.cache.usernameKey.get(id);
        if (!user) {
            user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
            if (user) {
                this.users.cache.usernameKey.set(user.username, user);
                this.users.cache.idKey.set(user.id, user);
            }
        }

        return user;
    },

    fetchByUsername: (username) => {
        let user = this.users.cache.usernameKey.get(username);
        if (!user) {
            user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
            if (user) {
                this.users.cache.usernameKey.set(user.username, user);
                this.users.cache.idKey.set(user.id, user);
            }
        }

        return user;
    },

    create: async (type, first_name, username, password_text) => {
        const user = {
            id: crypto.randomUUID(),
            created_date: Date.now(),
            first_name, username, type,
            password_encoded: await bcrypt.hash(password_text, this.users.PASSWORD_SALT_ROUNDS),
            mfa_secret: null
        };

        db.prepare("INSERT INTO users(id,created_date,first_name,username,type,password_encoded,mfa_secret) VALUES(?,?,?,?,?,?,?)").run(user.id, user.created_date, user.first_name, user.username, user.type, user.password_encoded, user.mfa_secret);
        return user;
    }
};

module.exports.messages = {
    create: (user_id, channel_id, type, content) => {
        const message = {
            id: crypto.randomUUID(),
            user_id,
            channel_id,
            type,
            date: Date.now(),
            content
        };

        db.prepare("INSERT INTO messages(id, channel_id, user_id, date, type, content) VALUES(?, ?, ?, ?, ?, ?)").run(message.id, message.channel_id, message.user_id, message.date, message.type, message.content);

        // If message is an image.
        if (type === 2) {
            const image = {
                id: crypto.randomUUID(),
                user_id,
                message_id: message.id
            };

            // disabled for time being
            //db.prepare("INSERT INTO images(id, user_id, message_id) VALUES(?, ?, ?)").run(image.id, image.user_id, image.message_id);

            return { image, message };
        }

        return { image: null, message };
    },

    delete: (id) => {
        const messageType = db.prepare("SELECT type FROM messages WHERE id = ?").get(id);
        if (typeof messageType !== "object") return;

        db.prepare("DELETE FROM messages WHERE id = ?").run(id);

        // If message is an image.
        if (messageType.type === 2) db.prepare("DELETE FROM images WHERE message_id = ?").run(id);
    },

    deleteAll: (channel_id) => {
        db.prepare("DELETE FROM messages WHERE channel_id = ?").run(channel_id);
        db.prepare("DELETE FROM images WHERE channel_id = ?").run(channel_id);
    },

    fetchAll: (channel_id) => {
        const messages = db.prepare("SELECT * FROM messages WHERE channel_id = ? ORDER BY date DESC").all(channel_id);
        return messages;
    },

    fetchFew: (channel_id, limit) => {
        const messages = db.prepare("SELECT * FROM messages WHERE channel_id = ? ORDER BY date DESC LIMIT ?").all(channel_id, limit);
        return messages;
    }
};

module.exports.dm_channels = {
    fetchByMembers: (user1_id, user2_id) => {
        const data = db.prepare(`SELECT * FROM dm_channels WHERE (user1_id = ? AND user2_id = ?) OR (user2_id = ? AND user1_id = ?)`)
            .get(user1_id, user2_id, user2_id, user1_id);

        return data;
    },

    fetchBySingleMember: (user_id) => {
        const data = db.prepare(`SELECT * FROM dm_channels WHERE user1_id = ? OR user2_id = ?`).all(user_id, user_id);
        return data;
    },

    fetchByID: (id) => {
        const data = db.prepare(`SELECT * FROM dm_channels WHERE id = ?`).get(id);
        return data;
    },

    create: (user1_id, user2_id) => {
        const channel = {
            id: crypto.randomUUID(),
            user1_id,
            user2_id
        };

        db.prepare(`INSERT INTO dm_channels(id, user1_id, user2_id) VALUES(?, ?, ?)`).run(channel.id, user1_id, user2_id);
        return channel;
    },

    deleteByID: (id) => {
        db.prepare(`DELETE FROM dm_channels WHERE id = ?`).run(id);
        db.prepare(`DELETE FROM messages WHERE channel_id = ?`).run(id);
    }
};

module.exports.sessions = {
    cache: new Map(),

    fetchByUserID: (user_id) => {
        return db.prepare(`SELECT * FROM sessions WHERE user_id = ?`).get(user_id);
    },

    fetchByID: (id) => {
        return db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id);
    },

    fetchByToken: (token) => {
        let session = this.sessions.cache.get(token);
        if (!session) {
            session = db.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token);
            if (session) {
                this.sessions.cache.set(session.token, session);
            }
        }

        return session;
    },

    deleteByUserID: (user_id) => {
        const sessions = db.prepare(`SELECT id FROM sessions WHERE user_id = ?`).all(user_id);
        for (let i = 0; i < sessions.length; i++) {
            this.sessions.cache.delete(sessions[i]);
        }

        db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(user_id);
    },

    create: (user_id) => {
        const session = {
            id: null, // Populated by database.
            user_id,
            created_date: Date.now(),
            token: crypto.randomBytes(128).toString("base64")
        };

        db.prepare(`INSERT INTO sessions(user_id,created_date,token) VALUES(?,?,?)`).run(session.user_id, session.created_date, session.token);
        return session;
    }
};