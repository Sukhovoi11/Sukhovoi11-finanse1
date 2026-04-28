const express = require('express');
const db = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const userId = req.user.userId;
  db.all(
    'SELECT * FROM PAYMENT_REMINDERS WHERE user_id = ? ORDER BY due_date ASC',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Błąd bazy danych' });
      res.json(rows);
    }
  );
});

router.post('/', auth, (req, res) => {
  const userId = req.user.userId;
  const title = String(req.body.title || '').trim();
  const dueDate = String(req.body.dueDate || '').trim();
  const amount =
    req.body.amount === undefined || req.body.amount === null || req.body.amount === ''
      ? null
      : Number(req.body.amount);

  if (!title || !dueDate) {
    return res.status(400).json({ message: 'Tytuł i termin są wymagane' });
  }
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
    return res.status(400).json({ message: 'Kwota musi byc liczbą większą od 0' });
  }

  db.run(
    `INSERT INTO PAYMENT_REMINDERS (user_id, title, amount, due_date)
     VALUES (?, ?, ?, ?)`,
    [userId, title, amount, dueDate],
    function (err) {
      if (err) return res.status(500).json({ message: 'Błąd bazy danych' });
      res.status(201).json({ reminderId: this.lastID });
    }
  );
});

router.patch('/:reminderId', auth, (req, res) => {
  const userId = req.user.userId;
  const reminderId = req.params.reminderId;
  const { isPaid } = req.body;

  db.run(
    'UPDATE PAYMENT_REMINDERS SET is_paid = ? WHERE reminder_id = ? AND user_id = ?',
    [isPaid ? 1 : 0, reminderId, userId],
    function (err) {
      if (err) return res.status(500).json({ message: 'Błąd bazy danych' });
      if (!this.changes) return res.status(404).json({ message: 'Nie znaleziono przypomnienia' });
      res.json({ message: 'Status zaktualizowany' });
    }
  );
});

router.delete('/:reminderId', auth, (req, res) => {
  const userId = req.user.userId;
  const reminderId = Number(req.params.reminderId);

  if (!Number.isInteger(reminderId) || reminderId <= 0) {
    return res.status(400).json({ message: 'Niepoprawne ID przypomnienia' });
  }

  db.run(
    'DELETE FROM PAYMENT_REMINDERS WHERE reminder_id = ? AND user_id = ?',
    [reminderId, userId],
    function (err) {
      if (err) return res.status(500).json({ message: 'Błąd bazy danych' });
      if (!this.changes) return res.status(404).json({ message: 'Nie znaleziono przypomnienia' });
      return res.json({ message: 'Przypomnienie zostało usunięte' });
    }
  );
});

module.exports = router;
