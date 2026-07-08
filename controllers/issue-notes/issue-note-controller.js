const pool = require("../../sql-connection");

// GET all issue notes with nested items
exports.getAllIssueNotesWithItems = (req, res) => {
  const query = `
    SELECT 
      n.id AS note_id,
      n.job_id,
      n.date,
      n.remarks,
      n.collector_name,
      i.id AS item_id,
      i.issue_note_id,
      i.item_name,
      i.quantity
    FROM erp_madhawi_db.\`issue-notes\` n
    LEFT JOIN erp_madhawi_db.\`issue_note-items\` i
      ON n.id = i.issue_note_id
    ORDER BY n.id, i.id
  `;

  pool.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });

    const notesMap = new Map();

    results.forEach((row) => {
      const noteId = row.note_id;

      if (!notesMap.has(noteId)) {
        notesMap.set(noteId, {
          id: noteId,
          job_id: row.job_id,
          date: row.date,
          remarks: row.remarks,
          collector_name: row.collector_name,
          items: [],
        });
      }
      if (row.item_id) {
        notesMap.get(noteId).items.push({
          id: row.item_id,
          issue_note_id: row.issue_note_id,
          item_name: row.item_name,
          quantity: row.quantity,
        });
      }
    });

    res.json(Array.from(notesMap.values()));
  });
};

// GET issue note by ID with items
exports.getIssueNoteByIdWithItems = (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      n.id AS note_id,
      n.job_id,
      n.date,
      n.remarks,
      n.collector_name,
      i.id AS item_id,
      i.issue_note_id,
      i.item_name,
      i.quantity
    FROM erp_madhawi_db.\`issue-notes\` n
    LEFT JOIN erp_madhawi_db.\`issue_note-items\` i
      ON n.id = i.issue_note_id
    WHERE n.id = ?
    ORDER BY i.id
  `;

  pool.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });

    if (!results.length) {
      return res.status(404).json({ message: "Issue note not found" });
    }

    const note = {
      id: results[0].note_id,
      job_id: results[0].job_id,
      date: results[0].date,
      remarks: results[0].remarks,
      collector_name: results[0].collector_name,
      items: [],
    };

    results.forEach((row) => {
      if (row.item_id) {
        note.items.push({
          id: row.item_id,
          issue_note_id: row.issue_note_id,
          item_name: row.item_name,
          quantity: row.quantity,
        });
      }
    });

    res.json(note);
  });
};

