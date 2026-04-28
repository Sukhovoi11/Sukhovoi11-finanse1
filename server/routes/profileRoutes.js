const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,20}$/;
const ALLOWED_THEME_KEYS = ['pink', 'blue', 'green', 'aurora'];
const EXPENSE_CATEGORY_REGEX = /^[A-Z0-9_]{2,24}$/;
const MAX_CUSTOM_CATEGORIES = 30;
const MIN_MONTHLY_LIMIT = 100;
const MAX_MONTHLY_LIMIT = 1000000;

function fallbackUsernameFromEmail(email = '') {
  return (email.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 20) || 'user';
}

function normalizeExpenseCategory(rawCategory = '') {
  return String(rawCategory || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toUpperCase()
    .slice(0, 24);
}

function sanitizeExpenseCategories(input = []) {
  if (!Array.isArray(input)) return [];

  const normalized = [];
  const seen = new Set();

  for (const item of input) {
    const key = normalizeExpenseCategory(item);
    if (!EXPENSE_CATEGORY_REGEX.test(key)) continue;
    if (seen.has(key)) continue;

    normalized.push(key);
    seen.add(key);
    if (normalized.length >= MAX_CUSTOM_CATEGORIES) break;
  }

  return normalized;
}

function parseExpenseCategories(rawValue) {
  if (Array.isArray(rawValue)) {
    return sanitizeExpenseCategories(rawValue);
  }

  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(String(rawValue));
    return sanitizeExpenseCategories(Array.isArray(parsed) ? parsed : []);
  } catch (err) {
    return [];
  }
}

function toProfilePayload(row) {
  const username = (row.username || '').trim().toLowerCase() || fallbackUsernameFromEmail(row.email);
  const displayName = (row.display_name || '').trim() || username;
  const monthlyBudgetLimit = Number(row.monthly_budget_limit || 2500);

  return {
    email: row.email,
    username,
    displayName,
    bio: row.bio || '',
    notificationsEnabled: row.notifications_enabled !== 0,
    themeKey: ALLOWED_THEME_KEYS.includes(row.theme_key) ? row.theme_key : 'pink',
    darkModeEnabled: row.dark_mode_enabled === 1,
    monthlyBudgetLimit: Number.isFinite(monthlyBudgetLimit) ? monthlyBudgetLimit : 2500,
    expenseCategories: parseExpenseCategories(row.expense_categories),
  };
}

function getUserProfile(userId, callback) {
  db.get(
    `SELECT
      user_id,
      email,
      username,
      display_name,
      bio,
      expense_categories,
      notifications_enabled,
      theme_key,
      dark_mode_enabled,
      monthly_budget_limit
     FROM USERS
     WHERE user_id = ?`,
    [userId],
    callback
  );
}

router.get('/me', auth, (req, res) => {
  getUserProfile(req.user.userId, (err, row) => {
    if (err) return res.status(500).json({ message: 'Blad bazy danych' });
    if (!row) return res.status(404).json({ message: 'Nie znaleziono profilu' });
    return res.json(toProfilePayload(row));
  });
});

