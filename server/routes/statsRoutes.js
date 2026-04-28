const express = require('express');
const db = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/leaderboard', auth, (req, res) => {
  const metric = String(req.query.metric || 'expenses').toLowerCase();
  const orderColumn = metric === 'income' ? 'totalIncome' : 'totalExpenses';

  const sql = `
    SELECT
      u.user_id AS userId,
      COALESCE(NULLIF(trim(u.username), ''), 'user') AS username,
      COALESCE(NULLIF(trim(u.display_name), ''), COALESCE(NULLIF(trim(u.username), ''), 'user')) AS displayName,
      ROUND(COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0), 2) AS totalExpenses,
      ROUND(COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0), 2) AS totalIncome,
      COUNT(t.transaction_id) AS operationsCount,
      COALESCE((
        SELECT tt.currency_from
        FROM TRANSACTIONS tt
        WHERE tt.user_id = u.user_id
          AND tt.type = 'EXPENSE'
          AND tt.currency_from IS NOT NULL
          AND trim(tt.currency_from) <> ''
        GROUP BY tt.currency_from
        ORDER BY SUM(tt.amount) DESC, COUNT(*) DESC, tt.currency_from ASC
        LIMIT 1
      ), '-') AS topExpenseCategory
    FROM USERS u
    LEFT JOIN TRANSACTIONS t ON t.user_id = u.user_id
    GROUP BY u.user_id
    HAVING COUNT(t.transaction_id) > 0
    ORDER BY ${orderColumn} DESC, operationsCount DESC, username ASC
    LIMIT 100
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Blad bazy danych' });
    }

    const leaderboard = (rows || []).map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      username: String(row.username || 'user').toLowerCase(),
      displayName: row.displayName || row.username || 'user',
      totalExpenses: Number(row.totalExpenses || 0),
      totalIncome: Number(row.totalIncome || 0),
      operationsCount: Number(row.operationsCount || 0),
      topExpenseCategory: row.topExpenseCategory || '-',
    }));

    return res.json({ metric: orderColumn === 'totalIncome' ? 'income' : 'expenses', leaderboard });
  });
});

module.exports = router;
