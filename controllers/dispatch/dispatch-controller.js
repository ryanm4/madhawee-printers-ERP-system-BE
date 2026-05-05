const pool = require("../../sql-connection");

exports.getAllDispatchNotes = (req, res, next) => {
  const query = `
    SELECT
      -- Dispatch
      d.dispatch_id,
      d.dispatch_note,
      d.dispatch_date,
      d.dispatch_qty,
      d.no_of_bundles,
      d.description,
      d.delivery_address,
      d.status,
      d.created_by,
      d.created_on,
      d.updated_by,
      d.updated_on,

      -- Customer
      c.customer_id,
      c.company_name AS customer_name,
      c.customer_type,
      c.address AS customer_address,
      c.phone AS customer_phone,
      c.email AS customer_email,
      c.contact_person,
      c.contact_person_phone,
      c.contact_person_email,

      -- Job
      j.job_id,
      j.job_number,
      j.po_id,
      j.job_name,
      j.job_open_date,
      j.product_type,
      j.paper_type_id,
      j.quantity AS job_quantity,
      j.coating,
      j.packing_date,
      j.expiry_date,
      j.completed_qty,
      j.wastage,
      j.status AS job_status

    FROM \`erp_madhawi_db\`.dispatch d

    -- Job first
    LEFT JOIN \`erp_madhawi_db\`.jobs j
      ON d.job_id = j.job_id

    -- Customer (prefer job.customer_id, fallback to dispatch.customer_id)
    LEFT JOIN \`erp_madhawi_db\`.customers c
      ON c.customer_id = COALESCE(j.customer_id, d.customer_id)

    ORDER BY d.created_on DESC
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching dispatch notes:", err);
      return next(err);
    }

    res.status(200).json({
      status: "success",
      data: results,
    });
  });
};

exports.createDispatch = (req, res, next) => {
  const {
    customer_id,
    job_id,
    dispatch_note,
    dispatch_date,
    dispatch_qty,
    no_of_bundles,
    description,
    delivery_address,
    status,
    created_by,
  } = req.body;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Connection error:", err);
      return next(err);
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return next(err);
      }

      const insertDispatchQuery = `
        INSERT INTO erp_madhawi_db.dispatch (
          customer_id,
          job_id,
          dispatch_note,
          dispatch_date,
          dispatch_qty,
          no_of_bundles,
          description,
          delivery_address,
          status,
          created_by,
          created_on
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      connection.query(
        insertDispatchQuery,
        [
          customer_id,
          job_id,
          dispatch_note,
          dispatch_date,
          dispatch_qty,
          no_of_bundles,
          description,
          delivery_address,
          status,
          created_by,
        ],
        (err, result) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              console.error("Error creating dispatch:", err);
              next(err);
            });
          }

          // ✅ Update completed_qty in jobs
          const updateJobQuery = `
            UPDATE erp_madhawi_db.jobs
            SET 
              completed_qty = completed_qty + ?,
              updated_on = NOW(),
              updated_by = ?
            WHERE job_id = ?
          `;

          connection.query(
            updateJobQuery,
            [dispatch_qty, created_by, job_id],
            (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  console.error("Error updating job:", err);
                  next(err);
                });
              }

              connection.commit((err) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    next(err);
                  });
                }

                connection.release();

                res.status(201).json({
                  status: "success",
                  message: "Dispatch created and job updated successfully",
                  dispatch_id: result.insertId,
                });
              });
            }
          );
        }
      );
    });
  });
};


