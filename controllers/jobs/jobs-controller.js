const connection = require("../../sql-connection");

exports.getJobsByPOId = (req, res, next) => {
  const poId = req.params.poId;

  const query = `
    SELECT 
      j.*,
      pcd.id AS coating_id,
      pcd.paper,
      pcd.coating,
      pcd.delivery_date,
      jid.id AS ink_id,
      jid.ink,
      jid.quantity,
      jid.status AS ink_status,
      jid.remarks AS ink_remarks
    FROM jobs j
    LEFT JOIN paper_coating_data pcd 
      ON j.job_id = pcd.job_id
    LEFT JOIN job_ink_data jid
      ON j.job_id = jid.job_id
    WHERE j.po_id = ? 
    ORDER BY j.created_on DESC
  `;

  connection.query(query, [poId], (err, results) => {
    if (err) {
      console.error("Error fetching jobs:", err);
      return next(err);
    }

    if (results.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No jobs found for the given PO ID",
      });
    }

    // 🔹 Group rows by job
    const jobMap = {};

    results.forEach((row) => {
      if (!jobMap[row.job_id]) {
        jobMap[row.job_id] = {
          ...row,
          paper_type_id: row.paper_type_id
            ? row.paper_type_id
                .toString()
                .split(",")
                .map((id) => Number(id))
            : [],
          paper_coating_data: [],
          job_ink_data: [],
        };
      }

      // Add coating if exists
      if (row.coating_id) {
        jobMap[row.job_id].paper_coating_data.push({
          id: row.coating_id,
          paper: row.paper,
          coating: row.coating,
          delivery_date: row.delivery_date,
        });
      }

      // Add ink if exists
      if (row.ink_id) {
        jobMap[row.job_id].job_ink_data.push({
          id: row.ink_id,
          ink: row.ink,
          quantity: row.quantity,
          status: row.ink_status,
          remarks: row.ink_remarks,
        });
      }
    });

    res.status(200).json({
      status: "success",
      data: Object.values(jobMap),
    });
  });
};





exports.getAllJobs = (req, res, next) => {
  const query = `SELECT * FROM \`erp-madhawi-db\`.\`jobs\` ;`;
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching quotes:", err);
      return next(err);
    } else {
      res.status(200).json({
        status: "success",
        data: results,
      });
    }
  });
};