router.put('/me', auth, (req, res) => {
  const userId = req.user.userId;

  getUserProfile(userId, (profileErr, existingProfile) => {
    if (profileErr) return res.status(500).json({ message: 'Blad bazy danych' });
    if (!existingProfile) return res.status(404).json({ message: 'Nie znaleziono profilu' });

    const fallbackUsername = String(
      existingProfile.username || fallbackUsernameFromEmail(existingProfile.email || req.user.email || '')
    )
      .trim()
      .toLowerCase();

    const username =
      req.body.username === undefined
        ? fallbackUsername
        : String(req.body.username || '')
            .trim()
            .toLowerCase();

    const displayName =
      req.body.displayName === undefined
        ? String(existingProfile.display_name || fallbackUsername).trim()
        : String(req.body.displayName || '').trim();

    const bio =
      req.body.bio === undefined
        ? String(existingProfile.bio || '').trim()
        : String(req.body.bio || '').trim();

    const notificationsEnabled =
      req.body.notificationsEnabled === undefined
        ? existingProfile.notifications_enabled !== 0
        : req.body.notificationsEnabled === true;

    const themeKey = String(req.body.themeKey || existingProfile.theme_key || 'pink')
      .trim()
      .toLowerCase();

    const darkModeEnabled =
      req.body.darkModeEnabled === undefined
        ? existingProfile.dark_mode_enabled === 1
        : req.body.darkModeEnabled === true;

    const monthlyBudgetLimitRaw =
      req.body.monthlyBudgetLimit === undefined
        ? Number(existingProfile.monthly_budget_limit || 2500)
        : Number(req.body.monthlyBudgetLimit);

    const expenseCategories =
      req.body.expenseCategories === undefined
        ? parseExpenseCategories(existingProfile.expense_categories)
        : sanitizeExpenseCategories(req.body.expenseCategories);

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ message: 'Niepoprawny nick (3-20 znakow, litery/cyfry/._).' });
    }
    if (!displayName || displayName.length > 40) {
      return res.status(400).json({ message: 'Nazwa wyswietlana musi miec od 1 do 40 znakow.' });
    }
    if (bio.length > 160) {
      return res.status(400).json({ message: 'Bio moze miec maksymalnie 160 znakow.' });
    }
    if (!ALLOWED_THEME_KEYS.includes(themeKey)) {
      return res.status(400).json({ message: 'Nieobslugiwany motyw.' });
    }
    if (
      !Number.isFinite(monthlyBudgetLimitRaw) ||
      monthlyBudgetLimitRaw < MIN_MONTHLY_LIMIT ||
      monthlyBudgetLimitRaw > MAX_MONTHLY_LIMIT
    ) {
      return res
        .status(400)
        .json({ message: `Miesieczny limit musi byc w przedziale ${MIN_MONTHLY_LIMIT}-${MAX_MONTHLY_LIMIT}.` });
    }
    if (req.body.expenseCategories !== undefined && !Array.isArray(req.body.expenseCategories)) {
      return res.status(400).json({ message: 'Lista kategorii musi byc tablica.' });
    }

    db.get(
      'SELECT user_id FROM USERS WHERE lower(username) = lower(?) AND user_id <> ?',
      [username, userId],
      (checkErr, existingUser) => {
        if (checkErr) return res.status(500).json({ message: 'Blad bazy danych' });
        if (existingUser) return res.status(409).json({ message: 'Ten nick jest juz zajety.' });

        db.run(
          `UPDATE USERS
           SET username = ?,
               display_name = ?,
               bio = ?,
               expense_categories = ?,
               notifications_enabled = ?,
               theme_key = ?,
               dark_mode_enabled = ?,
               monthly_budget_limit = ?
           WHERE user_id = ?`,
          [
            username,
            displayName,
            bio,
            JSON.stringify(expenseCategories),
            notificationsEnabled ? 1 : 0,
            themeKey,
            darkModeEnabled ? 1 : 0,
            monthlyBudgetLimitRaw,
            userId,
          ],
          (updateErr) => {
            if (updateErr) return res.status(500).json({ message: 'Blad zapisu profilu' });

            getUserProfile(userId, (fetchErr, row) => {
              if (fetchErr || !row) return res.status(500).json({ message: 'Blad odczytu profilu' });
              return res.json(toProfilePayload(row));
            });
          }
        );
      }
    );
  });
});

router.put('/password', auth, (req, res) => {
  const userId = req.user.userId;
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Podaj aktualne i nowe haslo.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Nowe haslo musi miec minimum 6 znakow.' });
  }

  db.get('SELECT password_hash FROM USERS WHERE user_id = ?', [userId], async (err, row) => {
    if (err) return res.status(500).json({ message: 'Blad bazy danych' });
    if (!row) return res.status(404).json({ message: 'Nie znaleziono konta' });

    const passwordMatches = await bcrypt.compare(currentPassword, row.password_hash);
    if (!passwordMatches) {
      return res.status(400).json({ message: 'Aktualne haslo jest nieprawidlowe.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.run(
      'UPDATE USERS SET password_hash = ? WHERE user_id = ?',
      [newHash, userId],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ message: 'Nie udalo sie zmienic hasla.' });
        return res.json({ message: 'Haslo zostalo zmienione.' });
      }
    );
  });
});

module.exports = router;
