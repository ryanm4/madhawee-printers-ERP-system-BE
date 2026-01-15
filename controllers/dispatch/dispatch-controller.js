const connection = require("../../sql-connection");

exports.getAllDispatchNotes = (req, res, next) => {
  const query = `SELECT * FROM \`erp-madhawi-db\`.\`dispatch\`;`;
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching dispatch notes:", err);
      return next(err);
    } else {
      res.status(200).json({
        status: "success",
        data: results,
      });
    }
  });
};

exports.createDispatch = (req, res, next) => {
  const {
    dispatch_id,
    customer_id,
    dispatch_note,
    dispatch_date,
    dispatch_qty,
    no_of_bundles,
    description,
    created_by,
  } = req.body;

  const query = `
    INSERT INTO dispatch (
      dispatch_id,
      customer_id,
      dispatch_note,
      dispatch_date,
      dispatch_qty,
      no_of_bundles,
      description,
      created_by,
      created_on
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  connection.query(
    query,
    [
      dispatch_id,
      customer_id,
      dispatch_note,
      dispatch_date,
      dispatch_qty,
      no_of_bundles,
      description,
      created_by,
    ],
    (err) => {
      if (err) {
        console.error("Error creating dispatch:", err);
        return next(err);
      }

      res.status(201).json({
        message: "Dispatch created successfully",
        dispatch_id,
      });
    }
  );
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
      d.created_by,
      d.created_on,
      d.updated_by,
      d.updated_on,

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
      c.contact_person_phone
    FROM dispatch d
    LEFT JOIN customers c
      ON d.customer_id = c.customer_id
    WHERE d.dispatch_id = ?
  `;

  connection.query(query, [dispatch_id], (err, results) => {
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

    res.json({
      data: {
        dispatch_id: row.dispatch_id,
        dispatch_note: row.dispatch_note,
        dispatch_date: row.dispatch_date,
        dispatch_qty: row.dispatch_qty,
        no_of_bundles: row.no_of_bundles,
        description: row.description,
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
      },
    });
  });
};

exports.updateDispatch = (req, res, next) => {
  const { dispatch_id } = req.params;

  const {
    customer_id,
    dispatch_note,
    dispatch_date,
    dispatch_qty,
    no_of_bundles,
    description,
    updated_by,
  } = req.body;

  const query = `
    UPDATE dispatch SET
      customer_id = ?,
      dispatch_note = ?,
      dispatch_date = ?,
      dispatch_qty = ?,
      no_of_bundles = ?,
      description = ?,
      updated_by = ?,
      updated_on = NOW()
    WHERE dispatch_id = ?
  `;

  connection.query(
    query,
    [
      customer_id,
      dispatch_note,
      dispatch_date,
      dispatch_qty,
      no_of_bundles,
      description,
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

      res.json({ message: "Dispatch updated successfully" });
    }
  );
};

exports.deleteDispatch = (req, res, next) => {
  const { dispatch_id } = req.params;

  const query = "DELETE FROM dispatch WHERE dispatch_id = ?";

  connection.query(query, [dispatch_id], (err, result) => {
    if (err) {
      console.error("Error deleting dispatch:", err);
      return next(err);
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Dispatch not found" });
    }

    res.json({ message: "Dispatch deleted successfully" });
  });
};