exports.createJob = (req, res) => {
  const {
    po_id,
    customer_id,
    job_item,
    job_name,
    job_open_date,
    product_type,
    paper_type_id,
    quantity,
    coating,
    packing_date,
    expiry_date,
    description,
    artwork,
    remarks,
    status,
    completed_qty,
    wastage,
    job_number,
    old_plate_quantity,
    old_plate_status,
    old_plate_remarks,
    new_plate_quantity,
    new_plate_status,
    new_plate_remarks,
    created_by,   // Comes from body
    materials = [],
    paperCoating = [],
    inks = [] // ✅ NEW
  } = req.body;

  if (!req.body) {
    return res.status(400).json({ message: "Request body missing" });
  }

  const createdOn = new Date(); // system datetime

  connection.beginTransaction((err) => {
    if (err)
      return res.status(500).json({ message: "Transaction start failed", error: err });

    // 1️⃣ Insert Job
    connection.query(
      `INSERT INTO jobs
      (po_id, customer_id, job_item, job_name, job_open_date, product_type, paper_type_id,
       quantity, coating, packing_date, expiry_date,
       description, artwork, remarks, status, completed_qty, wastage,
       old_plate_quantity, old_plate_status, old_plate_remarks,
       new_plate_quantity, new_plate_status, new_plate_remarks,
       created_on, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        po_id, customer_id, job_item, job_name, job_open_date, product_type, paper_type_id,
        quantity, coating, packing_date, expiry_date,
        description, artwork, remarks, status, completed_qty, wastage,
        old_plate_quantity,
        old_plate_status,
        old_plate_remarks,
        new_plate_quantity,
        new_plate_status,
        new_plate_remarks,
        createdOn,
        created_by
      ],
      (err, jobResult) => {
        if (err)
          return connection.rollback(() =>
            res.status(500).json({ message: "Job insert failed", error: err })
          );

        const jobId = jobResult.insertId;

        // 2️⃣ Generate Job Number
        const year = new Date().getFullYear().toString().slice(-2);
        const paddedId = String(jobId).padStart(4, "0");

        const finalJobNumber = job_number
          ? job_number.replace("####", paddedId).replace("YY", year)
          : null;

        // 3️⃣ Update job_number
        connection.query(
          `UPDATE jobs SET job_number = ? WHERE job_id = ?`,
          [finalJobNumber, jobId],
          (err) => {
            if (err)
              return connection.rollback(() =>
                res.status(500).json({ message: "Job number update failed", error: err })
              );

            // 4️⃣ Insert Materials
            const insertMaterials = (index) => {
              if (index >= materials.length) return insertPaperCoating(0);

              const m = materials[index];

              connection.query(
                `SELECT quantity FROM main_inventory WHERE item_id = ? FOR UPDATE`,
                [m.item_id],
                (err, inventory) => {
                  if (err || inventory.length === 0)
                    return connection.rollback(() =>
                      res.status(400).json({ message: `Inventory item not found` })
                    );

                  if (Number(inventory[0].quantity) < Number(m.quantity))
                    return connection.rollback(() =>
                      res.status(400).json({ message: `Insufficient stock` })
                    );

                  connection.query(
                    `INSERT INTO job_materials
                     (job_id, item_id, material_type, material_name, quantity, status, remarks)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [jobId, m.item_id, m.material_type, m.material_name, m.quantity, m.status, m.remarks],
                    (err) => {
                      if (err)
                        return connection.rollback(() =>
                          res.status(500).json({ message: "Material insert failed", error: err })
                        );

                      connection.query(
                        `UPDATE main_inventory SET quantity = quantity - ? WHERE item_id = ?`,
                        [Number(m.quantity), m.item_id],
                        (err) => {
                          if (err)
                            return connection.rollback(() =>
                              res.status(500).json({ message: "Inventory deduction failed", error: err })
                            );

                          insertMaterials(index + 1);
                        }
                      );
                    }
                  );
                }
              );
            };

            // 5️⃣ Insert Paper Coating
            const insertPaperCoating = (index) => {
              if (index >= paperCoating.length) return insertInks(0);

              const p = paperCoating[index];

              connection.query(
                `INSERT INTO paper_coating_data
                 (job_id, paper, coating, delivery_date)
                 VALUES (?, ?, ?, ?)`,
                [jobId, p.paper, p.coating, p.delivery_date],
                (err) => {
                  if (err)
                    return connection.rollback(() =>
                      res.status(500).json({ message: "Paper coating insert failed", error: err })
                    );

                  insertPaperCoating(index + 1);
                }
              );
            };

            // 6️⃣ Insert Inks
            const insertInks = (index) => {
              if (index >= inks.length) {
                return connection.commit((err) => {
                  if (err)
                    return connection.rollback(() =>
                      res.status(500).json({ message: "Commit failed", error: err })
                    );

                  res.status(201).json({
                    message: "Job created successfully",
                    job_id: jobId,
                    job_number: finalJobNumber
                  });
                });
              }

              const i = inks[index];

              connection.query(
                `INSERT INTO job_ink_data
                 (job_id, ink, quantity, status, remarks)
                 VALUES (?, ?, ?, ?, ?)`,
                [jobId, i.ink, i.quantity, i.status, i.remarks],
                (err) => {
                  if (err)
                    return connection.rollback(() =>
                      res.status(500).json({ message: "Ink insert failed", error: err })
                    );

                  insertInks(index + 1);
                }
              );
            };

            insertMaterials(0);
          }
        );
      }
    );
  });
};



