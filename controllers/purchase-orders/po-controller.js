const connection = require("../../sql-connection");

exports.getAllPO = (req, res, next) => {
  const query = `SELECT * FROM \`erp-madhawi-db\`.\`purchase_orders\`;`;
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching purchase orders:", err);
      return next(err);
    } else {
      res.status(200).json({
        status: "success",
        data: results,
      });
    }
  });
};

exports.getPObyId = (req, res, next) => {
  const poId = req.params.poId;
  const query = `
    SELECT 
      p.po_id,
      p.quote_id,
      p.po_type_id,
      p.batch_ref,
      p.po_date,
      p.delivery_date,
      p.approved_on,
      p.approved_by,
      p.created_on,
      p.created_by,
      p.updated_on,
      p.updated_by,
      p.status AS po_status,
      c.company_name AS customer_name,
      c.address AS customer_address,
      c.phone AS customer_phone,
      c.email AS customer_email,
      j.job_id,
      j.job_open_date,
      j.product_type,
      j.paper_type_id,
      j.quantity,
      j.coating,
      j.packing_date,
      j.expiry_date,
      j.description,
      j.artwork,
      j.remarks,
      j.status AS job_status
    FROM purchase_orders p
    LEFT JOIN quotations q ON p.quote_id = q.quote_id
    LEFT JOIN customers c ON q.customer_id = c.customer_id
    LEFT JOIN jobs j ON p.po_id = j.po_id
    WHERE p.po_id = ?;`;

  connection.query(query, [poId], (err, results) => {
    if (err) {
      console.error("Error fetching purchase order:", err);
      return next(err);
    }

    if (results.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Purchase order not found",
      });
    }

    const po = {
      po_id: results[0].po_id,
      po_number: results[0].po_number,
      po_date: results[0].po_date,
      customer_id: results[0].customer_id,
      total_amount: results[0].total_amount,
      po_status: results[0].po_status,
      customer: {
        name: results[0].customer_name,
        address: results[0].customer_address,
        phone: results[0].customer_phone,
        email: results[0].customer_email,
      },
      jobs: results
        .filter((r) => r.job_id !== null)
        .map((r) => ({
          job_id: r.job_id,
          job_open_date: r.job_open_date,
          product_type: r.product_type,
          paper_type_id: r.paper_type_id,
          quantity: r.quantity,
          coating: r.coating,
          packing_date: r.packing_date,
          expiry_date: r.expiry_date,
          description: r.description,
          artwork: r.artwork,
          remarks: r.remarks,
          status: r.job_status,
        })),
    };

    res.status(200).json({
      status: "success",
      data: po,
    });
  });
};
