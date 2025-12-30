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
      p.TC_E_PR_No,
      p.approved_on,
      p.approved_by,
      p.created_on,
      p.created_by,
      p.updated_on,
      p.updated_by,
      p.status AS po_status,
      p.customer_po AS customer_po,
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
      TC_E_PR_No: results[0].TC_E_PR_No,
      approved_on: results[0].approved_on,
      approved_by: results[0].approved_by,
      created_on: results[0].created_on,
      created_by: results[0].created_by,
      updated_on: results[0].updated_on,
      updated_by: results[0].updated_by,
      po_status: results[0].po_status,
      customer_po: results[0].customer_po,
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


exports.createPurchaseOrder = (req, res, next) => {
  const {
    po_id,
    quote_id,
    po_type_id,
    batch_ref,
    po_date,
    delivery_date,
    TC_E_PR_No,
    approved_on,
    approved_by,
    created_by,
    updated_by,
    status,
    customer_po
  } = req.body;

  const query = `
    INSERT INTO purchase_orders (
      po_id, quote_id, po_type_id, batch_ref, po_date, delivery_date,TC_E_PR_No,
      approved_on, approved_by, created_on, created_by, updated_on, updated_by, status,customer_po
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?, ?, ?
    )
  `;

  const values = [
    po_id,
    quote_id,
    po_type_id,
    batch_ref,
    po_date,
    delivery_date,
    TC_E_PR_No,
    approved_on,
    approved_by,
    created_by,
    updated_by,
    status,
    customer_po
  ];

  connection.query(query, values, (err, result) => {
    if (err) {
      console.error("Error inserting purchase order:", err);
      return next(err);
    }

    res.status(201).json({
      status: "success",
      message: "Purchase Order created successfully",
      // data: {
      //   po_id,
      //   quote_id
      // }
    });
  });
};

exports.updatePurchaseOrder = (req, res, next) => {
  const poId = req.params.poId; // existing po_id from URL

  const {
    quote_id,
    po_type_id,
    batch_ref,
    po_date,
    delivery_date,
    TC_E_PR_No,
    approved_on,
    approved_by,
    updated_by,
    status,
    customer_po
  } = req.body;

  const toMysqlDatetime = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toISOString().slice(0, 19).replace("T", " ");
  };

  const query = `
    UPDATE purchase_orders
    SET
      quote_id = ?,
      po_type_id = ?,
      batch_ref = ?,
      po_date = ?,
      delivery_date = ?,
      TC_E_PR_No = ?,
      approved_on = ?,
      approved_by = ?,
      updated_on = NOW(),
      updated_by = ?,
      status = ?,
      customer_po = ?
    WHERE po_id = ?
  `;

  const values = [
    quote_id,
    po_type_id,
    batch_ref,
    toMysqlDatetime(po_date),
    toMysqlDatetime(delivery_date),
    TC_E_PR_No,
    toMysqlDatetime(approved_on),
    approved_by,
    updated_by,
    status,
    customer_po,
    poId
  ];

  connection.query(query, values, (err, result) => {
    if (err) {
      console.error("Error updating purchase order:", err);
      return next(err);
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "fail",
        message: "Purchase order not found"
      });
    }

    res.status(200).json({
      status: "success",
      message: "Purchase order updated successfully"
    });
  });
};



exports.deletePurchaseOrder = (req, res, next) => {
  const poId = req.params.poId;

  const query = `DELETE FROM purchase_orders WHERE po_id = ?`;

  connection.query(query, [poId], (err, result) => {
    if (err) {
      console.error("Error deleting purchase order:", err);
      return next(err);
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "fail",
        message: "Purchase order not found"
      });
    }

    res.status(200).json({
      status: "success",
      message: "Purchase order deleted successfully"
    });
  });
};
