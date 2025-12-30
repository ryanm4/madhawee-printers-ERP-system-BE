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
    created_by
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
      created_by
    ],
    (err) => {
      if (err) {
        console.error("Error creating dispatch:", err);
        return next(err);
      }

      res.status(201).json({
        message: "Dispatch created successfully",
        dispatch_id
      });
    }
  );
};


exports.getDispatchById = (req, res, next) => {
  const { dispatch_id } = req.params;

  const query = `
    SELECT
      dispatch_id,
      customer_id,
      dispatch_note,
      dispatch_date,
      dispatch_qty,
      no_of_bundles,
      description,
      created_by,
      created_on,
      updated_by,
      updated_on
    FROM dispatch
    WHERE dispatch_id = ?
  `;

  connection.query(query, [dispatch_id], (err, results) => {
    if (err) {
      console.error("Error fetching dispatch:", err);
      return next(err);
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Dispatch not found"
      });
    }

    res.json({
      data: results[0]
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
    updated_by
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
      dispatch_id
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
