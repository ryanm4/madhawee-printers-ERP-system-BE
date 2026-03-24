const pool = require("../../sql-connection");

// GET all issue notes with nested items
exports.getAllIssueNotesWithItems = (req, res) => {
  const query = `
    SELECT 
      n.id AS note_id,
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

    // Combine items per issue note
    const notesMap = new Map();

    results.forEach(row => {
      const noteId = row.note_id;
      if (!notesMap.has(noteId)) {
        notesMap.set(noteId, {
          id: noteId,
          date: row.date,
          remarks: row.remarks,
          collector_name: row.collector_name,
          items: []
        });
      }
      if (row.item_id) {
        notesMap.get(noteId).items.push({
          id: row.item_id,
          issue_note_id: row.issue_note_id,
          item_name: row.item_name,
          quantity: row.quantity
        });
      }
    });

    res.json(Array.from(notesMap.values()));
  });
};

exports.getIssueNoteByIdWithItems = (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      n.id AS note_id,
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
    if (!results.length) return res.status(404).json({ message: "Issue note not found" });

    const note = {
      id: results[0].note_id,
      date: results[0].date,
      remarks: results[0].remarks,
      collector_name: results[0].collector_name,
      items: []
    };

    results.forEach(row => {
      if (row.item_id) {
        note.items.push({
          id: row.item_id,
          issue_note_id: row.issue_note_id,
          item_name: row.item_name,
          quantity: row.quantity
        });
      }
    });

    res.json(note);
  });
};

exports.createIssueNoteWithItems = (req, res) => {
  const { date, remarks, collector_name, items, created_by } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: "Items must be an array" });
  }

  pool.getConnection((err, connection) => {
    if (err) return res.status(500).json({ message: "DB connection error", error: err });

    connection.beginTransaction(err => {
      if (err) return res.status(500).json({ message: "Transaction error", error: err });

      // 1️⃣ Insert issue note
      const noteQuery = `
        INSERT INTO erp_madhawi_db.\`issue-notes\` 
        (date, remarks, collector_name, created_on, created_by)
        VALUES (?, ?, ?, NOW(), ?)
      `;
      connection.query(noteQuery, [date, remarks, collector_name, created_by], (err, noteResult) => {
        if (err) return connection.rollback(() => res.status(500).json({ message: "DB error", error: err }));

        const noteId = noteResult.insertId;

        // 2️⃣ Insert issue note items
        const itemQuery = "INSERT INTO erp_madhawi_db.`issue_note-items` (issue_note_id, item_name, quantity) VALUES ?";
        const itemValues = items.map(i => [noteId, i.item_name, i.quantity]);

        connection.query(itemQuery, [itemValues], (err) => {
          if (err) return connection.rollback(() => res.status(500).json({ message: "DB error", error: err }));

          // 3️⃣ Update main_inventory
          const inventoryUpdates = items.map(i => {
            return new Promise((resolve, reject) => {
              const updateQuery = `
                UPDATE erp_madhawi_db.\`main_inventory\`
                SET quantity = quantity - ?, updated_on = NOW(), updated_by = ?
                WHERE item_name = ?
              `;
              connection.query(updateQuery, [i.quantity, created_by, i.item_name], (err, result) => {
                if (err) return reject(err);
                resolve(result);
              });
            });
          });

          Promise.all(inventoryUpdates)
            .then(() => {
              connection.commit(err => {
                if (err) return connection.rollback(() => res.status(500).json({ message: "Commit error", error: err }));
                res.status(201).json({ message: "Issue note with items created and inventory updated", id: noteId });
              });
            })
            .catch(err => connection.rollback(() => res.status(500).json({ message: "Inventory update failed", error: err })));
        });
      });
    });
  });
};

