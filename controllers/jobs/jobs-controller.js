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
    materials = []
  } = req.body;

  if (!req.body) {
    return res.status(400).json({ message: "Request body missing" });
  }

  connection.beginTransaction((err) => {
    if (err) return res.status(500).json({ message: "Transaction start failed", error: err });

    // 1️⃣ Insert Job
    connection.query(
      `INSERT INTO jobs
      (po_id, job_name, job_open_date, product_type, paper_type_id,
       quantity, coating, packing_date, expiry_date,
       description, artwork, remarks, status, completed_qty, wastage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        po_id, job_name, job_open_date, product_type, paper_type_id,
        quantity, coating, packing_date, expiry_date,
        description, artwork, remarks, status, completed_qty, wastage
      ],
      (err, jobResult) => {
        if (err) return connection.rollback(() => res.status(500).json({ message: "Job insert failed", error: err }));

        const jobId = jobResult.insertId;

        // 2️⃣ Insert Materials + Deduct Inventory
        const insertMaterials = (index) => {
          if (index >= materials.length) {
            return connection.commit((err) => {
              if (err) return connection.rollback(() => res.status(500).json({ message: "Commit failed", error: err }));
              res.status(201).json({ message: "Job created successfully", job_id: jobId });
            });
          }

          const m = materials[index];

          connection.query(
            `SELECT quantity FROM main_inventory WHERE item_id = ? FOR UPDATE`,
            [m.item_id],
            (err, inventory) => {
              if (err || inventory.length === 0) {
                return connection.rollback(() => res.status(400).json({ message: `Inventory item not found: item_id ${m.item_id}` }));
              }

              if (Number(inventory[0].quantity) < Number(m.quantity)) {
                return connection.rollback(() => res.status(400).json({ message: `Insufficient stock for ${m.material_name}` }));
              }

              // Insert job material
              connection.query(
                `INSERT INTO job_materials
                 (job_id, item_id, material_type, material_name, quantity, status, remarks)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [jobId, m.item_id, m.material_type, m.material_name, m.quantity, m.status, m.remarks],
                (err) => {
                  if (err) return connection.rollback(() => res.status(500).json({ message: "Material insert failed", error: err }));

                  // Deduct inventory
                  connection.query(
                    `UPDATE main_inventory SET quantity = quantity - ? WHERE item_id = ?`,
                    [Number(m.quantity), m.item_id],
                    (err) => {
                      if (err) return connection.rollback(() => res.status(500).json({ message: "Inventory deduction failed", error: err }));

                      insertMaterials(index + 1);
                    }
                  );
                }
              );
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

  const { job_name = null, quantity = null, status = null, materials = [] } = req.body;

  connection.beginTransaction((err) => {
    if (err) return res.status(500).json({ message: "Transaction start failed", error: err });

    // 1️⃣ Restore old inventory quantities
    connection.query(
      `SELECT item_id, quantity FROM job_materials WHERE job_id = ?`,
      [jobId],
      (err, oldMaterials) => {
        if (err) return connection.rollback(() => res.status(500).json({ message: "Failed to fetch old materials", error: err }));

        const restoreInventory = (index) => {
          if (index >= oldMaterials.length) return updateJobTable();

          const m = oldMaterials[index];

          connection.query(
            `UPDATE main_inventory SET quantity = quantity + ? WHERE item_id = ?`,
            [Number(m.quantity), m.item_id],
            (err) => {
              if (err) return connection.rollback(() => res.status(500).json({ message: "Inventory restore failed", error: err }));
              restoreInventory(index + 1);
            }
          );
        };

        restoreInventory(0);

        // 2️⃣ Update job table
        function updateJobTable() {
          connection.query(
            `UPDATE jobs SET job_name = ?, quantity = ?, status = ? WHERE job_id = ?`,
            [job_name, quantity, status, jobId],
            (err) => {
              if (err) return connection.rollback(() => res.status(500).json({ message: "Job update failed", error: err }));
              deleteOldMaterials();
            }
          );
        }

        // 3️⃣ Delete old materials
        function deleteOldMaterials() {
          connection.query(`DELETE FROM job_materials WHERE job_id = ?`, [jobId], (err) => {
            if (err) return connection.rollback(() => res.status(500).json({ message: "Failed to delete old materials", error: err }));
            insertNewMaterials(0);
          });
        }

        // 4️⃣ Insert new materials + Deduct inventory
        function insertNewMaterials(index) {
          if (index >= materials.length) return connection.commit((err) => {
            if (err) return connection.rollback(() => res.status(500).json({ message: "Commit failed", error: err }));
            res.status(200).json({ message: "Job updated successfully", job_id: jobId });
          });

          const m = materials[index];

          connection.query(
            `SELECT quantity FROM main_inventory WHERE item_id = ? FOR UPDATE`,
            [m.item_id],
            (err, inventory) => {
              if (err || inventory.length === 0) return connection.rollback(() => res.status(400).json({ message: `Inventory item not found: item_id ${m.item_id}` }));

              if (Number(inventory[0].quantity) < Number(m.quantity)) return connection.rollback(() => res.status(400).json({ message: `Insufficient stock for ${m.material_name}` }));

              // Insert job material
              connection.query(
                `INSERT INTO job_materials
                 (job_id, item_id, material_type, material_name, quantity, status, remarks)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [jobId, m.item_id, m.material_type, m.material_name, m.quantity, m.status, m.remarks],
                (err) => {
                  if (err) return connection.rollback(() => res.status(500).json({ message: "Material insert failed", error: err }));

                  // Deduct inventory
                  connection.query(
                    `UPDATE main_inventory SET quantity = quantity - ? WHERE item_id = ?`,
                    [Number(m.quantity), m.item_id],
                    (err) => {
                      if (err) return connection.rollback(() => res.status(500).json({ message: "Inventory deduction failed", error: err }));

                      insertNewMaterials(index + 1);
                    }
                  );
                }
              );
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

      // 2️⃣ Fetch materials for this job
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

          // Optional: convert quantity to number
          const materials = materialResults.map((m) => ({
            ...m,
            quantity: m.quantity ? Number(m.quantity) : 0
          }));

          // 3️⃣ Respond with job + materials
          res.status(200).json({
            status: "success",
            data: {
              ...job,
              materials
            }
          });
        }
      );
    }
  );
};