// CREATE issue note with items
exports.createIssueNoteWithItems = (req, res) => {
  const { job_id, date, remarks, collector_name, items, created_by } = req.body;

  console.log("1. Controller started");
  console.log("Request:", req.body);

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Items must be a non-empty array",
    });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({
        message: "Database connection error",
        error: err,
      });
    }

    console.log("DB connection acquired");

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();

        return res.status(500).json({
          message: "Transaction start failed",
          error: err,
        });
      }

      console.log("Transaction started");

      // 1. Create Issue Note
      const noteQuery = `
        INSERT INTO erp_madhawi_db.\`issue-notes\`
        (
          job_id,
          date,
          remarks,
          collector_name,
          created_on,
          created_by
        )
        VALUES (?, ?, ?, ?, NOW(), ?)
      `;

      connection.query(
        noteQuery,
        [job_id, date, remarks, collector_name, created_by],
        (err, noteResult) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();

              res.status(500).json({
                message: "Issue note creation failed",
                error: err,
              });
            });
          }

          const issueNoteId = noteResult.insertId;

          console.log("Issue note created:", issueNoteId);

          // 2. Get inventory details
          const inventoryChecks = items.map((item) => {
            return new Promise((resolve, reject) => {
              const stockQuery = `
                SELECT
                  item_id,
                  item_name,
                  quantity
                FROM erp_madhawi_db.main_inventory
                WHERE item_id = ?
              `;

              connection.query(stockQuery, [item.item_id], (err, rows) => {
                if (err) {
                  return reject(err);
                }

                if (rows.length === 0) {
                  return reject(new Error(`Item ID ${item.item_id} not found`));
                }

                const inventoryItem = rows[0];

                if (Number(inventoryItem.quantity) < Number(item.quantity)) {
                  return reject(
                    new Error(
                      `Insufficient stock for ${inventoryItem.item_name}. Available: ${inventoryItem.quantity}`,
                    ),
                  );
                }

                resolve({
                  item_id: inventoryItem.item_id,
                  item_name: inventoryItem.item_name,
                  quantity: Number(item.quantity),
                });
              });
            });
          });

          Promise.all(inventoryChecks)

            .then((inventoryItems) => {
              console.log("Inventory validated:", inventoryItems);

              // 3. Insert issue note items

              const itemValues = inventoryItems.map((item) => [
                issueNoteId,
                item.item_id,
                item.item_name,
                item.quantity,
              ]);

              const insertItemsQuery = `
                INSERT INTO erp_madhawi_db.\`issue_note-items\`
                (
                  issue_note_id,
                  item_id,
                  item_name,
                  quantity
                )
                VALUES ?
              `;

              connection.query(insertItemsQuery, [itemValues], (err) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();

                    res.status(500).json({
                      message: "Issue items insert failed",
                      error: err,
                    });
                  });
                }

                // 4. Deduct inventory

                const updates = inventoryItems.map((item) => {
                  return new Promise((resolve, reject) => {
                    const updateQuery = `
                        UPDATE erp_madhawi_db.main_inventory
                        SET
                          quantity = quantity - ?,
                          updated_on = NOW(),
                          updated_by = ?
                        WHERE item_id = ?
                      `;

                    connection.query(
                      updateQuery,
                      [item.quantity, created_by, item.item_id],
                      (err, result) => {
                        if (err) {
                          return reject(err);
                        }

                        console.log(
                          "Inventory updated:",
                          item.item_id,
                          result.affectedRows,
                        );

                        if (result.affectedRows === 0) {
                          return reject(
                            new Error(
                              `Inventory update failed for item ${item.item_id}`,
                            ),
                          );
                        }

                        resolve();
                      },
                    );
                  });
                });

                Promise.all(updates)

                  .then(() => {
                    // 5. Commit transaction

                    connection.commit((err) => {
                      if (err) {
                        return connection.rollback(() => {
                          connection.release();

                          res.status(500).json({
                            message: "Commit failed",
                            error: err,
                          });
                        });
                      }

                      console.log("Transaction committed");

                      connection.release();

                      res.status(201).json({
                        message:
                          "Issue note created and inventory deducted successfully",

                        issue_note_id: issueNoteId,
                      });
                    });
                  })

                  .catch((err) => {
                    connection.rollback(() => {
                      connection.release();

                      res.status(500).json({
                        message: "Inventory update failed",
                        error: err.message,
                      });
                    });
                  });
              });
            })

            .catch((err) => {
              connection.rollback(() => {
                connection.release();

                res.status(400).json({
                  message: err.message,
                });
              });
            });
        },
      );
    });
  });
};

