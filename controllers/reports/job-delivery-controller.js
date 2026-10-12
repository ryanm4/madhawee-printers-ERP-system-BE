const pool = require("../../sql-connection");

/**
 * Job Delivery Summary: each job's ordered quantity against everything dispatched for it so far,
 * for jobs opened in the date range that are not completed yet. Rows come sorted by customer so
 * the report can group them.
 *
 * Body: { filters: { fromDate, toDate, customer_id?, job_name? } }
 */
exports.getJobDeliverySummary = async (req, res) => {
  const { fromDate, toDate, customer_id, job_name } = req.body.filters || req.body || {};

  if (!fromDate || !toDate) {
    return res.status(400).json({ message: "fromDate and toDate are required" });
  }

  // Completed jobs are fully delivered, so only the ones still open are listed
  const conditions = ["j.job_open_date BETWEEN ? AND ?", "(j.status IS NULL OR UPPER(TRIM(j.status)) <> 'COMPLETED')"];
  const params = [fromDate, toDate];

  if (customer_id) {
    conditions.push("j.customer_id = ?");
    params.push(String(customer_id));
  }
  if (job_name && String(job_name).trim()) {
    conditions.push("j.job_name LIKE ?");
    params.push(`%${String(job_name).trim()}%`);
  }

  const query = `
    SELECT
      j.job_id,
      j.job_number,
      DATE_FORMAT(j.job_open_date, '%Y-%m-%d') AS job_open_date,
      j.customer_id,
      COALESCE(c.company_name, 'No customer') AS customer_name,
      j.job_name,
      COALESCE(j.quantity, 0) AS order_qty,
      COALESCE(d.delivered_qty, 0) AS delivery_qty
    FROM jobs j
    LEFT JOIN customers c ON c.customer_id = j.customer_id
    LEFT JOIN (
      SELECT job_id, SUM(CAST(REPLACE(dispatch_qty, ',', '') AS DECIMAL(15, 2))) AS delivered_qty
      FROM dispatch
      WHERE dispatch_qty IS NOT NULL AND dispatch_qty <> ''
      GROUP BY job_id
    ) d ON d.job_id = j.job_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY customer_name, j.job_open_date, j.job_number
  `;

  try {
    const [rows] = await pool.promise().query(query, params);
    const data = rows.map((row) => {
      const order = Number(row.order_qty) || 0;
      const delivered = Number(row.delivery_qty) || 0;
      return { ...row, order_qty: order, delivery_qty: delivered, balance_qty: order - delivered };
    });
    return res.status(200).json({ data });
  } catch (error) {
    console.error("Error generating job delivery summary:", error);
    return res.status(500).json({ message: "Failed to generate the job delivery summary" });
  }
};
