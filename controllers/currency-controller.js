const pool = require('../sql-connection');

exports.getCurrencyRate = async (req, res) => {
  try {
    const query = `SELECT rate FROM currency_conversion WHERE currency_from = 'USD' AND currency_to = 'LKR' LIMIT 1`;
    const [rows] = await pool.promise().query(query);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Currency rate not found" });
    }

    return res.status(200).json({ rate: rows[0].rate });
  } catch (error) {
    console.error("Error fetching currency rate:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateCurrencyRate = async (req, res) => {
  try {
    const { rate } = req.body;

    if (!rate) {
      return res.status(400).json({ message: "Rate is required" });
    }

    const query = `UPDATE currency_conversion SET rate = ? WHERE currency_from = 'USD' AND currency_to = 'LKR'`;
    const [result] = await pool.promise().query(query, [rate]);

    if (result.affectedRows === 0) {
        // Fallback if not exists
        const insertQuery = `INSERT INTO currency_conversion (currency_from, currency_to, rate) VALUES ('USD', 'LKR', ?)`;
        await pool.promise().query(insertQuery, [rate]);
    }

    return res.status(200).json({ message: "Currency rate updated successfully" });
  } catch (error) {
    console.error("Error updating currency rate:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