exports.updateJob = (req, res) => {
  const jobId = req.params.jobId;

  if (!req.body)
    return res.status(400).json({ message: "Request body missing" });

  const {
    job_name = null,
    product_type = null,
    paper_type_id = null,
    quantity = null,
    coating = null,
    packing_date = null,
    expiry_date = null,
    description = null,
    artwork = null,
    remarks = null,
    status = null,
    job_item = null,
    completed_qty = 0,
    wastage = "0",
    updated_by, // ✅ comes from body
    materials = [],
    paperCoating = [],
    inks = [] // ✅ UPDATE ONLY
  } = req.body;

  const updatedOn = new Date(); // system datetime

  connection.beginTransaction(err => {
    if (err)
      return res.status(500).json({
        message: "Transaction start failed",
        error: err
      });

    // 1️⃣ Restore inventory from old materials
    connection.query(
      `SELECT item_id, quantity FROM job_materials WHERE job_id=?`,
      [jobId],
      (err, oldMaterials) => {
        if (err)
          return connection.rollback(() =>
            res.status(500).json({
              message: "Failed to fetch old materials",
              error: err
            })
          );

        const restoreInventory = i => {
          if (i >= oldMaterials.length) return updateJobTable();

          const m = oldMaterials[i];

          connection.query(
            `UPDATE main_inventory SET quantity=quantity+? WHERE item_id=?`,
            [Number(m.quantity), m.item_id],
            err => {
              if (err)
                return connection.rollback(() =>
                  res.status(500).json({
                    message: "Inventory restore failed",
                    error: err
                  })
                );

              restoreInventory(i + 1);
            }
          );
        };

        restoreInventory(0);

        // 2️⃣ Update jobs table
        function updateJobTable() {
          connection.query(
            `UPDATE jobs SET
              job_name=?, product_type=?, paper_type_id=?, quantity=?, coating=?,
              packing_date=?, expiry_date=?, description=?, artwork=?,
              remarks=?, status=?, completed_qty=?, job_item=?, wastage=?,
              updated_on=?, updated_by=?
             WHERE job_id=?`,
            [
              job_name,
              product_type,
              paper_type_id,
              quantity,
              coating,
              packing_date,
              expiry_date,
              description,
              artwork,
              remarks,
              status,
              completed_qty,
              job_item,
              wastage,
              updatedOn,
              updated_by,
              jobId
            ],
            err => {
              if (err)
                return connection.rollback(() =>
                  res.status(500).json({
                    message: "Job update failed",
                    error: err
                  })
                );

              deleteOldMaterials();
            }
          );
        }

        // 3️⃣ Delete old materials
        function deleteOldMaterials() {
          connection.query(
            `DELETE FROM job_materials WHERE job_id=?`,
            [jobId],
            err => {
              if (err)
                return connection.rollback(() =>
                  res.status(500).json({
                    message: "Delete old materials failed",
                    error: err
                  })
                );

              insertNewMaterials(0);
            }
          );
        }

        // 4️⃣ Insert new materials
        function insertNewMaterials(i) {
          if (i >= materials.length) return upsertPaperCoating();

          const m = materials[i];

          connection.query(
            `SELECT quantity FROM main_inventory WHERE item_id=? FOR UPDATE`,
            [m.item_id],
            (err, inv) => {
              if (err || inv.length === 0)
                return connection.rollback(() =>
                  res.status(400).json({
                    message: "Inventory item not found"
                  })
                );

              if (Number(inv[0].quantity) < Number(m.quantity))
                return connection.rollback(() =>
                  res.status(400).json({
                    message: "Insufficient stock"
                  })
                );

              connection.query(
                `INSERT INTO job_materials
                 (job_id,item_id,material_type,material_name,quantity,status,remarks)
                 VALUES (?,?,?,?,?,?,?)`,
                [
                  jobId,
                  m.item_id,
                  m.material_type,
                  m.material_name,
                  m.quantity,
                  m.status,
                  m.remarks
                ],
                err => {
                  if (err)
                    return connection.rollback(() =>
                      res.status(500).json({
                        message: "Material insert failed",
                        error: err
                      })
                    );

                  connection.query(
                    `UPDATE main_inventory SET quantity=quantity-? WHERE item_id=?`,
                    [Number(m.quantity), m.item_id],
                    err => {
                      if (err)
                        return connection.rollback(() =>
                          res.status(500).json({
                            message: "Inventory deduction failed",
                            error: err
                          })
                        );

                      insertNewMaterials(i + 1);
                    }
                  );
                }
              );
            }
          );
        }

        // 5️⃣ Upsert Paper Coating
        function upsertPaperCoating(i = 0) {
          if (i >= paperCoating.length) return updateInks();

          const p = paperCoating[i];

          if (p.id) {
            connection.query(
              `UPDATE paper_coating_data
               SET paper=?, coating=?, delivery_date=?
               WHERE id=? AND job_id=?`,
              [p.paper, p.coating, p.delivery_date, p.id, jobId],
              err => {
                if (err)
                  return connection.rollback(() =>
                    res.status(500).json({
                      message: "Paper coating update failed",
                      error: err
                    })
                  );

                upsertPaperCoating(i + 1);
              }
            );
          } else {
            connection.query(
              `INSERT INTO paper_coating_data
               (job_id,paper,coating,delivery_date)
               VALUES (?,?,?,?)`,
              [jobId, p.paper, p.coating, p.delivery_date],
              err => {
                if (err)
                  return connection.rollback(() =>
                    res.status(500).json({
                      message: "Paper coating insert failed",
                      error: err
                    })
                  );

                upsertPaperCoating(i + 1);
              }
            );
          }
        }

        // 6️⃣ ✅ UPDATE INKS ONLY
        function updateInks(i = 0) {
          if (i >= inks.length) {
            return connection.commit(err => {
              if (err)
                return connection.rollback(() =>
                  res.status(500).json({
                    message: "Commit failed",
                    error: err
                  })
                );

              res.status(200).json({
                message: "Job updated successfully",
                job_id: jobId
              });
            });
          }

          const ink = inks[i];

          if (!ink.id)
            return connection.rollback(() =>
              res.status(400).json({
                message: "Ink ID required for update"
              })
            );

          connection.query(
            `UPDATE job_ink_data
             SET ink=?, quantity=?, status=?, remarks=?
             WHERE id=? AND job_id=?`,
            [
              ink.ink,
              ink.quantity,
              ink.status,
              ink.remarks,
              ink.id,
              jobId
            ],
            err => {
              if (err)
                return connection.rollback(() =>
                  res.status(500).json({
                    message: "Ink update failed",
                    error: err
                  })
                );

              updateInks(i + 1);
            }
          );
        }
      }
    );
  });
};




