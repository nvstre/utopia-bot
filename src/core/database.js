import Database from 'better-sqlite3';
import { logger } from './logger.js';
import path from 'path';

const dbPath = path.resolve('dev.db');
export const db = new Database(dbPath); // verbose: console.log

// Initialize Database Schema
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      balance REAL DEFAULT 0.0,
      ucoins REAL DEFAULT 0.0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migration for existing tables: Check if ucoins exists, if not add it
  try {
    const userTable = db.pragma('table_info(User)');
    const hasUcoins = userTable.some(col => col.name === 'ucoins');
    if (!hasUcoins) {
      db.prepare('ALTER TABLE User ADD COLUMN ucoins REAL DEFAULT 0.0').run();
      logger.info('Migrated User table: Added ucoins column');
    }
  } catch (e) {
    logger.warn('Migration check failed: ' + e.message);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS Submission (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      tikTokUrl TEXT NOT NULL,
      videoId TEXT UNIQUE,
      verificationCode TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      lastViewCount INTEGER DEFAULT 0,
      totalPointsEarned REAL DEFAULT 0.0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES User(id)
    );

    CREATE TABLE IF NOT EXISTS ViewLog (
      id TEXT PRIMARY KEY,
      submissionId TEXT NOT NULL,
      viewCount INTEGER NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (submissionId) REFERENCES Submission(id)
    );

    CREATE TABLE IF NOT EXISTS SystemConfig (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_submission_user ON Submission(userId);
    CREATE INDEX IF NOT EXISTS idx_submission_status ON Submission(status);
  `);
  logger.info('Database initialized with better-sqlite3');
} catch (error) {
  logger.error('Failed to initialize database schema', error);
  process.exit(1);
}
