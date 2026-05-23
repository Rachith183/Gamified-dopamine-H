import sqlite3 from "sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "..", "data.db");

let db = null;

export function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Database connection error:", err);
        reject(err);
      } else {
        console.log("✅ SQLite database connected");
        createTables();
        resolve(db);
      }
    });
  });
}

function createTables() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat history table
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        message TEXT,
        response TEXT,
        model_used TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    // User data table (goals, profile, etc)
    db.run(`
      CREATE TABLE IF NOT EXISTS user_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        data_type TEXT,
        data_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);
  });
}

export function getDatabase() {
  return db;
}

export function saveMessage(userId, message, response, modelUsed) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO chat_messages (user_id, message, response, model_used) VALUES (?, ?, ?, ?)`,
      [userId, message, response, modelUsed],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

export function getUserData(userId, dataType) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT data_json FROM user_data WHERE user_id = ? AND data_type = ? ORDER BY updated_at DESC LIMIT 1`,
      [userId, dataType],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? JSON.parse(row.data_json) : null);
      }
    );
  });
}

export function saveUserData(userId, dataType, dataJson) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO user_data (user_id, data_type, data_json) VALUES (?, ?, ?)`,
      [userId, dataType, JSON.stringify(dataJson)],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}
