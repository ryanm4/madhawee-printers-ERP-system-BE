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
      j.quantity AS job_quantity,
      j.completed_qty AS complete_quantity,
      j.coating,
      j.packing_date,
      j.expiry_date,
      j.description,
      j.artwork,
      j.remarks,
      j.status AS job_status,
      jm.job_material_id,
      jm.material_type,
      jm.material_name,
      jm.material_description,
      jm.quantity AS material_quantity,
      jm.status AS material_status,
      jm.remarks AS material_remarks
    FROM purchase_orders p
    LEFT JOIN quotations q ON p.quote_id = q.quote_id
    LEFT JOIN customers c ON q.customer_id = c.customer_id
    LEFT JOIN jobs j ON p.po_id = j.po_id
    LEFT JOIN job_materials jm ON j.job_id = jm.job_id
    WHERE p.po_id = ?;
  `;

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
      quote_id: results[0].quote_id,
      po_type_id: results[0].po_type_id,
      batch_ref: results[0].batch_ref,
      po_date: results[0].po_date,
      delivery_date: results[0].delivery_date,
      approved_on: results[0].approved_on,
      approved_by: results[0].approved_by,
      created_on: results[0].created_on,
      created_by: results[0].created_by,
      updated_on: results[0].updated_on,
      updated_by: results[0].updated_by,
      po_status: results[0].po_status,
      customer: {
        name: results[0].customer_name,
        address: results[0].customer_address,
        phone: results[0].customer_phone,
        email: results[0].customer_email,
      },
      jobs: [],
    };

    const jobMap = {};

    results.forEach((r) => {
      if (!r.job_id) return;

      if (!jobMap[r.job_id]) {
        jobMap[r.job_id] = {
          job_id: r.job_id,
          job_open_date: r.job_open_date,
          product_type: r.product_type,
          paper_type_id: r.paper_type_id,
          quantity: r.job_quantity,
          complete_quantity: r.complete_quantity,
          coating: r.coating,
          packing_date: r.packing_date,
          expiry_date: r.expiry_date,
          description: r.description,
          artwork: r.artwork,
          remarks: r.remarks,
          status: r.job_status,
          materials: {}, // Grouped by material_type
        };
        po.jobs.push(jobMap[r.job_id]);
      }

      if (r.job_material_id) {
        const type = r.material_type || "Unknown";
        if (!jobMap[r.job_id].materials[type]) {
          jobMap[r.job_id].materials[type] = {
            material_type: type,
            items: [],
          };
        }

        jobMap[r.job_id].materials[type].items.push({
          material_name: r.material_name,
          material_description: r.material_description,
          quantity: r.material_quantity,
          status: r.material_status,
          remarks: r.material_remarks,
        });
      }
    });

    res.status(200).json({
      status: "success",
      data: po,
    });
  });
};
