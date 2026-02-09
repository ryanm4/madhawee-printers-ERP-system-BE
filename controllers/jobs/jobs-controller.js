const connection = require("../../sql-connection");

exports.getJobsByPOId = (req, res, next) => {
  const poId = req.params.poId;

  const query = "SELECT * FROM jobs WHERE po_id = ?";

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

    // ✅ Always return jobs as an array
    // ✅ Convert paper_type_id to array
    const jobs = results.map((job) => ({
      ...job,
      paper_type_id: job.paper_type_id
        ? job.paper_type_id
          .toString()
          .split(",")
          .map((id) => Number(id))
        : [],
    }));

    res.status(200).json({
      status: "success",
      data: jobs,
    });
  });
};

exports.getAllJobs = (req, res, next) => {
  const query = `SELECT * FROM \`erp-madhawi-db\`.\`jobs\`;`;
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
    materials = [],
    paperCoating = [] // 👈 NEW
  } = req.body;

  if (!req.body) {
    return res.status(400).json({ message: "Request body missing" });
  }

  connection.beginTransaction((err) => {
    if (err)
      return res.status(500).json({ message: "Transaction start failed", error: err });

    // 1️⃣ Insert Job
    connection.query(
      `INSERT INTO jobs
      (po_id, customer_id, job_name, job_open_date, product_type, paper_type_id,
       quantity, coating, packing_date, expiry_date,
       description, artwork, remarks, status, completed_qty, wastage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        po_id, customer_id, job_name, job_open_date, product_type, paper_type_id,
        quantity, coating, packing_date, expiry_date,
        description, artwork, remarks, status, completed_qty, wastage
      ],
      (err, jobResult) => {
        if (err)
          return connection.rollback(() =>
            res.status(500).json({ message: "Job insert failed", error: err })
          );

        const jobId = jobResult.insertId;

        // 2️⃣ Insert Materials
        const insertMaterials = (index) => {
          if (index >= materials.length) {
            return insertPaperCoating(0); // 👈 NEXT STEP
          }

          const m = materials[index];

          connection.query(
            `SELECT quantity FROM main_inventory WHERE item_id = ? FOR UPDATE`,
            [m.item_id],
            (err, inventory) => {
              if (err || inventory.length === 0) {
                return connection.rollback(() =>
                  res.status(400).json({
                    message: `Inventory item not found: item_id ${m.item_id}`
                  })
                );
              }

              if (Number(inventory[0].quantity) < Number(m.quantity)) {
                return connection.rollback(() =>
                  res.status(400).json({
                    message: `Insufficient stock for ${m.material_name}`
                  })
                );
              }

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

        // 3️⃣ Insert Paper Coating
        const insertPaperCoating = (index) => {
          if (index >= paperCoating.length) {
            return connection.commit((err) => {
              if (err)
                return connection.rollback(() =>
                  res.status(500).json({ message: "Commit failed", error: err })
                );

              res.status(201).json({
                message: "Job created successfully",
                job_id: jobId
              });
            });
          }

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

        insertMaterials(0);
      }
    );
  });
};



exports.updateJob = (req, res) => {
  const jobId = req.params.jobId;

  if (!req.body) return res.status(400).json({ message: "Request body missing" });

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
    completed_qty = 0,
    wastage = "0",
    materials = [],
    paperCoating = []
  } = req.body;

  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ message: "Transaction start failed", error: err });

    // 1️⃣ Restore old inventory quantities
    connection.query(
      `SELECT item_id, quantity FROM job_materials WHERE job_id = ?`,
      [jobId],
      (err, oldMaterials) => {
        if (err) return connection.rollback(() => res.status(500).json({ message: "Failed to fetch old materials", error: err }));

        const restoreInventory = index => {
          if (index >= oldMaterials.length) return updateJobTable();

          const m = oldMaterials[index];
          connection.query(
            `UPDATE main_inventory SET quantity = quantity + ? WHERE item_id = ?`,
            [Number(m.quantity), m.item_id],
            err => {
              if (err) return connection.rollback(() => res.status(500).json({ message: "Inventory restore failed", error: err }));
              restoreInventory(index + 1);
            }
          );
        };

        restoreInventory(0);

        // 2️⃣ Update jobs table with all fields
        function updateJobTable() {
          connection.query(
            `UPDATE jobs SET
               job_name = ?,
               product_type = ?,
               paper_type_id = ?,
               quantity = ?,
               coating = ?,
               packing_date = ?,
               expiry_date = ?,
               description = ?,
               artwork = ?,
               remarks = ?,
               status = ?,
               completed_qty = ?,
               wastage = ?
             WHERE job_id = ?`,
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
              wastage,
              jobId
            ],
            err => {
              if (err) return connection.rollback(() => res.status(500).json({ message: "Job update failed", error: err }));
              deleteOldMaterials();
            }
          );
        }

        // 3️⃣ Delete old materials
        function deleteOldMaterials() {
          connection.query(`DELETE FROM job_materials WHERE job_id = ?`, [jobId], err => {
            if (err) return connection.rollback(() => res.status(500).json({ message: "Failed to delete old materials", error: err }));
            insertNewMaterials(0);
          });
        }

        // 4️⃣ Insert new materials and deduct inventory
        function insertNewMaterials(index) {
          if (index >= materials.length) return upsertPaperCoating();

          const m = materials[index];

          connection.query(
            `SELECT quantity FROM main_inventory WHERE item_id = ? FOR UPDATE`,
            [m.item_id],
            (err, inventory) => {
              if (err || inventory.length === 0)
                return connection.rollback(() =>
                  res.status(400).json({ message: `Inventory item not found: item_id ${m.item_id}` })
                );

              if (Number(inventory[0].quantity) < Number(m.quantity))
                return connection.rollback(() =>
                  res.status(400).json({ message: `Insufficient stock for ${m.material_name}` })
                );

              connection.query(
                `INSERT INTO job_materials
                 (job_id, item_id, material_type, material_name, quantity, status, remarks)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [jobId, m.item_id, m.material_type, m.material_name, m.quantity, m.status, m.remarks],
                err => {
                  if (err) return connection.rollback(() => res.status(500).json({ message: "Material insert failed", error: err }));

                  connection.query(
                    `UPDATE main_inventory SET quantity = quantity - ? WHERE item_id = ?`,
                    [Number(m.quantity), m.item_id],
                    err => {
                      if (err) return connection.rollback(() => res.status(500).json({ message: "Inventory deduction failed", error: err }));
                      insertNewMaterials(index + 1);
                    }
                  );
                }
              );
            }
          );
        }

        // 5️⃣ Upsert paper coating
        function upsertPaperCoating(index = 0) {
          if (index >= paperCoating.length) {
            return connection.commit(err => {
              if (err) return connection.rollback(() => res.status(500).json({ message: "Commit failed", error: err }));

              res.status(200).json({ message: "Job updated successfully", job_id: jobId });
            });
          }

          const p = paperCoating[index];

          if (p.id) {
            // UPDATE existing
            connection.query(
              `UPDATE paper_coating_data SET paper = ?, coating = ?, delivery_date = ? WHERE id = ? AND job_id = ?`,
              [p.paper, p.coating, p.delivery_date, p.id, jobId],
              err => {
                if (err) return connection.rollback(() => res.status(500).json({ message: "Paper coating update failed", error: err }));
                upsertPaperCoating(index + 1);
              }
            );
          } else {
            // INSERT new
            connection.query(
              `INSERT INTO paper_coating_data (job_id, paper, coating, delivery_date) VALUES (?, ?, ?, ?)`,
              [jobId, p.paper, p.coating, p.delivery_date],
              err => {
                if (err) return connection.rollback(() => res.status(500).json({ message: "Paper coating insert failed", error: err }));
                upsertPaperCoating(index + 1);
              }
            );
          }
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

  // 1️⃣ Fetch the job
  connection.query(
    `SELECT * FROM jobs WHERE job_id = ?`,
    [jobId],
    (err, jobResults) => {
      if (err) {
        return res.status(500).json({ message: "Failed to fetch job", error: err });
      }

      if (jobResults.length === 0) {
        return res.status(404).json({ message: "Job not found" });
      }

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
          if (err) {
            return res.status(500).json({ message: "Failed to fetch job materials", error: err });
          }

          const materials = materialResults.map((m) => ({
            ...m,
            quantity: m.quantity ? Number(m.quantity) : 0
          }));

          // 3️⃣ Fetch customer
          connection.query(
            `SELECT 
              customer_id,
              company_name,
              customer_type,
              address,
              phone,
              email,
              vat_type,
              vat_no,
              logo_url,
              contact_person,
              contact_person_email,
              contact_person_phone,
              status
             FROM customers
             WHERE customer_id = ?`,
            [customerId],
            (err, customerResults) => {
              if (err) {
                return res.status(500).json({
                  message: "Failed to fetch customer",
                  error: err
                });
              }

              const customer =
                customerResults.length > 0 ? customerResults[0] : null;

              // 4️⃣ Fetch paper coating data
              connection.query(
                `SELECT * FROM paper_coating_data WHERE job_id = ?`,
                [jobId],
                (err, coatingResults) => {
                  if (err) {
                    return res.status(500).json({
                      message: "Failed to fetch paper coating data",
                      error: err
                    });
                  }

                  // 5️⃣ Final response
                  res.status(200).json({
                    status: "success",
                    data: {
                      ...job,
                      customer,
                      materials,
                      paperCoatingData: coatingResults // 👈 added here
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
};
