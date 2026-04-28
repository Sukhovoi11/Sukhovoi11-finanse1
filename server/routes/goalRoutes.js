const express = require('express');
const db = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const userId = req.user.userId;
  db.all(
    'SELECT * FROM SAVINGS_GOALS WHERE user_id = ? ORDER BY created_at DESC',
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
  const targetAmount = Number(req.body.targetAmount);
  const dueDate = req.body.dueDate ? String(req.body.dueDate).trim() : null;

  if (!title || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    return res.status(400).json({ message: 'Błędne dane wejściowe' });
  }

  db.run(
    `INSERT INTO SAVINGS_GOALS (user_id, title, target_amount, due_date)
     VALUES (?, ?, ?, ?)`,
    [userId, title, targetAmount, dueDate || null],
    function (err) {
      if (err) return res.status(500).json({ message: 'Błąd bazy danych' });
      res.status(201).json({ goalId: this.lastID });
    }
  );
});

router.post('/:goalId/contribute', auth, (req, res) => {
  const userId = req.user.userId;
  const goalId = req.params.goalId;
  const amount = Number(req.body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Kwota musi być większa od 0' });
  }

  db.serialize(() => {
    db.get(
      'SELECT * FROM SAVINGS_GOALS WHERE goal_id = ? AND user_id = ?',
      [goalId, userId],
      (errG, goal) => {
        if (errG || !goal) return res.status(404).json({ message: 'Nie znaleziono celu' });

        db.get(
          'SELECT * FROM WALLET_BALANCE WHERE user_id = ? AND currency_code = ?',
          [userId, 'PLN'],
          (errP, pln) => {
            if (!pln || pln.amount < amount) {
              return res.status(400).json({ message: 'Brak wystarczających środków w PLN' });
            }

            db.run(
              'UPDATE WALLET_BALANCE SET amount = amount - ? WHERE balance_id = ?',
              [amount, pln.balance_id]
            );

            db.run(
              'UPDATE SAVINGS_GOALS SET saved_amount = saved_amount + ? WHERE goal_id = ?',
              [amount, goal.goal_id],
              (errU) => {
                if (errU) return res.status(500).json({ message: 'Błąd bazy danych' });

                db.run(
                  `INSERT INTO TRANSACTIONS
                   (user_id, type, currency_from, currency_to, amount, rate)
                   VALUES (?, 'SAVING', 'PLN', ?, ?, 1)`,
                  [userId, goal.title, amount],
                  (errT) => {
                    if (errT) return res.status(500).json({ message: 'Błąd zapisu historii' });
                    res.json({ message: 'Środki odłożone', savedAmount: goal.saved_amount + amount });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

router.delete('/:goalId', auth, (req, res) => {
  const userId = req.user.userId;
  const goalId = Number(req.params.goalId);

  if (!Number.isInteger(goalId) || goalId <= 0) {
    return res.status(400).json({ message: 'Niepoprawne ID celu' });
  }

  db.get(
    'SELECT goal_id, saved_amount FROM SAVINGS_GOALS WHERE goal_id = ? AND user_id = ?',
    [goalId, userId],
    (findErr, goal) => {
      if (findErr) return res.status(500).json({ message: 'Błąd bazy danych' });
      if (!goal) return res.status(404).json({ message: 'Nie znaleziono celu' });

      const savedAmount = Number(goal.saved_amount || 0);

      const deleteGoal = () => {
        db.run(
          'DELETE FROM SAVINGS_GOALS WHERE goal_id = ? AND user_id = ?',
          [goalId, userId],
          function (deleteErr) {
            if (deleteErr) return res.status(500).json({ message: 'Błąd bazy danych' });
            if (!this.changes) return res.status(404).json({ message: 'Nie znaleziono celu' });
            return res.json({ message: 'Cel został usunięty', refundedAmount: savedAmount });
          }
        );
      };

      if (!Number.isFinite(savedAmount) || savedAmount <= 0) {
        return deleteGoal();
      }

      db.get(
        'SELECT balance_id, amount FROM WALLET_BALANCE WHERE user_id = ? AND currency_code = ?',
        [userId, 'PLN'],
        (walletErr, wallet) => {
          if (walletErr) return res.status(500).json({ message: 'Błąd bazy danych' });

          if (wallet) {
            db.run(
              'UPDATE WALLET_BALANCE SET amount = ? WHERE balance_id = ?',
              [Number(wallet.amount || 0) + savedAmount, wallet.balance_id],
              (updateErr) => {
                if (updateErr) return res.status(500).json({ message: 'Błąd bazy danych' });
                return deleteGoal();
              }
            );
            return;
          }

          db.run(
            'INSERT INTO WALLET_BALANCE (user_id, currency_code, amount) VALUES (?, ?, ?)',
            [userId, 'PLN', savedAmount],
            (insertErr) => {
              if (insertErr) return res.status(500).json({ message: 'Błąd bazy danych' });
              return deleteGoal();
            }
          );
        }
      );
    }
  );
});

module.exports = router;
