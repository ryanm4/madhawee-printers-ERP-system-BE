const pool = require('../../sql-connection');

// Helper to convert callback to promise
const queryAsync = (sql, params) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

exports.generateReport = async (req, res) => {
  try {
    const { reportType, filters = {} } = req.body;

    let query = '';
    let params = [];
    let baseAlias = null;

    // Map report types to date columns
    const dateColumns = {
      QUOTATION_SUMMARY: 'q.created_on',
      QUOTE_TO_PO_CONVERSION: 'q.created_on',
      JOB_PRODUCTION: 'j.job_open_date',
      INVENTORY_HEALTH: null,
      DISPATCH_INSIGHTS: 'd.dispatch_date',
    };

    const dateColumn = dateColumns[reportType] || null;

    switch (reportType) {
      case 'QUOTATION_SUMMARY':
        baseAlias = 'q';
        query = `
          SELECT 
            q.status,
            COUNT(*) AS total_quotes,
            SUM(CAST(q.net_total AS DECIMAL(15,2))) AS total_value,
            MIN(q.created_on) AS first_quote,
            MAX(q.created_on) AS last_quote
          FROM quotations q
          WHERE 1=1
        `;
        break;

      case 'QUOTE_TO_PO_CONVERSION':
        baseAlias = 'q';
        query = `
          SELECT 
            COUNT(DISTINCT q.quote_id) AS total_quotes,
            COUNT(DISTINCT po.po_id) AS converted_pos
          FROM quotations q
          LEFT JOIN purchase_orders po ON po.quote_id = q.quote_id
          WHERE 1=1
        `;
        break;

      case 'JOB_PRODUCTION':
        baseAlias = 'j';
        query = `
          SELECT 
            j.job_id,
            j.job_name,
            j.quantity,
            j.completed_qty,
            j.wastage,
            j.status,
            j.job_open_date
          FROM jobs j
          WHERE 1=1
        `;
        break;

      case 'INVENTORY_HEALTH':
        query = `
          SELECT 
            item_name,
            CAST(quantity AS DECIMAL(15,2)) AS quantity,
            CAST(reorder_level AS DECIMAL(15,2)) AS reorder_level,
            (CAST(quantity AS DECIMAL(15,2)) < CAST(reorder_level AS DECIMAL(15,2))) AS below_reorder
          FROM main_inventory
          WHERE 1=1
        `;
        break;

      case 'DISPATCH_INSIGHTS':
        baseAlias = 'd';
        query = `
          SELECT
            d.dispatch_id,
            d.dispatch_date,
            d.status,
            CAST(d.dispatch_qty AS DECIMAL(15,2)) AS dispatch_qty,
            CAST(d.no_of_bundles AS DECIMAL(15,2)) AS no_of_bundles,
            j.job_id,
            j.job_name,
            c.customer_id,
            c.company_name
          FROM dispatch d
          LEFT JOIN jobs j ON j.job_id = d.job_id
          LEFT JOIN customers c ON c.customer_id = d.customer_id
          WHERE 1=1
        `;
        break;

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    /* -------------------- DATE FILTERS -------------------- */
    if (dateColumn && filters.fromDate) {
      query += ` AND ${dateColumn} >= ?`;
      params.push(filters.fromDate);
    }
    if (dateColumn && filters.toDate) {
      query += ` AND ${dateColumn} <= ?`;
      params.push(filters.toDate);
    }

    /* -------------------- CUSTOMER FILTER -------------------- */
    if (filters.customer_id) {
      if (reportType === 'DISPATCH_INSIGHTS') {
        query += ` AND d.customer_id = ?`;
      } else if (['JOB_PRODUCTION', 'QUOTATION_SUMMARY', 'QUOTE_TO_PO_CONVERSION'].includes(reportType)) {
        query += ` AND ${baseAlias}.customer_id = ?`;
      }
      params.push(filters.customer_id);
    }

    /* -------------------- STATUS FILTER -------------------- */
    if (filters.status && baseAlias) {
      query += ` AND ${baseAlias}.status = ?`;
      params.push(filters.status);
    }

    /* -------------------- GROUP BY & ORDER BY for aggregates -------------------- */
    if (reportType === 'QUOTATION_SUMMARY') {
      query += `
        GROUP BY q.status
        ORDER BY first_quote
      `;
    }

    /* -------------------- EXECUTE -------------------- */
    const rows = await queryAsync(query, params);

    res.json({
      reportType,
      filters,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      message: 'Report generation failed',
      error: error.message,
    });
  }
};




exports.getDashboardInsights = (req, res) => {
  const { dateFrom, dateTo } = req.body;

  // Fallback dates
  const fromDate = dateFrom || "2000-01-01";
  const toDate = dateTo || new Date();

  const response = {
    kpis: [],
    analytics: {},
    insights: [],
  };

  /* ================= SALES KPIs ================= */
  const salesQuery = `
    SELECT
      COUNT(DISTINCT q.quote_id) AS total_quotations,

      SUM(
        CASE
          WHEN q.status = 'Approved' THEN 1
          ELSE 0
        END
      ) AS approved_quotations,

      po.currency,

      IFNULL(
        SUM(
          CAST(pod.quantity AS DECIMAL(10,2)) *
          CAST(pod.price AS DECIMAL(10,2))
        ),
        0
      ) AS total_revenue

    FROM quotations q

    LEFT JOIN purchase_orders po
      ON po.quote_id = q.quote_id

    LEFT JOIN po_items_details pod
      ON pod.po_id = po.po_id

    WHERE q.created_on BETWEEN ? AND ?

    GROUP BY po.currency
  `;

  pool.query(salesQuery, [fromDate, toDate], (err, sales) => {
    if (err) return res.status(500).json(err);

    // Revenue by currency
    const revenueByCurrency = {
      USD: 0,
      LKR: 0,
    };

    sales.forEach((row) => {
      // Skip null/empty currencies
      if (!row.currency) return;

      revenueByCurrency[row.currency] = Number(
        row.total_revenue || 0
      );
    });

    const totalQuotations =
      sales.length > 0
        ? Number(sales[0].total_quotations || 0)
        : 0;

    const approvedQuotations =
      sales.length > 0
        ? Number(sales[0].approved_quotations || 0)
        : 0;

    /* ================= REVENUE TREND ================= */
    const revenueTrendQuery = `
        SELECT
          DATE_FORMAT(po.created_on, '%Y-%m') AS month,

          po.currency,

          IFNULL(
            SUM(
              CAST(pod.quantity AS DECIMAL(10,2)) *
              CAST(pod.price AS DECIMAL(10,2))
            ),
            0
          ) AS revenue

        FROM purchase_orders po

        LEFT JOIN po_items_details pod
          ON pod.po_id = po.po_id

        WHERE po.created_on BETWEEN ? AND ?

        GROUP BY month, po.currency

        ORDER BY month
      `;

    pool.query(
      revenueTrendQuery,
      [fromDate, toDate],
      (err, revenueTrend) => {
        if (err) return res.status(500).json(err);

        /* ================= JOB KPIs ================= */
        const jobQuery = `
          SELECT
            COUNT(*) AS total_jobs,

            SUM(
              CASE
                WHEN status = 'Completed' THEN 1
                ELSE 0
              END
            ) AS completed_jobs,

            ROUND(
              IFNULL(
                SUM(completed_qty) /
                NULLIF(SUM(quantity), 0),
                0
              ) * 100,
              2
            ) AS production_efficiency

          FROM jobs
        `;

        pool.query(jobQuery, (err, jobs) => {
          if (err) return res.status(500).json(err);

          /* ================= INVENTORY KPIs ================= */
          const inventoryQuery = `
            SELECT COUNT(*) AS low_stock_items
            FROM main_inventory
            WHERE quantity < reorder_level
          `;

          pool.query(inventoryQuery, (err, inventory) => {
            if (err) return res.status(500).json(err);

            /* ================= DISPATCH KPIs ================= */
            const dispatchQuery = `
              SELECT
                COUNT(*) AS total_dispatches,

                SUM(
                  CASE
                    WHEN status = 'Completed' THEN 1
                    ELSE 0
                  END
                ) AS completed_dispatches

              FROM dispatch
            `;

            pool.query(dispatchQuery, (err, dispatch) => {
              if (err) return res.status(500).json(err);

              /* ================= BUILD RESPONSE ================= */

              response.kpis = [
                {
                  key: "totalQuotations",
                  value: totalQuotations,
                },
                {
                  key: "approvedQuotations",
                  value: approvedQuotations,
                },
                {
                  key: "totalRevenue",
                  value: revenueByCurrency,
                },
                {
                  key: "productionEfficiency",
                  value:
                    Number(
                      jobs[0].production_efficiency
                    ) || 0,
                },
                {
                  key: "lowStockItems",
                  value:
                    Number(
                      inventory[0].low_stock_items
                    ) || 0,
                },
                {
                  key: "totalDispatches",
                  value:
                    Number(
                      dispatch[0].total_dispatches
                    ) || 0,
                },
              ];

              response.analytics = {
                revenueTrend,
                jobStats: jobs[0],
                dispatchStats: dispatch[0],
              };

              /* ================= INSIGHTS ================= */

              if (
                approvedQuotations < totalQuotations
              ) {
                response.insights.push(
                  "High number of pending quotations"
                );
              } else {
                response.insights.push(
                  "Quotation approvals are healthy"
                );
              }

              if (
                inventory[0].low_stock_items > 0
              ) {
                response.insights.push(
                  "Inventory reorder required"
                );
              } else {
                response.insights.push(
                  "Inventory levels are healthy"
                );
              }

              if (
                Number(
                  jobs[0].production_efficiency
                ) < 85
              ) {
                response.insights.push(
                  "Production efficiency is below optimal level"
                );
              }

              res.status(200).json(response);
            });
          });
        });
      }
    );
  });
};



exports.getAllDataReports = (req, res, next) => {
  const { reportType, filters = {} } = req.body;

  // ✅ Whitelist allowed tables to prevent SQL injection
  const allowedTables = [
    "quotations",
    "purchase_orders",
    "jobs",
    "customers",
    "dispatch",
    "main_inventory"
  ];

  if (!allowedTables.includes(reportType)) {
    return res.status(400).json({
      message: "Invalid report type"
    });
  }

  let query = `SELECT * FROM \`erp_madhawi_db\`.\`${reportType}\``;
  const params = [];
  const conditions = [];

  // ✅ Date range filter
  if (filters.fromDate && filters.toDate) {
    conditions.push(`DATE(created_on) BETWEEN ? AND ?`);
    params.push(filters.fromDate, filters.toDate);
  }

  // Add WHERE if conditions exist
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  pool.query(query, params, (err, results) => {
    if (err) {
      console.error("Report fetch error:", err);
      return res.status(500).json({
        message: "Database error",
        error: err
      });
    }

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  });
};
