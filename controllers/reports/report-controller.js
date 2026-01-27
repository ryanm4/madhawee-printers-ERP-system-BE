const connection = require('../../sql-connection');

// Helper to convert callback to promise
const queryAsync = (sql, params) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
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

    // Mapping report types to tables & date columns
    const dateColumns = {
      QUOTATION_SUMMARY: 'q.created_on',
      QUOTE_TO_PO_CONVERSION: 'q.created_on',
      JOB_PRODUCTION: 'j.job_open_date',
      INVENTORY_HEALTH: null, // no date filter
    };

    const dateColumn = dateColumns[reportType] || null;

    switch (reportType) {
      case 'QUOTATION_SUMMARY':
        query = `
          SELECT 
            q.status,
            COUNT(*) AS total_quotes,
            SUM(CAST(q.net_total AS DECIMAL(15,2))) AS total_value
          FROM quotations q
          WHERE 1=1
        `;
        break;

      case 'QUOTE_TO_PO_CONVERSION':
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

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // Apply dynamic date filters if the table supports a date column
    if (dateColumn && filters.fromDate) {
      query += ` AND ${dateColumn} >= ?`;
      params.push(filters.fromDate);
    }

    if (dateColumn && filters.toDate) {
      query += ` AND ${dateColumn} <= ?`;
      params.push(filters.toDate);
    }

    // Customer filter (if the table has customer_id)
    if (filters.customer_id) {
      // JOB_PRODUCTION & QUOTATION_SUMMARY & QUOTE_TO_PO_CONVERSION
      if (['JOB_PRODUCTION', 'QUOTATION_SUMMARY', 'QUOTE_TO_PO_CONVERSION'].includes(reportType)) {
        query += ` AND ${reportType.startsWith('JOB') ? 'j' : 'q'}.customer_id = ?`;
        params.push(filters.customer_id);
      }
    }

    // Status filter
    if (filters.status) {
      const alias = reportType === 'JOB_PRODUCTION' ? 'j' : 'q';
      query += ` AND ${alias}.status = ?`;
      params.push(filters.status);
    }

    // Execute query
    const rows = await queryAsync(query, params);

    res.json({
      reportType,
      filters,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ message: 'Report generation failed', error: error.message });
  }
};
