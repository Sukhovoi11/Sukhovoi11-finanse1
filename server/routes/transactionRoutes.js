const express = require('express');
const db = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

function parsePositiveAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function getRate(code, cb) {
  db.get(
    'SELECT mid_rate FROM EXCHANGE_RATES WHERE currency_code = ?',
    [code.toUpperCase()],
    (err, row) => {
      if (err || !row) return cb('Brak kursu dla ' + code);
      cb(null, row.mid_rate);
    }
  );
}

function adjustWalletBalance(userId, currencyCode, delta, cb) {
  const safeDelta = Number(delta || 0);
  if (!Number.isFinite(safeDelta) || Math.abs(safeDelta) < 1e-9) return cb(null);

  db.get(
    'SELECT balance_id, amount FROM WALLET_BALANCE WHERE user_id = ? AND currency_code = ?',
    [userId, currencyCode],
    (err, row) => {
      if (err) return cb({ status: 500, message: 'Błąd bazy danych' });

      if (!row) {
        if (safeDelta < 0) {
          return cb({ status: 400, message: `Brak środków ${currencyCode} do cofnięcia operacji` });
        }

        db.run(
          'INSERT INTO WALLET_BALANCE (user_id, currency_code, amount) VALUES (?, ?, ?)',
          [userId, currencyCode, safeDelta],
          (insertErr) => {
            if (insertErr) return cb({ status: 500, message: 'Błąd bazy danych' });
            return cb(null);
          }
        );
        return;
      }

      const nextAmount = Number(row.amount || 0) + safeDelta;
      if (nextAmount < -1e-6) {
        return cb({ status: 400, message: `Brak środków ${currencyCode} do cofnięcia operacji` });
      }

      db.run(
        'UPDATE WALLET_BALANCE SET amount = ? WHERE balance_id = ?',
        [Math.max(nextAmount, 0), row.balance_id],
        (updateErr) => {
          if (updateErr) return cb({ status: 500, message: 'Błąd bazy danych' });
          return cb(null);
        }
      );
    }
  );
}

function rollbackTransactionEffect(userId, transaction, cb) {
  const type = String(transaction.type || '').toUpperCase();
  const amount = Number(transaction.amount || 0);
  const rate = Number(transaction.rate || 1);

  if (!Number.isFinite(amount) || amount <= 0) {
    return cb({ status: 400, message: 'Nie można usunąć tej operacji' });
  }

  if (type === 'INCOME') {
    return adjustWalletBalance(userId, 'PLN', -amount, cb);
  }

  if (type === 'EXPENSE') {
    return adjustWalletBalance(userId, 'PLN', amount, cb);
  }

  if (type === 'BUY') {
    const targetCurrency = String(transaction.currency_to || '').toUpperCase();
    const spentPln = amount * (Number.isFinite(rate) ? rate : 1);
    if (!targetCurrency) {
      return cb({ status: 400, message: 'Nie można usunąć tej operacji' });
    }

    return adjustWalletBalance(userId, targetCurrency, -amount, (errForeign) => {
      if (errForeign) return cb(errForeign);
      return adjustWalletBalance(userId, 'PLN', spentPln, cb);
    });
  }

  if (type === 'SELL') {
    const sourceCurrency = String(transaction.currency_from || '').toUpperCase();
    const gainedPln = amount * (Number.isFinite(rate) ? rate : 1);
    if (!sourceCurrency) {
      return cb({ status: 400, message: 'Nie można usunąć tej operacji' });
    }

    return adjustWalletBalance(userId, 'PLN', -gainedPln, (errPln) => {
      if (errPln) return cb(errPln);
      return adjustWalletBalance(userId, sourceCurrency, amount, cb);
    });
  }

  if (type === 'SAVING') {
    const goalTitle = String(transaction.currency_to || '').trim();
    return adjustWalletBalance(userId, 'PLN', amount, (walletErr) => {
      if (walletErr) return cb(walletErr);

      if (!goalTitle || goalTitle.toUpperCase() === 'PLN') {
        return cb(null);
      }

      db.run(
        `UPDATE SAVINGS_GOALS
         SET saved_amount = CASE WHEN saved_amount - ? < 0 THEN 0 ELSE saved_amount - ? END
         WHERE user_id = ? AND title = ?`,
        [amount, amount, userId, goalTitle],
        (goalErr) => {
          if (goalErr) return cb({ status: 500, message: 'Błąd bazy danych' });
          return cb(null);
        }
      );
    });
  }

  return cb(null);
}

