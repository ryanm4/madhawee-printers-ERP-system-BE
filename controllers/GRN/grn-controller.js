const pool = require("../../sql-connection");

const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

exports.getAllGRNs = async (req, res) => {
    try {
        const query = `
      SELECT
        grn.id AS grn_id,
        grn.releated_po,
        grn.received_date,
        grn.supplier_name,
        grn.stock_location,
        grn.payee_name,
        grn.payment_method,
        grn.currency,
        grn.supplier_invoice_no,
        grn.remarks,
        grn.created_on,
        grn.created_by,
        grn.updated_on,
        grn.updated_by,

        gi.id AS item_id,
        gi.item_name,
        gi.quantity,
        gi.rate,
        gi.amount

      FROM goods_receive_notes grn
      LEFT JOIN grn_items gi 
        ON grn.id = gi.grn_no

      ORDER BY grn.id DESC
    `;

        const results = await queryAsync(query);

        // 🔄 Transform into nested JSON
        const grnMap = {};

        results.forEach(row => {
            if (!grnMap[row.grn_id]) {
                grnMap[row.grn_id] = {
                    id: row.grn_id,
                    releated_po: row.releated_po,
                    received_date: row.received_date,
                    supplier_name: row.supplier_name,
                    stock_location: row.stock_location,
                    payee_name: row.payee_name,
                    payment_method: row.payment_method,
                    currency: row.currency,
                    supplier_invoice_no: row.supplier_invoice_no,
                    remarks: row.remarks,
                    created_on: row.created_on,
                    created_by: row.created_by,
                    updated_on: row.updated_on,
                    updated_by: row.updated_by,
                    items: []
                };
            }

            // Add items if exists
            if (row.item_id) {
                grnMap[row.grn_id].items.push({
                    id: row.item_id,
                    item_name: row.item_name,
                    quantity: row.quantity,
                    rate: row.rate,
                    amount: row.amount
                });
            }
        });

        const finalData = Object.values(grnMap);

        res.status(200).json({
            success: true,
            count: finalData.length,
            data: finalData
        });

    } catch (error) {
        console.error("Error fetching GRNs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch GRNs",
            error: error.message
        });
    }
};