exports.getDispatchById = (req, res, next) => {
  const { dispatch_id } = req.params;

  const query = `
    SELECT
      d.dispatch_id,
      d.dispatch_note,
      d.dispatch_date,
      d.dispatch_qty,
      d.no_of_bundles,
      d.description,
      d.status,
      d.delivery_address,
      d.created_by,
      d.created_on,
      d.updated_by,
      d.updated_on,
      d.job_id,

      c.customer_id,
      c.company_name,
      c.customer_type,
      c.address,
      c.phone,
      c.email,
      c.vat_type,
      c.vat_no,
      c.logo_url,
      c.contact_person,
      c.contact_person_email,
      c.contact_person_phone,

      jm.job_material_id,
      jm.item_id,
      jm.material_type,
      jm.material_name,
      jm.material_description,
      jm.quantity AS material_quantity,
      jm.status AS material_status,
      jm.remarks
    FROM dispatch d
    LEFT JOIN customers c
      ON d.customer_id = c.customer_id
    LEFT JOIN job_materials jm
      ON d.job_id = jm.job_id
    WHERE d.dispatch_id = ?
  `;

  pool.query(query, [dispatch_id], (err, results) => {
    if (err) {
      console.error("Error fetching dispatch:", err);
      return next(err);
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Dispatch not found",
      });
    }

    const row = results[0];

    // ✅ Build job materials array
    const jobMaterials = results
      .filter(r => r.job_material_id)
      .map(r => ({
        job_material_id: r.job_material_id,
        item_id: r.item_id,
        material_type: r.material_type,
        material_name: r.material_name,
        material_description: r.material_description,
        quantity: r.material_quantity,
        status: r.material_status,
        remarks: r.remarks,
      }));

    res.json({
      data: {
        dispatch_id: row.dispatch_id,
        job_id: row.job_id,
        dispatch_note: row.dispatch_note,
        dispatch_date: row.dispatch_date,
        dispatch_qty: row.dispatch_qty,
        no_of_bundles: row.no_of_bundles,
        description: row.description,
        delivery_address: row.delivery_address,
        status: row.status,
        created_by: row.created_by,
        created_on: row.created_on,
        updated_by: row.updated_by,
        updated_on: row.updated_on,

        customer: row.customer_id
          ? {
              customer_id: row.customer_id,
              company_name: row.company_name,
              customer_type: row.customer_type,
              address: row.address,
              phone: row.phone,
              email: row.email,
              vat_type: row.vat_type,
              vat_no: row.vat_no,
              logo_url: row.logo_url,
              contact_person: row.contact_person,
              contact_person_email: row.contact_person_email,
              contact_person_phone: row.contact_person_phone,
            }
          : null,

        job_materials: jobMaterials,
      },
    });
  });
};


exports.updateDispatch = (req, res, next) => {
  const { dispatch_id } = req.params;

  const {
    customer_id,
    job_id,
    dispatch_note,
    dispatch_date,
    dispatch_qty,
    no_of_bundles,
    description,
    delivery_address,
    status,
    updated_by,
  } = req.body;

  const query = `
    UPDATE \`erp_madhawi_db\`.dispatch SET
      customer_id = ?,
      job_id = ?,
      dispatch_note = ?,
      dispatch_date = ?,
      dispatch_qty = ?,
      no_of_bundles = ?,
      description = ?,
      delivery_address = ?,
      status = ?,
      updated_by = ?,
      updated_on = NOW()
    WHERE dispatch_id = ?
  `;

  pool.query(
    query,
    [
      customer_id,
      job_id,
      dispatch_note,
      dispatch_date,
      dispatch_qty,
      no_of_bundles,
      description,
      delivery_address,
      status,
      updated_by,
      dispatch_id,
    ],
    (err, result) => {
      if (err) {
        console.error("Error updating dispatch:", err);
        return next(err);
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Dispatch not found" });
      }

      res.status(200).json({
        status: "success",
        message: "Dispatch updated successfully",
      });
    }
  );
};

// controllers/dispatch.js
exports.deleteDispatch = (req, res, next) => {
  const { dispatch_id } = req.params;

  const query = `DELETE FROM \`erp_madhawi_db\`.dispatch WHERE dispatch_id = ?`;

  pool.query(query, [dispatch_id], (err, result) => {
    if (err) return next(err);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Dispatch not found" });
    }

    res
      .status(200)
      .json({ status: "success", message: "Dispatch deleted successfully" });
  });
};