exports.updateIssueNoteWithItems = (req, res) => {
  const { id } = req.params;
  const { date, remarks, collector_name, items, updated_by } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: "Items must be an array" });
  }

  pool.getConnection((err, connection) => {
    if (err) return res.status(500).json({ message: "DB connection error", error: err });

    connection.beginTransaction(err => {
      if (err) return res.status(500).json({ message: "Transaction error", error: err });

      // 1️⃣ Get old items to adjust inventory
      const selectOldItems = "SELECT item_name, quantity FROM erp_madhawi_db.`issue_note-items` WHERE issue_note_id = ?";
      connection.query(selectOldItems, [id], (err, oldItems) => {
        if (err) return connection.rollback(() => res.status(500).json({ message: "DB error", error: err }));

        // 2️⃣ Update issue note
        const noteQuery = `
          UPDATE erp_madhawi_db.\`issue-notes\` 
          SET date = ?, remarks = ?, collector_name = ?, updated_on = NOW(), updated_by = ?
          WHERE id = ?
        `;
        connection.query(noteQuery, [date, remarks, collector_name, updated_by, id], (err, noteResult) => {
          if (err) return connection.rollback(() => res.status(500).json({ message: "DB error", error: err }));
          if (noteResult.affectedRows === 0) return connection.rollback(() => res.status(404).json({ message: "Issue note not found" }));

          // 3️⃣ Delete old items
          const deleteQuery = "DELETE FROM erp_madhawi_db.`issue_note-items` WHERE issue_note_id = ?";
          connection.query(deleteQuery, [id], (err) => {
            if (err) return connection.rollback(() => res.status(500).json({ message: "DB error", error: err }));

            // 4️⃣ Insert new items
            const itemQuery = "INSERT INTO erp_madhawi_db.`issue_note-items` (issue_note_id, item_name, quantity) VALUES ?";
            const itemValues = items.map(i => [id, i.item_name, i.quantity]);

            connection.query(itemQuery, [itemValues], async (err) => {
              if (err) return connection.rollback(() => res.status(500).json({ message: "DB error", error: err }));

              try {
                // 5️⃣ Adjust inventory: return old quantities first
                for (const old of oldItems) {
                  await new Promise((resolve, reject) => {
                    connection.query(
                      "UPDATE erp_madhawi_db.`main_inventory` SET quantity = quantity + ?, updated_on = NOW(), updated_by = ? WHERE item_name = ?",
                      [old.quantity, updated_by, old.item_name],
                      (err) => err ? reject(err) : resolve()
                    );
                  });
                }

                // 6️⃣ Subtract new quantities
                for (const ni of items) {
                  await new Promise((resolve, reject) => {
                    connection.query(
                      "UPDATE erp_madhawi_db.`main_inventory` SET quantity = quantity - ?, updated_on = NOW(), updated_by = ? WHERE item_name = ?",
                      [ni.quantity, updated_by, ni.item_name],
                      (err) => err ? reject(err) : resolve()
                    );
                  });
                }

                // ✅ Commit transaction
                connection.commit(err => {
                  if (err) return connection.rollback(() => res.status(500).json({ message: "Commit error", error: err }));
                  res.json({ message: "Issue note updated and inventory adjusted" });
                });

              } catch (invErr) {
                connection.rollback(() => res.status(500).json({ message: "Inventory adjustment failed", error: invErr }));
              }
            });
          });
        });
      });
    });
  });
};

exports.deleteIssueNoteWithItems = (req, res) => {
  const { id } = req.params;

  pool.getConnection((err, connection) => {
    if (err) return res.status(500).json({ message: "DB connection error", error: err });

    connection.beginTransaction(err => {
      if (err) return res.status(500).json({ message: "Transaction error", error: err });

      // 1️⃣ Delete all items
      const deleteItemsQuery = "DELETE FROM erp_madhawi_db.`issue_note-items` WHERE issue_note_id = ?";
      connection.query(deleteItemsQuery, [id], (err, itemsResult) => {
        if (err) return connection.rollback(() => res.status(500).json({ message: "DB error deleting items", error: err }));

        // 2️⃣ Delete the issue note
        const deleteNoteQuery = "DELETE FROM erp_madhawi_db.`issue-notes` WHERE id = ?";
        connection.query(deleteNoteQuery, [id], (err, noteResult) => {
          if (err) return connection.rollback(() => res.status(500).json({ message: "DB error deleting note", error: err }));
          if (noteResult.affectedRows === 0) return connection.rollback(() => res.status(404).json({ message: "Issue note not found" }));

          // ✅ Commit transaction
          connection.commit(err => {
            if (err) return connection.rollback(() => res.status(500).json({ message: "Commit error", error: err }));
            res.json({ message: "Issue note and all items deleted successfully" });
          });
        });
      });
    });
  });
};