exports.getJobById = (req, res) => {
  const jobId = req.params.jobId;

  if (!jobId) {
    return res.status(400).json({ message: "jobId parameter is required" });
  }

  // 1️⃣ Fetch job
  connection.query(
    `SELECT * FROM jobs WHERE job_id = ?`,
    [jobId],
    (err, jobResults) => {
      if (err)
        return res.status(500).json({ message: "Failed to fetch job", error: err });

      if (jobResults.length === 0)
        return res.status(404).json({ message: "Job not found" });

      const job = jobResults[0];
      const customerId = job.customer_id;

      // 2️⃣ Fetch materials
      connection.query(
        `SELECT jm.*, mi.item_category, mi.item_sub_category, mi.unit_of_measure
         FROM job_materials jm
         LEFT JOIN main_inventory mi ON jm.item_id = mi.item_id
         WHERE jm.job_id = ?`,
        [jobId],
        (err, materialResults) => {
          if (err)
            return res.status(500).json({
              message: "Failed to fetch job materials",
              error: err
            });

          const materials = materialResults.map(m => ({
            ...m,
            quantity: m.quantity ? Number(m.quantity) : 0
          }));

          // 3️⃣ Fetch customer
          connection.query(
            `SELECT 
              customer_id, company_name, customer_type, address,
              phone, email, vat_type, vat_no, logo_url,
              contact_person, contact_person_email,
              contact_person_phone, status
             FROM customers
             WHERE customer_id = ?`,
            [customerId],
            (err, customerResults) => {
              if (err)
                return res.status(500).json({
                  message: "Failed to fetch customer",
                  error: err
                });

              const customer =
                customerResults.length > 0 ? customerResults[0] : null;

              // 4️⃣ Fetch paper coating
              connection.query(
                `SELECT * FROM paper_coating_data WHERE job_id = ?`,
                [jobId],
                (err, coatingResults) => {
                  if (err)
                    return res.status(500).json({
                      message: "Failed to fetch paper coating data",
                      error: err
                    });

                  // 5️⃣ ✅ Fetch inks
                  connection.query(
                    `SELECT * FROM job_ink_data WHERE job_id = ?`,
                    [jobId],
                    (err, inkResults) => {
                      if (err)
                        return res.status(500).json({
                          message: "Failed to fetch ink data",
                          error: err
                        });

                      // 6️⃣ Final response
                      res.status(200).json({
                        status: "success",
                        data: {
                          ...job,
                          customer,
                          materials,
                          paperCoatingData: coatingResults,
                          inks: inkResults // ✅ added here
                        }
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
};


exports.deleteJob = (req, res) => {
  const jobId = req.params.jobId;

  if (!jobId) {
    return res.status(400).json({ message: "jobId parameter is required" });
  }

  connection.beginTransaction(err => {
    if (err) {
      return res.status(500).json({
        message: "Transaction start failed",
        error: err
      });
    }

    // 1️⃣ Get materials to restore inventory
    connection.query(
      `SELECT item_id, quantity FROM job_materials WHERE job_id = ?`,
      [jobId],
      (err, materials) => {
        if (err) {
          return connection.rollback(() =>
            res.status(500).json({
              message: "Failed to fetch job materials",
              error: err
            })
          );
        }

        // 2️⃣ Restore inventory
        const restoreInventory = index => {
          if (index >= materials.length) return deletePaperCoating();

          const m = materials[index];

          connection.query(
            `UPDATE main_inventory 
             SET quantity = quantity + ? 
             WHERE item_id = ?`,
            [Number(m.quantity), m.item_id],
            err => {
              if (err) {
                return connection.rollback(() =>
                  res.status(500).json({
                    message: "Inventory restore failed",
                    error: err
                  })
                );
              }

              restoreInventory(index + 1);
            }
          );
        };

        // 3️⃣ Delete paper coating
        const deletePaperCoating = () => {
          connection.query(
            `DELETE FROM paper_coating_data WHERE job_id = ?`,
            [jobId],
            err => {
              if (err) {
                return connection.rollback(() =>
                  res.status(500).json({
                    message: "Failed to delete paper coating data",
                    error: err
                  })
                );
              }

              deleteInks();
            }
          );
        };

        // 4️⃣ ✅ Delete ink data
        const deleteInks = () => {
          connection.query(
            `DELETE FROM job_ink_data WHERE job_id = ?`,
            [jobId],
            err => {
              if (err) {
                return connection.rollback(() =>
                  res.status(500).json({
                    message: "Failed to delete ink data",
                    error: err
                  })
                );
              }

              deleteMaterials();
            }
          );
        };

        // 5️⃣ Delete job materials
        const deleteMaterials = () => {
          connection.query(
            `DELETE FROM job_materials WHERE job_id = ?`,
            [jobId],
            err => {
              if (err) {
                return connection.rollback(() =>
                  res.status(500).json({
                    message: "Failed to delete job materials",
                    error: err
                  })
                );
              }

              deleteJobRow();
            }
          );
        };

        // 6️⃣ Delete job
        const deleteJobRow = () => {
          connection.query(
            `DELETE FROM jobs WHERE job_id = ?`,
            [jobId],
            err => {
              if (err) {
                return connection.rollback(() =>
                  res.status(500).json({
                    message: "Failed to delete job",
                    error: err
                  })
                );
              }

              connection.commit(err => {
                if (err) {
                  return connection.rollback(() =>
                    res.status(500).json({
                      message: "Commit failed",
                      error: err
                    })
                  );
                }

                res.status(200).json({
                  status: "success",
                  message: "Job deleted successfully"
                });
              });
            }
          );
        };

        restoreInventory(0);
      }
    );
  });
};
