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
      i.id AS issue_note_item_row_id,
      i.item_id,
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
      if (row.issue_note_item_row_id) {
        notesMap.get(noteId).items.push({
          id: row.issue_note_item_row_id,
          item_id: row.item_id,
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
      i.id AS issue_note_item_row_id,
      i.item_id,
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
      if (row.issue_note_item_row_id) {
        note.items.push({
          id: row.issue_note_item_row_id,
          item_id: row.item_id,
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
  const {
    job_id,
    date,
    remarks,
    collector_name,
    items,
    created_by,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Items array is required",
    });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({
        message: "Database connection failed",
        error: err,
      });
    }

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json(err);
      }

      try {
        // Create Issue Note
        const noteResult = await new Promise((resolve, reject) => {
          connection.query(
            `
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
            `,
            [
              job_id,
              date,
              remarks,
              collector_name,
              created_by,
            ],
            (err, result) => {
              if (err) return reject(err);
              resolve(result);
            }
          );
        });

        const issueNoteId = noteResult.insertId;

        // Process each item
        for (const item of items) {
          const inventory = await new Promise((resolve, reject) => {
            connection.query(
              `
              SELECT
                item_id,
                item_name,
                quantity
              FROM erp_madhawi_db.main_inventory
              WHERE item_id = ?
              `,
              [item.item_id],
              (err, rows) => {
                if (err) return reject(err);

                if (rows.length === 0) {
                  return reject(
                    new Error(`Item ID ${item.item_id} not found`)
                  );
                }

                resolve(rows[0]);
              }
            );
          });

          const availableQty = parseFloat(inventory.quantity);
          const requiredQty = parseFloat(item.quantity);

          if (availableQty < requiredQty) {
            throw new Error(
              `${inventory.item_name} has only ${availableQty} in stock`
            );
          }

          // Insert Issue Item
          await new Promise((resolve, reject) => {
            connection.query(
              `INSERT INTO erp_madhawi_db.\`issue_note-items\`
              (
                issue_note_id,
                item_id,
                item_name,
                quantity
              )
              VALUES (?, ?, ?, ?)
              `,
              [
                issueNoteId,
                inventory.item_id,
                inventory.item_name,
                requiredQty,
              ],
              (err) => {
                if (err) return reject(err);
                resolve();
              }
            );
          });

          // Deduct Inventory
          await new Promise((resolve, reject) => {
            connection.query(
              `
              UPDATE erp_madhawi_db.main_inventory
              SET
                quantity = quantity - ?,
                updated_on = NOW(),
                updated_by = ?
              WHERE item_id = ?
              `,
              [
                requiredQty,
                created_by,
                inventory.item_id,
              ],
              (err, result) => {
                if (err) return reject(err);

                if (result.affectedRows === 0) {
                  return reject(
                    new Error(
                      `Failed to update inventory for Item ID ${inventory.item_id}`
                    )
                  );
                }

                resolve();
              }
            );
          });
        }

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

          connection.release();

          res.status(201).json({
            message: "Issue note created successfully.",
            issue_note_id: issueNoteId,
          });
        });
      } catch (err) {
        connection.rollback(() => {
          connection.release();

          res.status(500).json({
            message: err.message,
          });
        });
      }
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
        SELECT item_id, quantity
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
              async (err) => {
                if (err) {
                  return connection.rollback(() =>
                    res.status(500).json({ message: "DB error", error: err }),
                  );
                }

                try {
                  // Fetch names of new items from main_inventory to save in database
                  const newItemsData = [];
                  for (const ni of items) {
                    const inventoryItem = await new Promise((resolve, reject) => {
                      connection.query(
                        "SELECT item_id, item_name FROM erp_madhawi_db.main_inventory WHERE item_id = ?",
                        [ni.item_id],
                        (err, results) => {
                          if (err) return reject(err);
                          resolve(results[0]);
                        }
                      );
                    });

                    if (inventoryItem) {
                      newItemsData.push({
                        item_id: ni.item_id,
                        item_name: inventoryItem.item_name,
                        quantity: ni.quantity,
                      });
                    }
                  }

                  // 4️⃣ Insert new items
                  const itemQuery = `
                    INSERT INTO erp_madhawi_db.\`issue_note-items\`
                    (issue_note_id, item_id, item_name, quantity)
                    VALUES ?
                  `;

                  const itemValues = newItemsData.map((i) => [
                    id,
                    i.item_id,
                    i.item_name,
                    i.quantity,
                  ]);

                  await new Promise((resolve, reject) => {
                    connection.query(itemQuery, [itemValues], (err) =>
                      err ? reject(err) : resolve()
                    );
                  });

                  // 5️⃣ Restore old inventory
                  for (const old of oldItems) {
                    if (old.item_id) {
                      await new Promise((resolve, reject) => {
                        connection.query(
                          `UPDATE erp_madhawi_db.\`main_inventory\`
                           SET quantity = quantity + ?, updated_on = NOW(), updated_by = ?
                           WHERE item_id = ?`,
                          [old.quantity, updated_by, old.item_id],
                          (err) => (err ? reject(err) : resolve()),
                        );
                      });
                    }
                  }

                  // 6️⃣ Deduct new inventory
                  for (const ni of newItemsData) {
                    await new Promise((resolve, reject) => {
                      connection.query(
                        `UPDATE erp_madhawi_db.\`main_inventory\`
                         SET quantity = quantity - ?, updated_on = NOW(), updated_by = ?
                         WHERE item_id = ?`,
                        [ni.quantity, updated_by, ni.item_id],
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
                      error: invErr.message,
                    }),
                  );
                }
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
        connection.release();
        return res
          .status(500)
          .json({ message: "Transaction error", error: err });
      }

      // 1️⃣ Fetch items to restore inventory quantities
      connection.query(
        "SELECT item_id, quantity FROM erp_madhawi_db.`issue_note-items` WHERE issue_note_id = ?",
        [id],
        async (err, items) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ message: "DB error fetching items", error: err });
            });
          }

          try {
            // 2️⃣ Restore quantity in main_inventory
            for (const item of items) {
              if (item.item_id) {
                await new Promise((resolve, reject) => {
                  connection.query(
                    `UPDATE erp_madhawi_db.main_inventory
                     SET quantity = quantity + ?, updated_on = NOW()
                     WHERE item_id = ?`,
                    [Number(item.quantity || 0), item.item_id],
                    err => (err ? reject(err) : resolve())
                  );
                });
              }
            }

            // 3️⃣ Delete items
            connection.query(
              "DELETE FROM erp_madhawi_db.`issue_note-items` WHERE issue_note_id = ?",
              [id],
              err => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).json({ message: "DB error deleting items", error: err });
                  });
                }

                // 4️⃣ Delete note
                connection.query(
                  "DELETE FROM erp_madhawi_db.`issue-notes` WHERE id = ?",
                  [id],
                  err => {
                    if (err) {
                      return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({ message: "DB error deleting note", error: err });
                      });
                    }

                    // 5️⃣ Commit transaction
                    connection.commit(err => {
                      if (err) {
                        return connection.rollback(() => {
                          connection.release();
                          res.status(500).json({ message: "Commit error", error: err });
                        });
                      }

                      connection.release();
                      res.json({ message: "Issue note deleted and inventory restored successfully" });
                    });
                  }
                );
              }
            );

          } catch (error) {
            connection.rollback(() => {
              connection.release();
              res.status(500).json({ message: "Failed to restore inventory for Issue Note", error: error.message });
            });
          }
        }
      );
    });
  });
};
