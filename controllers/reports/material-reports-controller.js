const pool = require('../../sql-connection');

exports.generateInventoryReport = async (req, res) => {
  try {
    const { report_type, from_date, to_date } = req.body;

    if (!report_type) {
      return res.status(400).json({
        message: "report_type is required"
      });
    }

    let query = "";
    let params = [];

    switch (report_type) {
      /**
       * ==========================================================
       * CURRENT STOCK LEVELS
       * ==========================================================
       */
      case "CURRENT_STOCK":
        query = `
          SELECT
              mi.item_id,
              mi.item_name,
              mi.item_category,
              mi.size,
              mi.unit_of_measure,

              COALESCE(
                (
                  SELECT SUM(gi.quantity)
                  FROM grn_items gi
                  INNER JOIN goods_receive_notes grn
                      ON grn.id = gi.grn_no
                  WHERE gi.item_name = mi.item_name
                  AND DATE(grn.received_date) BETWEEN ? AND ?
                ),0
              )
              -
              COALESCE(
                (
                  SELECT SUM(ini.quantity)
                  FROM \`issue_note-items\` ini
                  WHERE ini.item_name = mi.item_name
                ),0
              ) AS available_qty

          FROM main_inventory mi
          ORDER BY mi.item_name;
        `;

        params = [from_date, to_date];
        break;

      /**
       * ==========================================================
       * TOTAL STOCK VALUE
       * ==========================================================
       */
      case "STOCK_VALUE":
        query = `
          SELECT
              item_id,
              item_name,
              item_category,

              CAST(quantity AS DECIMAL(10,2)) AS quantity,
              CAST(rate AS DECIMAL(10,2)) AS unit_rate,

              (CAST(quantity AS DECIMAL(10,2)) * CAST(rate AS DECIMAL(10,2))) AS stock_value

          FROM main_inventory
        `;
        params = [];
        break;

      /**
       * ==========================================================
       * STOCK AGING REPORT
       * ==========================================================
       */
      case "STOCK_AGING":
        query = `
          SELECT
              mi.item_name,

              COALESCE(
                (
                  SELECT SUM(gi.quantity)
                  FROM grn_items gi
                  WHERE gi.item_name = mi.item_name
                ),0
              )
              -
              COALESCE(
                (
                  SELECT SUM(ini.quantity)
                  FROM \`issue_note-items\` ini
                  WHERE ini.item_name = mi.item_name
                ),0
              ) AS quantity,

              (
                SELECT MAX(grn.received_date)
                FROM grn_items gi
                INNER JOIN goods_receive_notes grn
                    ON grn.id = gi.grn_no
                WHERE gi.item_name = mi.item_name
                AND DATE(grn.received_date) BETWEEN ? AND ?
              ) AS last_received_date,

              DATEDIFF(
                  CURDATE(),
                  (
                    SELECT MAX(grn.received_date)
                    FROM grn_items gi
                    INNER JOIN goods_receive_notes grn
                        ON grn.id = gi.grn_no
                    WHERE gi.item_name = mi.item_name
                  )
              ) AS age_days,

              CASE
                  WHEN DATEDIFF(
                      CURDATE(),
                      (
                        SELECT MAX(grn.received_date)
                        FROM grn_items gi
                        INNER JOIN goods_receive_notes grn
                            ON grn.id = gi.grn_no
                        WHERE gi.item_name = mi.item_name
                      )
                  ) <= 30
                  THEN '0-30 Days'

                  WHEN DATEDIFF(
                      CURDATE(),
                      (
                        SELECT MAX(grn.received_date)
                        FROM grn_items gi
                        INNER JOIN goods_receive_notes grn
                            ON grn.id = gi.grn_no
                        WHERE gi.item_name = mi.item_name
                      )
                  ) <= 60
                  THEN '31-60 Days'

                  WHEN DATEDIFF(
                      CURDATE(),
                      (
                        SELECT MAX(grn.received_date)
                        FROM grn_items gi
                        INNER JOIN goods_receive_notes grn
                            ON grn.id = gi.grn_no
                        WHERE gi.item_name = mi.item_name
                      )
                  ) <= 90
                  THEN '61-90 Days'

                  ELSE '>90 Days'
              END AS aging_bucket

          FROM main_inventory mi
          ORDER BY age_days DESC;
        `;

        params = [from_date, to_date];
        break;

      /**
       * ==========================================================
       * LOW STOCK REPORT
       * ==========================================================
       */
      case "LOW_STOCK":
        query = `
          SELECT
              mi.item_id,
              mi.item_name,
              mi.item_category,

              (
                COALESCE(
                  (
                    SELECT SUM(gi.quantity)
                    FROM grn_items gi
                    INNER JOIN goods_receive_notes grn
                        ON grn.id = gi.grn_no
                    WHERE gi.item_name = mi.item_name
                    AND DATE(grn.received_date) BETWEEN ? AND ?
                  ),0
                )
                -
                COALESCE(
                  (
                    SELECT SUM(ini.quantity)
                    FROM \`issue_note-items\` ini
                    WHERE ini.item_name = mi.item_name
                  ),0
                )
              ) AS available_qty,

              mi.reorder_level

          FROM main_inventory mi

          HAVING available_qty < CAST(mi.reorder_level AS DECIMAL(10,2))

          ORDER BY available_qty ASC;
        `;

        params = [from_date, to_date];
        break;
      /**
       * ==========================================================
       * GRN listing
       * ==========================================================
       */
      case "GRN_REPORT":
        query = `
          SELECT
              grn.id AS grn_id,
              grn.supplier_name,
              grn.received_date,
              gi.item_name,
              gi.quantity,
              gi.rate,
              gi.amount
          FROM goods_receive_notes grn
          INNER JOIN grn_items gi ON gi.grn_no = grn.id
          WHERE DATE(grn.received_date) BETWEEN ? AND ?
          ORDER BY grn.received_date DESC
        `;
        params = [from_date, to_date];
        break;
      /**
       * ==========================================================
       * Total GRN value summary
       * ==========================================================
       */
      case "GRN_VALUE":
        query = `
          SELECT
              gi.item_name,
              SUM(gi.quantity) AS total_qty,
              AVG(gi.rate) AS avg_rate,
              SUM(gi.amount) AS total_value
          FROM goods_receive_notes grn
          INNER JOIN grn_items gi ON gi.grn_no = grn.id
          WHERE DATE(grn.received_date) BETWEEN ? AND ?
          GROUP BY gi.item_name
        `;
        params = [from_date, to_date];
        break;

      case "GRN_VALUE_WEEKLY":
        query = `
          SELECT
              YEARWEEK(grn.received_date, 1) AS grn_week,
              MIN(DATE(grn.received_date)) AS week_start_date,
              MAX(DATE(grn.received_date)) AS week_end_date,
              SUM(gi.quantity) AS total_qty,
              SUM(gi.amount) AS total_value
          FROM goods_receive_notes grn
          INNER JOIN grn_items gi ON gi.grn_no = grn.id
          WHERE DATE(grn.received_date) BETWEEN ? AND ?
          GROUP BY YEARWEEK(grn.received_date, 1)
          ORDER BY grn_week ASC
        `;
        params = [from_date, to_date];
        break;

      case "GRN_VALUE_MONTHLY":
        query = `
          SELECT
              DATE_FORMAT(grn.received_date, '%Y-%m') AS grn_month,
              SUM(gi.quantity) AS total_qty,
              SUM(gi.amount) AS total_value
          FROM goods_receive_notes grn
          INNER JOIN grn_items gi ON gi.grn_no = grn.id
          WHERE DATE(grn.received_date) BETWEEN ? AND ?
          GROUP BY DATE_FORMAT(grn.received_date, '%Y-%m')
          ORDER BY grn_month ASC
        `;
        params = [from_date, to_date];
        break;
      /**
      * ==========================================================
      * Total material usage across jobs
      * ==========================================================
      */
      case "MATERIAL_CONSUMPTION_SUMMARY":
        query = `
          SELECT
              material_name,
              material_type,
              SUM(CAST(quantity AS DECIMAL(10,2))) AS total_consumed
          FROM job_materials
          WHERE status = 'ACTIVE'
          GROUP BY material_name, material_type
          ORDER BY total_consumed DESC
        `;
        params = [];
        break;
      /**
      * ==========================================================
      * Job-wise material breakdown
      * ==========================================================
      */

      case "MATERIAL_CONSUMPTION_BY_JOB":
        query = `
          SELECT
              jm.job_id,
              j.job_name,
              jm.material_name,
              jm.material_type,
              SUM(CAST(jm.quantity AS DECIMAL(10,2))) AS consumed_qty
          FROM job_materials jm
          LEFT JOIN jobs j ON j.job_id = jm.job_id
          WHERE jm.status = 'ACTIVE'
          AND j.job_open_date BETWEEN ? AND ?
          GROUP BY jm.job_id, jm.material_name, jm.material_type
          ORDER BY jm.job_id
        `;
        params = [from_date, to_date];
        break;

      default:
        return res.status(400).json({
          message:
            "Invalid report type. Supported values are CURRENT_STOCK, STOCK_VALUE, STOCK_AGING, LOW_STOCK"
        });
    }

    const [rows] = await pool.promise().query(query, params);

    // Calculate grand total only for stock value report
    if (report_type === "STOCK_VALUE") {
      const grand_total = rows.reduce(
        (sum, row) => sum + Number(row.stock_value || 0),
        0
      );

      return res.status(200).json({
        report_type,
        from_date,
        to_date,
        grand_total,
        data: rows
      });
    }

    return res.status(200).json({
      report_type,
      from_date,
      to_date,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error("Inventory report error:", error);

    return res.status(500).json({
      message: "Failed to generate report",
      error: error.message
    });
  }
};