exports.getGRNById = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT
        grn.id AS grn_id,
        grn.releated_po,
        grn.received_date,
        grn.supplier_name,
        grn.stock_location,
        grn.payee_name,
        grn.payment_method,
        grn.currency,
        grn.supplier_invoice_no,
        grn.remarks,

        gi.id AS item_id,
        gi.item_name,
        gi.quantity,
        gi.rate,
        gi.amount

      FROM goods_receive_notes grn
      LEFT JOIN grn_items gi ON grn.id = gi.grn_no
      WHERE grn.id = ?
    `;

    const results = await queryAsync(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({ message: "GRN not found" });
    }

    const grn = {
      id: results[0].grn_id,
      releated_po: results[0].releated_po,
      received_date: results[0].received_date,
      supplier_name: results[0].supplier_name,
      stock_location: results[0].stock_location,
      payee_name: results[0].payee_name,
      payment_method: results[0].payment_method,
      currency: results[0].currency,
      supplier_invoice_no: results[0].supplier_invoice_no,
      remarks: results[0].remarks,
      items: []
    };

    results.forEach(row => {
      if (row.item_id) {
        grn.items.push({
          id: row.item_id,
          item_name: row.item_name,
          quantity: row.quantity,
          rate: row.rate,
          amount: row.amount
        });
      }
    });

    res.json(grn);

  } catch (error) {
    res.status(500).json({ message: "Error fetching GRN", error });
  }
};



exports.createGRN = (req, res) => {
  const {
    releated_po,
    received_date,
    supplier_name,
    stock_location,
    payee_name,
    payment_method,
    currency,
    supplier_invoice_no,
    remarks,
    created_by,
    items
  } = req.body;

  pool.getConnection((err, connection) => {
    if (err) return res.status(500).json(err);

    connection.beginTransaction(err => {
      if (err) return res.status(500).json(err);

      // 1️⃣ Insert GRN
      const grnQuery = `
        INSERT INTO goods_receive_notes (
          releated_po, received_date, supplier_name, stock_location,
          payee_name, payment_method, currency,
          supplier_invoice_no, remarks, created_on, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
      `;

      connection.query(
        grnQuery,
        [
          releated_po,
          received_date,
          supplier_name,
          stock_location,
          payee_name,
          payment_method,
          currency,
          supplier_invoice_no,
          remarks,
          created_by
        ],
        (err, result) => {
          if (err) {
            return connection.rollback(() => res.status(500).json(err));
          }

          const grnId = result.insertId;

          // If no items → commit early
          if (!items || items.length === 0) {
            return connection.commit(() =>
              res.json({ message: "GRN created", id: grnId })
            );
          }

          // 2️⃣ Insert GRN Items
          const itemQuery = `
            INSERT INTO grn_items (grn_no, item_name, quantity, rate, amount)
            VALUES ?
          `;

          const itemValues = items.map(item => [
            grnId,
            item.item_name,
            item.quantity,
            item.rate,
            item.quantity * item.rate // auto calculate
          ]);

          connection.query(itemQuery, [itemValues], async (err) => {
            if (err) {
              return connection.rollback(() => res.status(500).json(err));
            }

            try {
              // 3️⃣ Update Inventory
              for (const item of items) {

                const existing = await new Promise((resolve, reject) => {
                  connection.query(
                    "SELECT quantity, rate FROM main_inventory WHERE item_name = ?",
                    [item.item_name],
                    (err, results) => {
                      if (err) return reject(err);
                      resolve(results[0]);
                    }
                  );
                });

                if (existing) {
                  const oldQty = Number(existing.quantity) || 0;
                  const oldRate = Number(existing.rate) || 0;

                  const grnQty = Number(item.quantity);
                  const grnRate = Number(item.rate);

                  const newQty = oldQty + grnQty;

                  // ✅ SIMPLE AVERAGE RATE
                  const newRate =
                    oldRate && grnRate
                      ? (oldRate + grnRate) / 2
                      : (oldRate || grnRate);

                  await new Promise((resolve, reject) => {
                    connection.query(
                      `
                      UPDATE main_inventory
                      SET quantity = ?, 
                          rate = ?, 
                          updated_on = NOW(),
                          updated_by = ?
                      WHERE item_name = ?
                      `,
                      [newQty, newRate, created_by, item.item_name],
                      (err) => {
                        if (err) return reject(err);
                        resolve();
                      }
                    );
                  });

                } else {
                  // Insert new inventory item
                  await new Promise((resolve, reject) => {
                    connection.query(
                      `
                      INSERT INTO main_inventory (
                        item_name,
                        quantity,
                        rate,
                        created_on,
                        created_by
                      ) VALUES (?, ?, ?, NOW(), ?)
                      `,
                      [
                        item.item_name,
                        item.quantity,
                        item.rate,
                        created_by
                      ],
                      (err) => {
                        if (err) return reject(err);
                        resolve();
                      }
                    );
                  });
                }
              }

              // 4️⃣ Commit everything
              connection.commit(err => {
                if (err) {
                  return connection.rollback(() =>
                    res.status(500).json(err)
                  );
                }

                res.json({
                  message: "GRN created + inventory updated (simple avg rate)",
                  id: grnId
                });
              });

            } catch (error) {
              connection.rollback(() =>
                res.status(500).json({
                  message: "Inventory update failed",
                  error
                })
              );
            }
          });
        }
      );
    });
  });
};



exports.updateGRN = (req, res) => {
  const { id } = req.params;
  const {
    releated_po,
    received_date,
    supplier_name,
    stock_location,
    payee_name,
    payment_method,
    currency,
    supplier_invoice_no,
    remarks,
    updated_by,
    items
  } = req.body;

  pool.getConnection((err, connection) => {
    if (err) return res.status(500).json(err);

    connection.beginTransaction(err => {
      if (err) return res.status(500).json(err);

      // 1️⃣ Update GRN header
      const updateQuery = `
        UPDATE goods_receive_notes
        SET
          releated_po = ?,
          received_date = ?,
          supplier_name = ?,
          stock_location = ?,
          payee_name = ?,
          payment_method = ?,
          currency = ?,
          supplier_invoice_no = ?,
          remarks = ?,
          updated_on = NOW(),
          updated_by = ?
        WHERE id = ?
      `;

      connection.query(
        updateQuery,
        [
          releated_po,
          received_date,
          supplier_name,
          stock_location,
          payee_name,
          payment_method,
          currency,
          supplier_invoice_no,
          remarks,
          updated_by,
          id
        ],
        err => {
          if (err) return connection.rollback(() => res.status(500).json(err));

          // 2️⃣ Delete old GRN items
          connection.query(
            "DELETE FROM grn_items WHERE grn_no = ?",
            [id],
            async (err) => {
              if (err) return connection.rollback(() => res.status(500).json(err));

              // If no items → commit early
              if (!items || items.length === 0) {
                return connection.commit(() => res.json({ message: "GRN updated" }));
              }

              // 3️⃣ Insert new GRN items
              const itemValues = items.map(item => [
                id,
                item.item_name,
                item.quantity,
                item.rate,
                item.quantity * item.rate // calculate amount
              ]);

              connection.query(
                `INSERT INTO grn_items (grn_no, item_name, quantity, rate, amount) VALUES ?`,
                [itemValues],
                async (err) => {
                  if (err) return connection.rollback(() => res.status(500).json(err));

                  try {
                    // 4️⃣ Update Inventory for each item
                    for (const item of items) {
                      const existing = await new Promise((resolve, reject) => {
                        connection.query(
                          "SELECT quantity, rate FROM main_inventory WHERE item_name = ?",
                          [item.item_name],
                          (err, results) => {
                            if (err) return reject(err);
                            resolve(results[0]);
                          }
                        );
                      });

                      if (existing) {
                        const oldQty = Number(existing.quantity) || 0;
                        const oldRate = Number(existing.rate) || 0;

                        const grnQty = Number(item.quantity);
                        const grnRate = Number(item.rate);

                        const newQty = oldQty + grnQty;

                        // ✅ SIMPLE AVERAGE RATE
                        const newRate =
                          oldRate && grnRate
                            ? (oldRate + grnRate) / 2
                            : (oldRate || grnRate);

                        await new Promise((resolve, reject) => {
                          connection.query(
                            `
                            UPDATE main_inventory
                            SET quantity = ?, 
                                rate = ?, 
                                updated_on = NOW(),
                                updated_by = ?
                            WHERE item_name = ?
                            `,
                            [newQty, newRate, updated_by, item.item_name],
                            (err) => {
                              if (err) return reject(err);
                              resolve();
                            }
                          );
                        });

                      } else {
                        // Insert new inventory item
                        await new Promise((resolve, reject) => {
                          connection.query(
                            `
                            INSERT INTO main_inventory (
                              item_name,
                              quantity,
                              rate,
                              created_on,
                              created_by
                            ) VALUES (?, ?, ?, NOW(), ?)
                            `,
                            [
                              item.item_name,
                              item.quantity,
                              item.rate,
                              updated_by
                            ],
                            (err) => {
                              if (err) return reject(err);
                              resolve();
                            }
                          );
                        });
                      }
                    }

                    // 5️⃣ Commit transaction
                    connection.commit(err => {
                      if (err) return connection.rollback(() => res.status(500).json(err));

                      res.json({ message: "GRN updated + inventory updated successfully" });
                    });

                  } catch (error) {
                    connection.rollback(() => res.status(500).json({ message: "Inventory update failed", error }));
                  }
                }
              );
            }
          );
        }
      );
    });
  });
};

exports.deleteGRN = (req, res) => {
  const { id } = req.params;

  pool.getConnection((err, connection) => {
    if (err) return res.status(500).json(err);

    connection.beginTransaction(err => {
      if (err) return res.status(500).json(err);

      connection.query(
        "DELETE FROM grn_items WHERE grn_no = ?",
        [id],
        err => {
          if (err) return connection.rollback(() => res.status(500).json(err));

          connection.query(
            "DELETE FROM goods_receive_notes WHERE id = ?",
            [id],
            err => {
              if (err) return connection.rollback(() => res.status(500).json(err));

              connection.commit(err => {
                if (err) return connection.rollback(() => res.status(500).json(err));

                res.json({ message: "GRN deleted successfully" });
              });
            }
          );
        }
      );
    });
  });
};