router.post('/buy', auth, (req, res) => {
  const userId = req.user.userId;
  const currencyTo = String(req.body.currencyTo || '').trim().toUpperCase();
  const amountPln = parsePositiveAmount(req.body.amountPln);

  if (!currencyTo || !amountPln) {
    return res.status(400).json({ message: 'Błędne dane wejściowe' });
  }

  getRate(currencyTo, (err, rate) => {
    if (err) return res.status(400).json({ message: err });

    const amountForeign = amountPln / rate;

    db.serialize(() => {
      db.get(
        'SELECT * FROM WALLET_BALANCE WHERE user_id = ? AND currency_code = ?',
        [userId, 'PLN'],
        (errP, pln) => {
          if (!pln || pln.amount < amountPln) {
            return res.status(400).json({ message: 'Niewystarczające środki PLN na koncie Finanse+' });
          }

          db.run(
            'UPDATE WALLET_BALANCE SET amount = amount - ? WHERE balance_id = ?',
            [amountPln, pln.balance_id]
          );

          db.get(
            'SELECT * FROM WALLET_BALANCE WHERE user_id = ? AND currency_code = ?',
            [userId, currencyTo],
            (errF, foreign) => {
              if (foreign) {
                db.run(
                  'UPDATE WALLET_BALANCE SET amount = amount + ? WHERE balance_id = ?',
                  [amountForeign, foreign.balance_id]
                );
              } else {
                db.run(
                  'INSERT INTO WALLET_BALANCE (user_id, currency_code, amount) VALUES (?, ?, ?)',
                  [userId, currencyTo, amountForeign]
                );
              }

              db.run(
                `INSERT INTO TRANSACTIONS
                 (user_id, type, currency_from, currency_to, amount, rate)
                 VALUES (?, 'BUY', 'PLN', ?, ?, ?)`,
                [userId, currencyTo, amountForeign, rate]
              );

              res.json({
                message: 'Transakcja zakupu zakończona sukcesem',
                rate,
                amountForeign,
              });
            }
          );
        }
      );
    });
  });
});

router.post('/sell', auth, (req, res) => {
  const userId = req.user.userId;
  const currencyFrom = String(req.body.currencyFrom || '').trim().toUpperCase();
  const amountForeign = parsePositiveAmount(req.body.amountForeign);

  if (!currencyFrom || !amountForeign) {
    return res.status(400).json({ message: 'Błędne dane wejściowe' });
  }

  getRate(currencyFrom, (err, rate) => {
    if (err) return res.status(400).json({ message: err });

    const amountPln = amountForeign * rate;

    db.serialize(() => {
      db.get(
        'SELECT * FROM WALLET_BALANCE WHERE user_id = ? AND currency_code = ?',
        [userId, currencyFrom],
        (errF, foreign) => {
          if (!foreign || foreign.amount < amountForeign) {
            return res
              .status(400)
              .json({ message: 'Brak wystarczającej ilości jednostek ' + currencyFrom });
          }

          db.run(
            'UPDATE WALLET_BALANCE SET amount = amount - ? WHERE balance_id = ?',
            [amountForeign, foreign.balance_id]
          );

          db.get(
            'SELECT * FROM WALLET_BALANCE WHERE user_id = ? AND currency_code = ?',
            [userId, 'PLN'],
            (errP, pln) => {
              if (pln) {
                db.run(
                  'UPDATE WALLET_BALANCE SET amount = amount + ? WHERE balance_id = ?',
                  [amountPln, pln.balance_id]
                );
              } else {
                db.run(
                  'INSERT INTO WALLET_BALANCE (user_id, currency_code, amount) VALUES (?, ?, ?)',
                  [userId, 'PLN', amountPln]
                );
              }

              db.run(
                `INSERT INTO TRANSACTIONS
                 (user_id, type, currency_from, currency_to, amount, rate)
                 VALUES (?, 'SELL', ?, 'PLN', ?, ?)`,
                [userId, currencyFrom, amountForeign, rate]
              );

              res.json({
                message: 'Transakcja sprzedaży zakończona sukcesem',
                rate,
                amountPln,
              });
            }
          );
        }
      );
    });
  });
});

