import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPromise = open({
  filename: path.join(__dirname, 'database.sqlite'),
  driver: sqlite3.Database
});

export async function initDb() {
  const db = await dbPromise;
  
  // Enable foreign key support in SQLite
  await db.exec(`PRAGMA foreign_keys = ON;`);
  
  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      user_id TEXT,
      email TEXT,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      paid_by_member_id TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      split_type TEXT NOT NULL, -- 'equal', 'exact', 'percentage'
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_by_member_id) REFERENCES members(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS expense_splits (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settlements_history (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      from_member_id TEXT NOT NULL,
      to_member_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (from_member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY (to_member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      action_type TEXT NOT NULL, -- 'create_expense', 'delete_expense', 'record_payment'
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recurring_templates (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      paid_by_member_id TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      frequency TEXT NOT NULL, -- 'weekly', 'monthly'
      next_due_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_by_member_id) REFERENCES members(id) ON DELETE CASCADE
    );
  `);
  
  // Add status column to settlements_history for anti-fraud confirmation workflow
  try {
    await db.exec(`ALTER TABLE settlements_history ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';`);
  } catch (err) {
    // Safely ignore if column already exists
  }

  // Database Schema migrations for User Authentication support
  try {
    await db.exec(`ALTER TABLE groups ADD COLUMN created_by_user_id TEXT;`);
  } catch (err) {
    // Safely ignore if column already exists
  }

  try {
    await db.exec(`ALTER TABLE members ADD COLUMN user_id TEXT;`);
  } catch (err) {
    // Safely ignore if column already exists
  }

  try {
    await db.exec(`ALTER TABLE members ADD COLUMN email TEXT;`);
  } catch (err) {
    // Safely ignore if column already exists
  }

  return db;
}

export async function getDb() {
  return await dbPromise;
}
