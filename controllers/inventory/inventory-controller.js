const pool = require("../../sql-connection");

exports.getAllInventoryItems = (req, res, next) => {
  const query = "SELECT * FROM `erp-madhawi-db`.`main_inventory`;";
  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching inventory items:", err);
      return next(err);
    } else {
      res.status(200).json({
        status: "success",
        data: results,
      });
    }
  });
};

exports.getInventoryItemById = (req, res, next) => {
  const { item_id } = req.params;

  if (!item_id) {
    return res.status(400).json({
      status: "error",
      message: "item_id is required",
    });
  }

  const query = `
    SELECT * FROM main_inventory
    WHERE item_id = ?
  `;

  pool.query(query, [item_id], (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({
        status: "error",
        message: "Database error",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Item not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: results[0],
    });
  });
};

exports.createInventoryItem = (req, res, next) => {
  const {
    item_category,
    item_sub_category,
    item_name,
    size,
    quantity,
    unit_of_measure,
    reorder_level,
    status,
    remarks,
    created_by,
  } = req.body;

  const query = `
    INSERT INTO main_inventory (
      item_category,
      item_sub_category,
      item_name,
      size,
      quantity,
      unit_of_measure,
      reorder_level,
      status,
      remarks,
      created_on,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
  `;

  pool.query(
    query,
    [
      item_category,
      item_sub_category,
      item_name,
      size,
      quantity,
      unit_of_measure,
      reorder_level,
      status,
      remarks,
      created_by,
    ],
    (err, result) => {
      if (err) {
        console.error("Error creating inventory item:", err);
        return res.status(500).json({ message: "Database error" });
      }

      res.status(201).json({
        message: "Inventory item created successfully",
        item_id: result.insertId,
      });
    }
  );
};



exports.updateInventoryItem = (req, res, next) => {
  const { item_id } = req.params;

  const {
    item_category,
    item_sub_category,
    item_name,
    size,
    quantity,
    unit_of_measure,
    reorder_level,
    status,
    remarks,
    updated_by,
  } = req.body;

  const query = `
    UPDATE main_inventory
    SET
      item_category = ?,
      item_sub_category = ?,
      item_name = ?,
      size = ?,
      quantity = ?,
      unit_of_measure = ?,
      reorder_level = ?,
      status = ?,
      remarks = ?,
      updated_on = NOW(),
      updated_by = ?
    WHERE item_id = ?
  `;

  pool.query(
    query,
    [
      item_category,
      item_sub_category,
      item_name,
      size,
      quantity,
      unit_of_measure,
      reorder_level,
      status,
      remarks,
      updated_by, // ✅ correct order
      item_id,    // ✅ correct order
    ],
    (err, result) => {
      if (err) {
        console.error("Error updating inventory item:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.status(200).json({ message: "Inventory item updated successfully" });
    }
  );
};



exports.deleteInventoryItem = (req, res, next) => {
  const { item_id } = req.params;

  const query = `DELETE FROM main_inventory WHERE item_id = ?`;

  pool.query(query, [item_id], (err, result) => {
    if (err) {
      console.error("Error deleting inventory item:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({ message: "Inventory item deleted successfully" });
  });
};