router.post('/expense', auth, (req, res) => {
  const userId = req.user.userId;
  const category = String(req.body.category || '').trim();
  const amountPln = parsePositiveAmount(req.body.amountPln);

  if (!category || !amountPln) {
    return res.status(400).json({ message: 'Błędne dane wejściowe' });
  }

  const normalizedCategory = category.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 24);
  if (normalizedCategory.length < 2) {
    return res.status(400).json({ message: 'Niepoprawna kategoria wydatku' });
  }

  db.serialize(() => {
    db.get(
      'SELECT * FROM WALLET_BALANCE WHERE user_id = ? AND currency_code = ?',
      [userId, 'PLN'],
      (errP, pln) => {
        if (!pln || pln.amount < amountPln) {
          return res.status(400).json({ message: 'Brak wystarczających środków w PLN' });
        }

        db.run(
          'UPDATE WALLET_BALANCE SET amount = amount - ? WHERE balance_id = ?',
          [amountPln, pln.balance_id]
        );

        db.run(
          `INSERT INTO TRANSACTIONS
           (user_id, type, currency_from, currency_to, amount, rate)
           VALUES (?, 'EXPENSE', ?, 'PLN', ?, 1)`,
          [userId, normalizedCategory, amountPln],
          (errT) => {
            if (errT) return res.status(500).json({ message: 'Błąd bazy danych' });
            res.json({
              message: 'Wydatek zapisany',
              category: normalizedCategory,
              amountPln,
            });
          }
        );
      }
    );
  });
});

router.get('/history', auth, (req, res) => {
  const userId = req.user.userId;

  db.all(
    'SELECT * FROM TRANSACTIONS WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Błąd bazy danych' });
      res.json(rows);
    }
  );
});

router.delete('/:transactionId', auth, (req, res) => {
  const userId = req.user.userId;
  const transactionId = Number(req.params.transactionId);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return res.status(400).json({ message: 'Niepoprawne ID transakcji' });
  }

  db.get(
    'SELECT * FROM TRANSACTIONS WHERE transaction_id = ? AND user_id = ?',
    [transactionId, userId],
    (err, transaction) => {
      if (err) return res.status(500).json({ message: 'Błąd bazy danych' });
      if (!transaction) return res.status(404).json({ message: 'Nie znaleziono transakcji' });

      rollbackTransactionEffect(userId, transaction, (rollbackErr) => {
        if (rollbackErr) {
          return res.status(rollbackErr.status || 500).json({ message: rollbackErr.message });
        }

        db.run(
          'DELETE FROM TRANSACTIONS WHERE transaction_id = ? AND user_id = ?',
          [transactionId, userId],
          function (deleteErr) {
            if (deleteErr) return res.status(500).json({ message: 'Błąd bazy danych' });
            if (!this.changes) return res.status(404).json({ message: 'Nie znaleziono transakcji' });
            return res.json({ message: 'Transakcja została usunięta' });
          }
        );
      });
    }
  );
});

module.exports = router;
