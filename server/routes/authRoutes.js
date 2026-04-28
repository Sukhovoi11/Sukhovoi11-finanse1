const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function normalizeEmail(rawEmail = '') {
  return String(rawEmail || '').trim().toLowerCase();
}

router.post('/register', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!email || !password)
    return res.status(400).json({ message: 'Email i hasło są wymagane' });
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: 'Podaj poprawny adres email' });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ message: `Hasło musi mieć minimum ${MIN_PASSWORD_LENGTH} znaków` });
  }

  const hash = await bcrypt.hash(password, 10);
  const emailPrefix = email.split('@')[0] || 'user';
  const normalizedPrefix = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 14) || 'user';
  const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
  const initialUsername = `${normalizedPrefix}${randomSuffix}`.slice(0, 20);
  const initialDisplayName = initialUsername;

  const sql = `
    INSERT INTO USERS (
      email,
      password_hash,
      username,
      display_name,
      bio,
      base_currency,
      notifications_enabled,
      is_private
    ) VALUES (?, ?, ?, ?, '', 'PLN', 1, 0)
  `;
  db.run(sql, [email, hash, initialUsername, initialDisplayName], function (err) {
    if (err) {
      return res.status(400).json({ message: 'Użytkownik o podanym adresie email już istnieje' });
    }
    return res.status(201).json({ userId: this.lastID });
  });
});


router.post('/login', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!EMAIL_REGEX.test(email) || !password) {
    return res.status(400).json({ message: 'Nieprawidłowy email lub hasło' });
  }

  db.get('SELECT * FROM USERS WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(400).json({ message: 'Nieprawidłowy email lub hasło' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ message: 'Nieprawidłowy email lub hasło' });

    const token = jwt.sign(
        { userId: user.user_id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    res.json({ token });
  });
});


router.post('/logout', (req, res) => {
  res.json({ message: 'Wylogowano pomyślnie z Finanse+' });
});

module.exports = router;
