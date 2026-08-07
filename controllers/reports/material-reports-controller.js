const pool = require('../../sql-connection');

exports.generateInventoryReport = async (req, res) => {
  try {
    const { report_type, from_date, to_date, item_category, item_sub_category, supplier_name, item_id } = req.body;

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
              mi.item_category,
              mi.item_sub_category,
              mi.item_name,
              mi.size,
              mi.item_id,
              mi.unit_of_measure,

              COALESCE(
                (
                  SELECT SUM(gi.quantity)
                  FROM grn_items gi
                  INNER JOIN goods_receive_notes grn
                      ON grn.id = gi.grn_no
                  WHERE gi.item_id = mi.item_id
                  AND DATE(grn.received_date) BETWEEN ? AND ?
                ),0
              )
              -
              COALESCE(
                (
                  SELECT SUM(ini.quantity)
                  FROM \`issue_note-items\` ini
                  WHERE ini.item_id = mi.item_id
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
        let stockWhereClause = "WHERE 1=1";
        if (item_category && item_category !== "ALL") {
          stockWhereClause += " AND item_category = ?";
          params.push(item_category);
        }
        if (item_sub_category && item_sub_category !== "ALL") {
          stockWhereClause += " AND item_sub_category = ?";
          params.push(item_sub_category);
        }

        query = `
          SELECT
              item_category,
              item_sub_category,
              item_name,
              size,

              CAST(quantity AS DECIMAL(10,2)) AS quantity,
              CAST(rate AS DECIMAL(10,2)) AS unit_rate,

              CAST((CAST(quantity AS DECIMAL(10,2)) * CAST(rate AS DECIMAL(10,2))) AS DECIMAL(15,2)) AS stock_value

          FROM main_inventory
          ${stockWhereClause}
        `;
        break;

      /**
       * ==========================================================
       * STOCK AGING REPORT
       * ==========================================================
       */
      case "STOCK_AGING":
        query = `
          SELECT
              mi.item_category,
              mi.item_sub_category,
              mi.item_name,
              mi.size,

              COALESCE(
                (
                  SELECT SUM(gi.quantity)
                  FROM grn_items gi
                  WHERE gi.item_id = mi.item_id
                ),0
              )
              -
              COALESCE(
                (
                  SELECT SUM(ini.quantity)
                  FROM \`issue_note-items\` ini
                  WHERE ini.item_id = mi.item_id
                ),0
              ) AS quantity,

              (
                SELECT MAX(grn.received_date)
                FROM grn_items gi
                INNER JOIN goods_receive_notes grn
                    ON grn.id = gi.grn_no
                WHERE gi.item_id = mi.item_id
              ) AS last_received_date,

              DATEDIFF(
                  CURDATE(),
                  (
                    SELECT MAX(grn.received_date)
                    FROM grn_items gi
                    INNER JOIN goods_receive_notes grn
                        ON grn.id = gi.grn_no
                    WHERE gi.item_id = mi.item_id
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
                        WHERE gi.item_id = mi.item_id
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
                        WHERE gi.item_id = mi.item_id
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
                        WHERE gi.item_id = mi.item_id
                      )
                  ) <= 90
                  THEN '61-90 Days'

                  ELSE '>90 Days'
              END AS aging_bucket

          FROM main_inventory mi
          ORDER BY age_days DESC;
        `;

        params = [];
        break;

      /**
       * ==========================================================
       * LOW STOCK REPORT
       * ==========================================================
       */
      case "LOW_STOCK":
        query = `
          SELECT
              mi.item_category,
              mi.item_sub_category,
              mi.item_name,
              mi.size,
              mi.item_id,

              (
                COALESCE(
                  (
                    SELECT SUM(gi.quantity)
                    FROM grn_items gi
                    INNER JOIN goods_receive_notes grn
                        ON grn.id = gi.grn_no
                    WHERE gi.item_id = mi.item_id
                  ),0
                )
                -
                COALESCE(
                  (
                    SELECT SUM(ini.quantity)
                    FROM \`issue_note-items\` ini
                    WHERE ini.item_id = mi.item_id
                  ),0
                )
              ) AS available_qty,

              mi.reorder_level

          FROM main_inventory mi

          HAVING available_qty < CAST(mi.reorder_level AS DECIMAL(10,2))

          ORDER BY available_qty ASC;
        `;

        params = [];
        break;
      /**
       * ==========================================================
       * GRN listing
       * ==========================================================
       */
      case "GRN_REPORT":
        let grnWhereClause = "WHERE DATE(grn.received_date) BETWEEN ? AND ?";
        params = [from_date, to_date];
        if (supplier_name && supplier_name !== "ALL") {
          grnWhereClause += " AND grn.supplier_name = ?";
          params.push(supplier_name);
        }
        query = `
          SELECT
              grn.id AS grn_id,
              grn.supplier_name,
              grn.received_date,
              mi.item_category,
              mi.item_sub_category,
              gi.item_name,
              mi.size,
              CAST(gi.quantity AS DECIMAL(10,2)) AS quantity,
              CAST(gi.rate AS DECIMAL(10,2)) AS rate,
              CAST(gi.amount AS DECIMAL(15,2)) AS amount
          FROM goods_receive_notes grn
          INNER JOIN grn_items gi ON gi.grn_no = grn.id
          LEFT JOIN main_inventory mi ON mi.item_name = gi.item_name
          ${grnWhereClause}
          ORDER BY grn.received_date DESC
        `;
        break;
      /**
       * ==========================================================
       * Total GRN value summary
       * ==========================================================
       */
      case "GRN_VALUE":
        query = `
          SELECT
              mi.item_category,
              mi.item_sub_category,
              gi.item_name,
              mi.size,
              SUM(gi.quantity) AS total_qty,
              AVG(gi.rate) AS avg_rate,
              SUM(gi.amount) AS total_value
          FROM goods_receive_notes grn
          INNER JOIN grn_items gi ON gi.grn_no = grn.id
          LEFT JOIN main_inventory mi ON mi.item_name = gi.item_name
          WHERE DATE(grn.received_date) BETWEEN ? AND ?
          GROUP BY mi.item_category, mi.item_sub_category, gi.item_name, mi.size
        `;
        params = [from_date, to_date];
        break;


      /**
      * ==========================================================
      * Total material usage across jobs
      * ==========================================================
      */
      case "MATERIAL_CONSUMPTION_SUMMARY":
        let matSummaryWhere = "WHERE jm.status = 'ACTIVE' AND DATE(j.job_open_date) BETWEEN ? AND ?";
        params = [from_date, to_date];

        if (item_id && item_id !== "ALL") {
          matSummaryWhere += " AND mi.item_id = ?";
          params.push(item_id);
        }

        query = `
          SELECT
              mi.item_category,
              mi.item_sub_category,
              jm.material_name AS item_name,
              mi.size,
              jm.material_type,
              CAST(SUM(CAST(jm.quantity AS DECIMAL(10,2))) AS DECIMAL(10,2)) AS total_consumed,
              CAST(mi.rate AS DECIMAL(10,2)) AS unit_rate,
              CAST((SUM(CAST(jm.quantity AS DECIMAL(10,2))) * CAST(mi.rate AS DECIMAL(10,2))) AS DECIMAL(15,2)) AS total_value
          FROM job_materials jm
          LEFT JOIN jobs j ON j.job_id = jm.job_id
          LEFT JOIN main_inventory mi ON mi.item_id = jm.item_id
          ${matSummaryWhere}
          GROUP BY mi.item_category, mi.item_sub_category, jm.material_name, mi.size, jm.material_type, mi.rate
          ORDER BY total_consumed DESC
        `;
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
              mi.item_category,
              mi.item_sub_category,
              jm.material_name AS item_name,
              mi.size,
              jm.material_type,
              SUM(CAST(jm.quantity AS DECIMAL(10,2))) AS consumed_qty
          FROM job_materials jm
          LEFT JOIN jobs j ON j.job_id = jm.job_id
          LEFT JOIN main_inventory mi ON mi.item_name = jm.material_name
          WHERE jm.status = 'ACTIVE'
          AND j.job_open_date BETWEEN ? AND ?
          GROUP BY jm.job_id, mi.item_category, mi.item_sub_category, jm.material_name, mi.size, jm.material_type
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

    const formatCurrency = (val) => {
      let parts = Number(val).toFixed(2).split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return `LKR ${parts.join(".")}`;
    };

    // Calculate grand total only for stock value report
    if (report_type === "STOCK_VALUE") {
      const grand_total = rows.reduce(
        (sum, row) => sum + Number(row.stock_value || 0),
        0
      );

      const formattedRows = rows.map(row => ({
        ...row,
        unit_rate: row.unit_rate ? formatCurrency(row.unit_rate) : "LKR 0.00",
        stock_value: row.stock_value ? formatCurrency(row.stock_value) : "LKR 0.00"
      }));

      // Append Total Row for Table and Export
      formattedRows.push({
        item_category: "TOTAL",
        item_sub_category: "",
        item_name: "",
        size: "",
        quantity: null,
        unit_rate: null,
        stock_value: formatCurrency(grand_total)
      });

      return res.status(200).json({ data: formattedRows, grand_total: formatCurrency(grand_total) });
    } else if (report_type === "GRN_REPORT") {
      const grand_total = rows.reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0
      );

      const formattedRows = rows.map(row => ({
        ...row,
        rate: row.rate ? formatCurrency(row.rate) : "LKR 0.00",
        amount: row.amount ? formatCurrency(row.amount) : "LKR 0.00"
      }));

      formattedRows.push({
        grn_id: "TOTAL",
        supplier_name: "",
        received_date: "",
        item_category: "",
        item_sub_category: "",
        item_name: "",
        size: "",
        quantity: null,
        rate: null,
        amount: formatCurrency(grand_total)
      });

      return res.status(200).json({ data: formattedRows, grand_total: formatCurrency(grand_total) });
    } else if (report_type === "MATERIAL_CONSUMPTION_SUMMARY") {
      const grand_total = rows.reduce(
        (sum, row) => sum + Number(row.total_value || 0),
        0
      );

      const formattedRows = rows.map(row => ({
        item_name: row.size ? `${row.item_sub_category || ''} ${row.item_name} (${row.size})` : `${row.item_sub_category || ''} ${row.item_name}`,
        total_consumed: row.total_consumed,
        unit_rate: row.unit_rate ? formatCurrency(row.unit_rate) : "LKR 0.00",
        total_value: row.total_value ? formatCurrency(row.total_value) : "LKR 0.00"
      }));

      // Append Total Row
      formattedRows.push({
        item_name: "TOTAL",
        total_consumed: null,
        unit_rate: null,
        total_value: formatCurrency(grand_total)
      });

      return res.status(200).json({ data: formattedRows, grand_total: formatCurrency(grand_total) });
    } else if (report_type === "STOCK_AGING") {
      const formattedRows = rows.map(row => ({
        ...row,
        last_received_date: row.last_received_date ? new Date(row.last_received_date).toLocaleDateString() : "No GRN History",
        age_days: row.age_days !== null ? row.age_days : "N/A"
      }));
      return res.status(200).json({ data: formattedRows });
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