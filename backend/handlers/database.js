const DB = require("better-sqlite3");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const fsPromise = require("fs/promises");
const fs = require("fs");
const sanitizeFileName = require("sanitize-filename");

// Make data directory if it doesn't exist.
if (!fs.existsSync("../backend/data")) fs.mkdirSync("../backend/data");

// Make directory for dynamic data if not exists.
if (!fs.existsSync("../backend/data/dynamic")) fs.mkdirSync("../backend/data/dynamic");

// Make directory for uploaded attachments if not exists.
if (!fs.existsSync("../backend/data/dynamic/attachments")) fs.mkdirSync("../backend/data/dynamic/attachments");

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

db.prepare(`CREATE TABLE IF NOT EXISTS messages(
    id VARCHAR(36) PRIMARY KEY,
    channel_id VARCHAR(36),
    user_id VARCHAR(36),
    date UNSIGNED BIGINT,
    content TEXT,
    has_attachments UNSIGNED TINYINT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS dynamics(
    id VARCHAR(36) PRIMARY KEY,
    category TEXT,
    resource_id VARCHAR(36),
    created_date UNSIGNED BIGINT,
    size_bytes UNSIGNED BIGINT,
    mime_type TEXT,
    name TEXT
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

    searchMultipleByUsername: (username, limit, excluded_user_id) => {
        const result = db.prepare("SELECT * FROM users WHERE username LIKE (? || '%') AND id != ? LIMIT ?").all(username, excluded_user_id, limit);
        return result;
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

    create: async (type, first_name, username, password_text, avatar_url = "/avatars/avatar.jpg") => {
        const user = {
            id: crypto.randomUUID(),
            created_date: Date.now(),
            first_name, username, type,
            password_encoded: await bcrypt.hash(password_text, this.users.PASSWORD_SALT_ROUNDS),
            avatar_url: avatar_url, // Add default avatar for now.
            mfa_secret: null
        };

        db.prepare("INSERT INTO users(id,created_date,first_name,username,type,password_encoded,mfa_secret,avatar_url) VALUES(?,?,?,?,?,?,?,?)").run(user.id, user.created_date, user.first_name, user.username, user.type, user.password_encoded, user.mfa_secret, user.avatar_url);
        return user;
    }
};

// Handles the storage of dynamic binary data such as images and attachments.
module.exports.dynamics = {
    createEntry: (id, category, resource_id, size_bytes, mime_type, name) => {
        const attachment = {
            id,
            category,
            created_date: Date.now(),
            resource_id,
            size_bytes,
            mime_type,
            name: sanitizeFileName(name)
        };

        db.prepare("INSERT INTO dynamics(id,category,created_date,resource_id,size_bytes,mime_type,name) VALUES(?,?,?,?,?,?,?)").run(attachment.id, attachment.category, attachment.created_date, attachment.resource_id, attachment.size_bytes, attachment.mime_type, attachment.name);
        return attachment;
    },

    deleteEntry: (id) => {
        const entry = db.prepare("SELECT category FROM dynamics WHERE id = ?").get(id);
        if (entry) db.prepare("DELETE FROM dynamics WHERE id = ?").run(id);

        // Delete the file.
        fsPromise.rm(`../data/dynamics/${entry.category}/${id}`).catch(() => null);
    },

    getEntriesByRID: (resource_id) => {
        return db.prepare("SELECT * FROM dynamics WHERE resource_id = ?").all(resource_id);
    },

    getEntryByID: (id) => {
        return db.prepare("SELECT * FROM dynamics WHERE id = ?").get(id);
    },

    deleteEntriesByRID: (resource_id) => {
        const entries = db.prepare("SELECT id,category FROM dynamics WHERE resource_id = ?").all(resource_id);
        if (entries.length) db.prepare("DELETE FROM dynamics WHERE resource_id = ?").run(resource_id);

        // Delete the files.
        for (const entry of entries) {
            fsPromise.rm(`../data/dynamics/${entry.category}/${entry.id}`).catch(() => null);
        }
    }
};

module.exports.messages = {
    create: (user_id, channel_id, content, id = crypto.randomUUID(), has_attachments = false) => {
        const message = {
            id,
            user_id,
            channel_id,
            date: Date.now(),
            content,
            has_attachments: has_attachments ? 1 : 0
        };

        db.prepare("INSERT INTO messages(id, channel_id, user_id, date, content, has_attachments) VALUES(?, ?, ?, ?, ?, ?)").run(message.id, message.channel_id, message.user_id, message.date, message.content, message.has_attachments);
        return message;
    },

    delete: (id) => {
        db.prepare("DELETE FROM messages WHERE id = ?").run(id);
        this.dynamics.deleteEntriesByRID(id);
    },

    deleteAll: (channel_id) => {
        db.prepare("DELETE FROM messages WHERE channel_id = ?").run(channel_id);

        // TODO - add deletion for message attachments.
    },

    fetchAll: (channel_id) => {
        const messages = db.prepare("SELECT * FROM messages WHERE channel_id = ? ORDER BY date DESC").all(channel_id);
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            if (message.has_attachments) {
                message.attachments = this.dynamics.getEntriesByRID(message.id);
            }
        }

        return messages;
    },

    fetchFew: (channel_id, limit) => {
        const messages = db.prepare("SELECT * FROM messages WHERE channel_id = ? ORDER BY date DESC LIMIT ?").all(channel_id, limit)
            .map(message => {
                if (message.has_attachments) {
                    message.attachments = this.dynamics.getEntriesByRID(message.id);
                }
            });
        
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