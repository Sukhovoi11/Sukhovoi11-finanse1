const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbPath = path.join(__dirname, process.env.DB_FILE || 'elitekantor.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS USERS (
                                       user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                                       email TEXT NOT NULL UNIQUE,
                                       password_hash TEXT NOT NULL,
                                       username TEXT,
                                       display_name TEXT,
                                       bio TEXT DEFAULT '',
                                       expense_categories TEXT DEFAULT '[]',
                                       base_currency TEXT DEFAULT 'PLN',
                                       notifications_enabled INTEGER NOT NULL DEFAULT 1,
                                       is_private INTEGER NOT NULL DEFAULT 0,
                                       theme_key TEXT DEFAULT 'pink',
                                       dark_mode_enabled INTEGER NOT NULL DEFAULT 0,
                                       monthly_budget_limit REAL NOT NULL DEFAULT 2500,
                                       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const userColumnsToEnsure = [
    "username TEXT",
    "display_name TEXT",
    "bio TEXT DEFAULT ''",
    "expense_categories TEXT DEFAULT '[]'",
    "base_currency TEXT DEFAULT 'PLN'",
    'notifications_enabled INTEGER NOT NULL DEFAULT 1',
    'is_private INTEGER NOT NULL DEFAULT 0',
    "theme_key TEXT DEFAULT 'pink'",
    'dark_mode_enabled INTEGER NOT NULL DEFAULT 0',
    'monthly_budget_limit REAL NOT NULL DEFAULT 2500',
    'updated_at DATETIME',
  ];

  userColumnsToEnsure.forEach((columnDef) => {
    db.run(`ALTER TABLE USERS ADD COLUMN ${columnDef}`, (err) => {
      if (err && !String(err.message).includes('duplicate column name')) {
        console.error(`DB migration issue for USERS column "${columnDef}":`, err.message);
      }
    });
  });

  db.run(
    'UPDATE USERS SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)',
    (err) => {
      if (err && !String(err.message).includes('no such column: updated_at')) {
        console.error('DB migration issue for USERS.updated_at backfill:', err.message);
      }
    }
  );

  db.run(
    `UPDATE USERS
     SET theme_key = COALESCE(theme_key, 'pink'),
         dark_mode_enabled = COALESCE(dark_mode_enabled, 0),
         monthly_budget_limit = COALESCE(monthly_budget_limit, 2500),
         expense_categories = COALESCE(expense_categories, '[]')`,
    (err) => {
      if (err) {
        console.error('DB migration issue for USERS preference defaults:', err.message);
      }
    }
  );

  db.run(`
    CREATE TABLE IF NOT EXISTS WALLET_BALANCE (
                                                balance_id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                user_id INTEGER NOT NULL,
                                                currency_code TEXT NOT NULL,
                                                amount REAL NOT NULL DEFAULT 0,
                                                FOREIGN KEY (user_id) REFERENCES USERS(user_id)
      )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS TRANSACTIONS (
                                              transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
                                              user_id INTEGER NOT NULL,
                                              type TEXT NOT NULL,                 -- DEPOSIT / BUY / SELL
                                              currency_from TEXT,
                                              currency_to TEXT,
                                              amount REAL NOT NULL,
                                              rate REAL,
                                              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                              FOREIGN KEY (user_id) REFERENCES USERS(user_id)
      )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS EXCHANGE_RATES (
                                                rate_id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                currency_code TEXT NOT NULL,
                                                mid_rate REAL NOT NULL,
                                                effective_date DATE NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS EXCHANGE_RATES_HISTORY (
                                                        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                        currency_code TEXT NOT NULL,
                                                        mid_rate REAL NOT NULL,
                                                        rate_date DATE NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS SAVINGS_GOALS (
                                                goal_id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                user_id INTEGER NOT NULL,
                                                title TEXT NOT NULL,
                                                target_amount REAL NOT NULL,
                                                saved_amount REAL NOT NULL DEFAULT 0,
                                                due_date TEXT,
                                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                FOREIGN KEY (user_id) REFERENCES USERS(user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS PAYMENT_REMINDERS (
                                                   reminder_id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   user_id INTEGER NOT NULL,
                                                   title TEXT NOT NULL,
                                                   amount REAL,
                                                   due_date TEXT NOT NULL,
                                                   is_paid INTEGER NOT NULL DEFAULT 0,
                                                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                   FOREIGN KEY (user_id) REFERENCES USERS(user_id)
    )
  `);
});

module.exports = db;
