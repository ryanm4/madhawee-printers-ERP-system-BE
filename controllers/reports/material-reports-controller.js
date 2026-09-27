const pool = require('../../sql-connection');

exports.generateInventoryReport = async (req, res) => {
  try {
    const { report_type, from_date, to_date, item_category, item_sub_category, supplier_name, item_id, job_id } = req.body;

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
        let currentStockWhere = "WHERE 1=1";
        params = [from_date, to_date];
        if (item_category && item_category !== "ALL") {
          currentStockWhere += " AND mi.item_category = ?";
          params.push(item_category);
        }
        if (item_sub_category && item_sub_category !== "ALL") {
          currentStockWhere += " AND mi.item_sub_category = ?";
          params.push(item_sub_category);
        }

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
          ${currentStockWhere}
          ORDER BY mi.item_name;
        `;
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
              CAST(unit_price AS DECIMAL(10,2)) AS unit_rate,

              CAST((CAST(quantity AS DECIMAL(10,2)) * CAST(unit_price AS DECIMAL(10,2))) AS DECIMAL(15,2)) AS stock_value

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
        let agingWhere = "WHERE 1=1";
        params = [];
        if (item_category && item_category !== "ALL") {
          agingWhere += " AND mi.item_category = ?";
          params.push(item_category);
        }
        if (item_sub_category && item_sub_category !== "ALL") {
          agingWhere += " AND mi.item_sub_category = ?";
          params.push(item_sub_category);
        }

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
          ${agingWhere}
          ORDER BY age_days DESC;
        `;
        break;

      /**
       * ==========================================================
       * LOW STOCK REPORT
       * ==========================================================
       */
      case "LOW_STOCK":
        let lowStockWhere = "WHERE 1=1";
        params = [];
        if (item_category && item_category !== "ALL") {
          lowStockWhere += " AND mi.item_category = ?";
          params.push(item_category);
        }
        if (item_sub_category && item_sub_category !== "ALL") {
          lowStockWhere += " AND mi.item_sub_category = ?";
          params.push(item_sub_category);
        }

        query = `
          SELECT
              mi.item_category,
              mi.item_sub_category,
              mi.item_name,
              mi.size,
              mi.item_id,
              CAST(mi.quantity AS DECIMAL(10,2)) AS available_qty,
              mi.reorder_level

          FROM main_inventory mi
          ${lowStockWhere}
          HAVING available_qty < CAST(mi.reorder_level AS DECIMAL(10,2))

          ORDER BY available_qty ASC;
        `;
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
        if (item_category && item_category !== "ALL") {
          grnWhereClause += " AND mi.item_category = ?";
          params.push(item_category);
        }
        if (item_sub_category && item_sub_category !== "ALL") {
          grnWhereClause += " AND mi.item_sub_category = ?";
          params.push(item_sub_category);
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
              CAST(mi.unit_price AS DECIMAL(10,2)) AS rate,
              CAST((gi.quantity * mi.unit_price) AS DECIMAL(15,2)) AS amount
          FROM goods_receive_notes grn
          INNER JOIN grn_items gi ON gi.grn_no = grn.id
          LEFT JOIN main_inventory mi ON mi.item_id = gi.item_id
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
              AVG(mi.unit_price) AS avg_rate,
              SUM(gi.quantity * mi.unit_price) AS total_value
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
      * Total material usage across jobs (with job breakdown)
      * ==========================================================
      */
      case "MATERIAL_CONSUMPTION_SUMMARY":
        let matSummaryWhere = "WHERE DATE(in_h.date) BETWEEN ? AND ?";
        params = [from_date, to_date];

        if (item_id && item_id !== "ALL") {
          matSummaryWhere += " AND mi.item_id = ?";
          params.push(item_id);
        }
        if (item_category && item_category !== "ALL") {
          matSummaryWhere += " AND mi.item_category = ?";
          params.push(item_category);
        }
        if (item_sub_category && item_sub_category !== "ALL") {
          matSummaryWhere += " AND mi.item_sub_category = ?";
          params.push(item_sub_category);
        }

        query = `
          SELECT
              mi.item_id,
              mi.item_category,
              mi.item_sub_category,
              COALESCE(mi.item_name, ini.item_name) AS item_name,
              mi.size,
              mi.unit_of_measure AS uom,
              in_h.job_id,
              COALESCE(j.job_number, IF(in_h.job_id IS NOT NULL, CONCAT('MPL/', LPAD(in_h.job_id, 4, '0'), '/26/TIEP'), '-')) AS job_number,
              j.job_name,
              IF(in_h.id IS NOT NULL, CONCAT('ISN/', LPAD(in_h.id, 4, '0')), '-') AS issue_note_no,
              DATE_FORMAT(in_h.date, '%Y-%m-%d') AS issue_date,
              CAST(SUM(CAST(ini.quantity AS DECIMAL(10,2))) AS DECIMAL(10,2)) AS consumed_qty,
              CAST(
                COALESCE(
                  NULLIF(CAST(mi.unit_price AS DECIMAL(10,2)), 0),
                  NULLIF(CAST(mi.rate AS DECIMAL(10,2)), 0),
                  (SELECT gi.rate FROM grn_items gi WHERE (gi.item_id = mi.item_id OR (gi.item_name IS NOT NULL AND gi.item_name = mi.item_name)) AND gi.rate > 0 ORDER BY gi.id DESC LIMIT 1),
                  (SELECT poi.unit_price FROM po_items_details poi WHERE (poi.item_id = mi.item_id OR (poi.item_name IS NOT NULL AND poi.item_name = mi.item_name)) AND poi.unit_price > 0 ORDER BY poi.id DESC LIMIT 1),
                  0
                ) AS DECIMAL(10,2)
              ) AS unit_rate
          FROM \`issue_note-items\` ini
          LEFT JOIN \`issue-notes\` in_h ON in_h.id = ini.issue_note_id
          LEFT JOIN jobs j ON j.job_id = in_h.job_id
          LEFT JOIN main_inventory mi ON mi.item_id = ini.item_id OR (ini.item_id IS NULL AND mi.item_name = ini.item_name)
          ${matSummaryWhere}
          GROUP BY mi.item_id, mi.item_category, mi.item_sub_category, mi.item_name, ini.item_name, mi.size, mi.unit_of_measure, mi.unit_price, mi.rate, in_h.job_id, j.job_number, j.job_name, in_h.id, DATE(in_h.date)
          ORDER BY item_name ASC, consumed_qty DESC
        `;
        break;

      /**
      * ==========================================================
      * Job-wise material breakdown
      * ==========================================================
      */
      case "MATERIAL_CONSUMPTION_BY_JOB":
        let matByJobWhere = "WHERE DATE(in_h.date) BETWEEN ? AND ?";
        params = [from_date, to_date];

        if (job_id && job_id !== "ALL") {
          matByJobWhere += " AND in_h.job_id = ?";
          params.push(job_id);
        }
        if (item_category && item_category !== "ALL") {
          matByJobWhere += " AND mi.item_category = ?";
          params.push(item_category);
        }
        if (item_sub_category && item_sub_category !== "ALL") {
          matByJobWhere += " AND mi.item_sub_category = ?";
          params.push(item_sub_category);
        }

        query = `
          SELECT
              in_h.job_id,
              COALESCE(j.job_number, CONCAT('MPL/', LPAD(in_h.job_id, 4, '0'), '/26/TIEP')) AS job_number,
              j.job_name,
              mi.item_category,
              mi.item_sub_category,
              COALESCE(mi.item_name, ini.item_name) AS item_name,
              mi.size,
              '' AS material_type,
              CAST(SUM(CAST(ini.quantity AS DECIMAL(10,2))) AS DECIMAL(10,2)) AS total_consumed,
              CAST(
                COALESCE(
                  NULLIF(CAST(mi.unit_price AS DECIMAL(10,2)), 0),
                  NULLIF(CAST(mi.rate AS DECIMAL(10,2)), 0),
                  (SELECT gi.rate FROM grn_items gi WHERE (gi.item_id = mi.item_id OR (gi.item_name IS NOT NULL AND gi.item_name = mi.item_name)) AND gi.rate > 0 ORDER BY gi.id DESC LIMIT 1),
                  (SELECT poi.unit_price FROM po_items_details poi WHERE (poi.item_id = mi.item_id OR (poi.item_name IS NOT NULL AND poi.item_name = mi.item_name)) AND poi.unit_price > 0 ORDER BY poi.id DESC LIMIT 1),
                  0
                ) AS DECIMAL(10,2)
              ) AS unit_rate
          FROM \`issue_note-items\` ini
          LEFT JOIN \`issue-notes\` in_h ON in_h.id = ini.issue_note_id
          LEFT JOIN jobs j ON j.job_id = in_h.job_id
          LEFT JOIN main_inventory mi ON mi.item_id = ini.item_id OR (ini.item_id IS NULL AND mi.item_name = ini.item_name)
          ${matByJobWhere}
          GROUP BY in_h.job_id, j.job_number, j.job_name, mi.item_category, mi.item_sub_category, mi.item_name, ini.item_name, mi.size, mi.unit_price, mi.rate
          ORDER BY total_consumed DESC
        `;
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

      const formattedRows = [...rows];
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
        amount: grand_total
      });
      
      return res.status(200).json({ data: formattedRows });
    } else if (report_type === "MATERIAL_CONSUMPTION_SUMMARY") {
        const itemMap = new Map();

        rows.forEach(row => {
          const itemKey = `${row.item_category || ''}||${row.item_sub_category || ''}||${row.item_name || ''}||${row.size || ''}`;
          
          if (!itemMap.has(itemKey)) {
            itemMap.set(itemKey, {
              item_id: row.item_id,
              item_category: row.item_category || "",
              item_sub_category: row.item_sub_category || "",
              item_name: row.item_name || "",
              size: row.size || "",
              uom: row.uom || "-",
              unit_rate_raw: Number(row.unit_rate || 0),
              total_consumed_num: 0,
              total_value_num: 0,
              jobs: []
            });
          }

          const itemGroup = itemMap.get(itemKey);
          const cQty = Number(row.consumed_qty || 0);
          const uRate = Number(row.unit_rate || 0);
          const tVal = cQty * uRate;

          if (!itemGroup.unit_rate_raw && uRate > 0) {
            itemGroup.unit_rate_raw = uRate;
          }

          itemGroup.total_consumed_num += cQty;
          itemGroup.total_value_num += tVal;

          if (row.job_id || row.job_number || (row.job_name && row.job_name !== "-")) {
            itemGroup.jobs.push({
              job_id: row.job_id,
              job_number: row.job_number || "-",
              job_name: row.job_name || "-",
              issue_note_no: row.issue_note_no || "-",
              issue_date: row.issue_date || "-",
              consumed_qty: cQty,
              unit_rate: uRate ? formatCurrency(uRate) : "LKR 0.00",
              total_value: formatCurrency(tVal)
            });
          }
        });

        const formattedRows = Array.from(itemMap.values()).map(item => ({
          item_category: item.item_category,
          item_sub_category: item.item_sub_category,
          item_name: item.item_name,
          size: item.size,
          uom: item.uom,
          total_consumed: item.total_consumed_num,
          unit_rate: item.unit_rate_raw ? formatCurrency(item.unit_rate_raw) : "LKR 0.00",
          total_value: formatCurrency(item.total_value_num),
          jobs: item.jobs
        }));

        const total_value = formattedRows.reduce(
          (sum, row) => sum + (typeof row.total_value === 'string' ? parseFloat(row.total_value.replace(/[^0-9.-]/g, '')) || 0 : Number(row.total_value || 0)),
          0
        );
        const total_consumed = formattedRows.reduce((sum, row) => sum + Number(row.total_consumed || 0), 0);

        formattedRows.push({
          item_category: "TOTAL",
          item_sub_category: "",
          item_name: `Total Items: ${formattedRows.length}`,
          size: "",
          uom: "",
          total_consumed: total_consumed,
          unit_rate: "",
          total_value: formatCurrency(total_value),
          jobs: []
        });

        return res.status(200).json({ data: formattedRows });
      } else if (report_type === "MATERIAL_CONSUMPTION_BY_JOB") {
        const formattedRows = rows.map(row => {
          const cQty = Number(row.total_consumed || row.consumed_qty || 0);
          const uRate = Number(row.unit_rate || 0);
          const tVal = cQty * uRate;
          return {
            job_id: row.job_id,
            job_number: row.job_number,
            job_name: row.job_name,
            item_category: row.item_category || "",
            item_sub_category: row.item_sub_category || "",
            item_name: row.item_name || "",
            size: row.size || "",
            total_consumed: cQty,
            unit_rate: uRate ? formatCurrency(uRate) : "LKR 0.00",
            total_value: formatCurrency(tVal)
          };
        });

        const total_value = formattedRows.reduce(
          (sum, row) => sum + (typeof row.total_value === 'string' ? parseFloat(row.total_value.replace(/[^0-9.-]/g, '')) || 0 : Number(row.total_value || 0)),
          0
        );

        formattedRows.push({
          job_id: "TOTAL",
          job_number: "TOTAL",
          job_name: "",
          item_category: "",
          item_sub_category: "",
          item_name: "",
          size: "",
          total_consumed: null,
          unit_rate: null,
          total_value: formatCurrency(total_value)
        });

        return res.status(200).json({ data: formattedRows });
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