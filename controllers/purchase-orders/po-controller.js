const connection = require("../../sql-connection");

exports.getAllPOWithJobs = (req, res, next) => {
  const query = `
    SELECT
      po.po_id,
      po.quote_id,
      po.po_type_id,
      po.batch_ref,
      po.po_date,
      po.delivery_date,
      po.TC_E_PR_No,
      po.status AS po_status,

      c.customer_id,
      c.company_name AS customer_name,
      c.email AS customer_email,

      j.job_id,
      j.job_open_date,
      j.job_name,
      j.product_type,
      j.paper_type_id,
      j.quantity,
      j.coating,
      j.packing_date,
      j.expiry_date,
      j.description,
      j.artwork,
      j.remarks,
      j.status AS job_status,
      j.completed_qty,
      j.wastage

    FROM \`erp-madhawi-db\`.purchase_orders po

    LEFT JOIN \`erp-madhawi-db\`.quotations q
      ON q.quote_id = po.quote_id

    LEFT JOIN \`erp-madhawi-db\`.customers c
      ON c.customer_id = q.customer_id

    LEFT JOIN \`erp-madhawi-db\`.jobs j
      ON j.po_id = po.po_id

    ORDER BY po.po_id DESC, j.job_id ASC
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching POs with jobs:", err);
      return next(err);
    }

    const poMap = {};

    results.forEach((row) => {
      // Initialize PO object once
      if (!poMap[row.po_id]) {
        poMap[row.po_id] = {
          po_id: row.po_id,
          quote_id: row.quote_id,
          po_type_id: row.po_type_id,
          batch_ref: row.batch_ref,
          po_date: row.po_date,
          delivery_date: row.delivery_date,
          TC_E_PR_No: row.TC_E_PR_No,
          status: row.po_status,

          customer: row.customer_id
            ? {
              customer_id: row.customer_id,
              name: row.customer_name,
              email: row.customer_email,
            }
            : null,

          jobs: [],
        };
      }

      // Push job only if job exists
      if (row.job_id) {
        poMap[row.po_id].jobs.push({
          job_id: row.job_id,
          job_open_date: row.job_open_date,
          job_name: row.job_name,
          product_type: row.product_type,
          paper_type_id: row.paper_type_id,
          quantity: row.quantity,
          coating: row.coating,
          packing_date: row.packing_date,
          expiry_date: row.expiry_date,
          description: row.description,
          artwork: row.artwork,
          remarks: row.remarks,
          status: row.job_status,
          completed_qty: row.completed_qty,
          wastage: row.wastage,
        });
      }
    });

    res.status(200).json({
      status: "success",
      count: Object.keys(poMap).length,
      data: Object.values(poMap),
    });
  });
};




exports.getPObyId = (req, res, next) => {
  const poId = req.params.poId;

  const query = `
    SELECT 
      /* ---------- Purchase Order ---------- */
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
      p.customer_po,

      /* ---------- Customer ---------- */
      c.company_name AS customer_name,
      c.customer_type AS customer_type,
      c.address AS customer_address,
      c.phone AS customer_phone,
      c.email AS customer_email,

      /* ---------- Quotation Items ---------- */
      qi.item_id,
      qi.item_category,
      qi.item_description,
      qi.item_qty,
      qi.item_unit_price,
      qi.item_unit_discount,
      qi.item_total_price,

      /* ---------- PO Items ---------- */
      pid.po_item_id,
      pid.item_code,
      pid.description AS po_item_description,
      pid.quantity AS po_item_quantity,
      pid.uom,
      pid.price,

      /* ---------- Jobs ---------- */
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

      /* ---------- Job Materials ---------- */
      jm.job_material_id,
      jm.material_type,
      jm.material_name,
      jm.material_description,
      jm.quantity AS material_quantity,
      jm.status AS material_status,
      jm.remarks AS material_remarks

    FROM purchase_orders p
    LEFT JOIN quotations q ON p.quote_id = q.quote_id
    LEFT JOIN quote_items qi ON q.quote_id = qi.quote_id
    LEFT JOIN customers c ON p.customer_id = c.customer_id
    LEFT JOIN po_items_details pid ON p.po_id = pid.po_id
    LEFT JOIN jobs j ON p.po_id = j.po_id
    LEFT JOIN job_materials jm ON j.job_id = jm.job_id
    WHERE p.po_id = ?;
  `;

  connection.query(query, [poId], (err, results) => {
    if (err) {
      console.error("Error fetching PO:", err);
      return next(err);
    }

    if (!results.length) {
      return res.status(404).json({
        status: "error",
        message: "Purchase order not found",
      });
    }

    /* ---------- BASE PO OBJECT ---------- */
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

      quotation_items: [],
      po_items: [],
      jobs: [],
    };

    /* ---------- MAPS FOR DEDUP ---------- */
    const quoteItemMap = {};
    const poItemMap = {};
    const jobMap = {};

    results.forEach((r) => {

      /* ---------- Quotation Items ---------- */
      if (r.item_id && !quoteItemMap[r.item_id]) {
        quoteItemMap[r.item_id] = true;

        po.quotation_items.push({
          item_id: r.item_id,
          item_category: r.item_category,
          item_description: r.item_description,
          item_qty: r.item_qty,
          item_unit_price: r.item_unit_price,
          item_unit_discount: r.item_unit_discount,
          item_total_price: r.item_total_price,
        });
      }

      /* ---------- PO Items ---------- */
      if (r.po_item_id && !poItemMap[r.po_item_id]) {
        poItemMap[r.po_item_id] = true;

        po.po_items.push({
          po_item_id: r.po_item_id,
          item_code: r.item_code,
          description: r.po_item_description,
          quantity: r.po_item_quantity,
          uom: r.uom,
          price: r.price,
        });
      }

      /* ---------- Jobs ---------- */
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
          materials: {},
        };
        po.jobs.push(jobMap[r.job_id]);
      }

      /* ---------- Job Materials ---------- */
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

    return res.status(200).json({
      status: "success",
      data: po,
    });
  });
};

exports.createPurchaseOrder = (req, res, next) => {
  const {
    quote_id,
    customer_id,
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
    customer_po,
    po_items = []
  } = req.body;

  /* ---------- START TRANSACTION ---------- */
  connection.beginTransaction((err) => {
    if (err) return next(err);

    /* ---------- INSERT PURCHASE ORDER ---------- */
    const poQuery = `
      INSERT INTO purchase_orders (
        quote_id,
        customer_id,
        po_type_id,
        batch_ref,
        po_date,
        delivery_date,
        TC_E_PR_No,
        approved_on,
        approved_by,
        created_on,
        created_by,
        updated_on,
        updated_by,
        status,
        customer_po
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?, ?, ?
      )
    `;

    const poValues = [
      quote_id,
      customer_id,
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

    connection.query(poQuery, poValues, (err, result) => {
      if (err) {
        return connection.rollback(() => next(err));
      }

      const generatedPoId = result.insertId;

      /* ---------- NO ITEMS CASE ---------- */
      if (!Array.isArray(po_items) || po_items.length === 0) {
        return connection.commit(() => {
          res.status(201).json({
            status: "success",
            message: "Purchase Order created successfully",
            po_id: generatedPoId
          });
        });
      }

      /* ---------- INSERT PO ITEMS ---------- */
      const itemQuery = `
        INSERT INTO po_items_details
          (po_id, item_code, description, quantity, uom, price)
        VALUES ?
      `;

      const itemValues = po_items.map(item => [
        generatedPoId,
        item.item_code,
        item.description,
        item.quantity,
        item.uom,
        item.price
      ]);

      connection.query(itemQuery, [itemValues], (err) => {
        if (err) {
          return connection.rollback(() => next(err));
        }

        /* ---------- COMMIT TRANSACTION ---------- */
        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => next(err));
          }

          res.status(201).json({
            status: "success",
            message: "Purchase Order and items created successfully",
            po_id: generatedPoId
          });
        });
      });
    });
  });
};



exports.updatePurchaseOrder = (req, res, next) => {
  const poId = req.params.poId;

  const {
    quote_id,
    customer_id,
    po_type_id,
    batch_ref,
    po_date,
    delivery_date,
    TC_E_PR_No,
    approved_on,
    approved_by,
    updated_by,
    status,
    customer_po,
    po_items = []
  } = req.body;

  const toMysqlDatetime = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toISOString().slice(0, 19).replace("T", " ");
  };

  /* ---------- START TRANSACTION ---------- */
  connection.beginTransaction((err) => {
    if (err) return next(err);

    /* ---------- UPDATE PURCHASE ORDER ---------- */
    const poQuery = `
      UPDATE purchase_orders
      SET
        quote_id = ?,
        customer_id = ?,
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

    const poValues = [
      quote_id,
      customer_id,
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

    connection.query(poQuery, poValues, (err, result) => {
      if (err) {
        return connection.rollback(() => next(err));
      }

      if (result.affectedRows === 0) {
        return connection.rollback(() =>
          res.status(404).json({
            status: "fail",
            message: "Purchase order not found"
          })
        );
      }

      /* ---------- DELETE OLD PO ITEMS ---------- */
      const deleteItemsQuery = `
        DELETE FROM po_items_details WHERE po_id = ?
      `;

      connection.query(deleteItemsQuery, [poId], (err) => {
        if (err) {
          return connection.rollback(() => next(err));
        }

        /* ---------- INSERT UPDATED PO ITEMS ---------- */
        if (!po_items.length) {
          return connection.commit(() =>
            res.status(200).json({
              status: "success",
              message: "Purchase order updated successfully"
            })
          );
        }

        const insertItemsQuery = `
          INSERT INTO po_items_details
            (po_id, item_code, description, quantity, uom, price)
          VALUES ?
        `;

        const itemValues = po_items.map(item => [
          poId,
          item.item_code,
          item.description,
          item.quantity,
          item.uom,
          item.price
        ]);

        connection.query(insertItemsQuery, [itemValues], (err) => {
          if (err) {
            return connection.rollback(() => next(err));
          }

          /* ---------- COMMIT ---------- */
          connection.commit(() => {
            res.status(200).json({
              status: "success",
              message: "Purchase order and items updated successfully"
            });
          });
        });
      });
    });
  });
};

exports.deletePurchaseOrder = (req, res, next) => {
  const poId = req.params.poId;

  /* ---------- START TRANSACTION ---------- */
  connection.beginTransaction((err) => {
    if (err) return next(err);

    /* ---------- DELETE PO ITEMS ---------- */
    const deleteItemsQuery = `
      DELETE FROM po_items_details
      WHERE po_id = ?
    `;

    connection.query(deleteItemsQuery, [poId], (err) => {
      if (err) {
        return connection.rollback(() => next(err));
      }

      /* ---------- DELETE PURCHASE ORDER ---------- */
      const deletePOQuery = `
        DELETE FROM purchase_orders
        WHERE po_id = ?
      `;

      connection.query(deletePOQuery, [poId], (err, result) => {
        if (err) {
          return connection.rollback(() => next(err));
        }

        if (result.affectedRows === 0) {
          return connection.rollback(() =>
            res.status(404).json({
              status: "fail",
              message: "Purchase order not found"
            })
          );
        }

        /* ---------- COMMIT ---------- */
        connection.commit(() => {
          res.status(200).json({
            status: "success",
            message: "Purchase order deleted successfully"
          });
        });
      });
    });
  });
};