// UPDATE issue note with items
exports.updateIssueNoteWithItems = (req, res) => {
  const { id } = req.params;
  const { job_id, date, remarks, collector_name, items, updated_by } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: "Items must be an array" });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "DB connection error", error: err });
    }

    connection.beginTransaction((err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Transaction error", error: err });
      }

      // 1️⃣ Get old items
      const selectOldItems = `
        SELECT item_name, quantity
        FROM erp_madhawi_db.\`issue_note-items\`
        WHERE issue_note_id = ?
      `;

      connection.query(selectOldItems, [id], (err, oldItems) => {
        if (err) {
          return connection.rollback(() =>
            res.status(500).json({ message: "DB error", error: err }),
          );
        }

        // 2️⃣ Update note
        const noteQuery = `
          UPDATE erp_madhawi_db.\`issue-notes\`
          SET job_id = ?, date = ?, remarks = ?, collector_name = ?, updated_on = NOW(), updated_by = ?
          WHERE id = ?
        `;

        connection.query(
          noteQuery,
          [job_id, date, remarks, collector_name, updated_by, id],
          (err, result) => {
            if (err) {
              return connection.rollback(() =>
                res.status(500).json({ message: "DB error", error: err }),
              );
            }

            if (result.affectedRows === 0) {
              return connection.rollback(() =>
                res.status(404).json({ message: "Issue note not found" }),
              );
            }

            // 3️⃣ Delete old items
            connection.query(
              "DELETE FROM erp_madhawi_db.`issue_note-items` WHERE issue_note_id = ?",
              [id],
              (err) => {
                if (err) {
                  return connection.rollback(() =>
                    res.status(500).json({ message: "DB error", error: err }),
                  );
                }

                // 4️⃣ Insert new items
                const itemQuery = `
                  INSERT INTO erp_madhawi_db.\`issue_note-items\`
                  (issue_note_id, item_name, quantity)
                  VALUES ?
                `;

                const itemValues = items.map((i) => [
                  id,
                  i.item_name,
                  i.quantity,
                ]);

                connection.query(itemQuery, [itemValues], async (err) => {
                  if (err) {
                    return connection.rollback(() =>
                      res.status(500).json({ message: "DB error", error: err }),
                    );
                  }

                  try {
                    // 5️⃣ Restore old inventory
                    for (const old of oldItems) {
                      await new Promise((resolve, reject) => {
                        connection.query(
                          `UPDATE erp_madhawi_db.\`main_inventory\`
                           SET quantity = quantity + ?, updated_on = NOW(), updated_by = ?
                           WHERE item_name = ?`,
                          [old.quantity, updated_by, old.item_name],
                          (err) => (err ? reject(err) : resolve()),
                        );
                      });
                    }

                    // 6️⃣ Deduct new inventory
                    for (const ni of items) {
                      await new Promise((resolve, reject) => {
                        connection.query(
                          `UPDATE erp_madhawi_db.\`main_inventory\`
                           SET quantity = quantity - ?, updated_on = NOW(), updated_by = ?
                           WHERE item_name = ?`,
                          [ni.quantity, updated_by, ni.item_name],
                          (err) => (err ? reject(err) : resolve()),
                        );
                      });
                    }

                    connection.commit((err) => {
                      if (err) {
                        return connection.rollback(() =>
                          res
                            .status(500)
                            .json({ message: "Commit error", error: err }),
                        );
                      }

                      res.json({
                        message: "Issue note updated and inventory adjusted",
                      });
                    });
                  } catch (invErr) {
                    connection.rollback(() =>
                      res.status(500).json({
                        message: "Inventory adjustment failed",
                        error: invErr,
                      }),
                    );
                  }
                });
              },
            );
          },
        );
      });
    });
  });
};

// DELETE issue note with items
exports.deleteIssueNoteWithItems = (req, res) => {
  const { id } = req.params;

  pool.getConnection((err, connection) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "DB connection error", error: err });
    }

    connection.beginTransaction((err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Transaction error", error: err });
      }

      const deleteItemsQuery =
        "DELETE FROM erp_madhawi_db.`issue_note-items` WHERE issue_note_id = ?";

      connection.query(deleteItemsQuery, [id], (err) => {
        if (err) {
          return connection.rollback(() =>
            res
              .status(500)
              .json({ message: "DB error deleting items", error: err }),
          );
        }

        const deleteNoteQuery =
          "DELETE FROM erp_madhawi_db.`issue-notes` WHERE id = ?";

        connection.query(deleteNoteQuery, [id], (err, result) => {
          if (err) {
            return connection.rollback(() =>
              res
                .status(500)
                .json({ message: "DB error deleting note", error: err }),
            );
          }

          if (result.affectedRows === 0) {
            return connection.rollback(() =>
              res.status(404).json({ message: "Issue note not found" }),
            );
          }

          connection.commit((err) => {
            if (err) {
              return connection.rollback(() =>
                res.status(500).json({ message: "Commit error", error: err }),
              );
            }

            res.json({
              message: "Issue note and all items deleted successfully",
            });
          });
        });
      });
    });
  });
};
