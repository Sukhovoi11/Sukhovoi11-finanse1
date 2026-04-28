const express = require('express');
const db = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();


router.post('/topup', auth, (req, res) => {
  const userId = req.user.userId;
  const amount = Number(req.body.amount);
  const currency = 'PLN';

  if (!Number.isFinite(amount) || amount <= 0)
    return res.status(400).json({ message: 'Kwota doładowania musi być większа niż 0' });

  const insertIncomeTransaction = (callback) => {
    db.run(
      `INSERT INTO TRANSACTIONS
       (user_id, type, currency_from, currency_to, amount, rate)
       VALUES (?, 'INCOME', 'INCOME', 'PLN', ?, 1)`,
      [userId, amount],
      callback
    );
  };

  db.get(
    'SELECT * FROM WALLET_BALANCE WHERE user_id = ? AND currency_code = ?',
    [userId, currency],
    (err, row) => {
      if (row) {
        db.run(
          'UPDATE WALLET_BALANCE SET amount = amount + ? WHERE balance_id = ?',
          [amount, row.balance_id],
          (err2) => {
            if (err2) return res.status(500).json({ message: 'Błąd bazy danych Finanse+' });
            insertIncomeTransaction((err3) => {
              if (err3) return res.status(500).json({ message: 'Błąd zapisu historii transakcji' });
              res.json({ message: 'Saldo zostało pomyślnie zaktualizowane' });
            });
          }
        );
      } else {
        db.run(
          'INSERT INTO WALLET_BALANCE (user_id, currency_code, amount) VALUES (?, ?, ?)',
          [userId, currency, amount],
          (err2) => {
            if (err2) return res.status(500).json({ message: 'DB error' });
            insertIncomeTransaction((err3) => {
              if (err3) return res.status(500).json({ message: 'Błąd zapisu historii transakcji' });
              res.json({ message: 'Nowy portfel walutowy został otwarty' });
            });
          }
        );
      }
    }
  );
});

router.get('/portfolio', auth, (req, res) => {
  const userId = req.user.userId;
  db.all(
    'SELECT currency_code, amount FROM WALLET_BALANCE WHERE user_id = ?',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    }
  );
});

module.exports = router;
