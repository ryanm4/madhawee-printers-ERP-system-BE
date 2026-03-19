const pool = require("../../sql-connection");

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

  pool.query(query, [poId], (err, results) => {
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
  const query = `SELECT * FROM \`erp_madhawi_db\`.\`jobs\` ;`;
  pool.query(query, (err, results) => {
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


exports.createJob = (req, res, next) => {
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
    created_by,
    paperCoating = [],
    inks = []
  } = req.body;

  if (!req.body) {
    return res.status(400).json({ message: "Request body missing" });
  }

  const createdOn = new Date();

  pool.getConnection((err, connection) => {
    if (err) return next(err);

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return next(err);
      }

      // 1️⃣ Insert Job
      const jobQuery = `
        INSERT INTO jobs
        (po_id, customer_id, job_item, job_name, job_open_date, product_type, paper_type_id,
         quantity, coating, packing_date, expiry_date,
         description, artwork, remarks, status, completed_qty, wastage,
         old_plate_quantity, old_plate_status, old_plate_remarks,
         new_plate_quantity, new_plate_status, new_plate_remarks,
         created_on, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const jobValues = [
        po_id, customer_id, job_item, job_name, job_open_date, product_type, paper_type_id,
        quantity, coating, packing_date, expiry_date,
        description, artwork, remarks, status, completed_qty, wastage,
        old_plate_quantity, old_plate_status, old_plate_remarks,
        new_plate_quantity, new_plate_status, new_plate_remarks,
        createdOn, created_by
      ];

      connection.query(jobQuery, jobValues, (err, jobResult) => {
        if (err) return connection.rollback(() => { connection.release(); next(err); });

        const jobId = jobResult.insertId;

        // 2️⃣ Generate Job Number
        let finalJobNumber = null;
        if (job_number) {
          const year = new Date().getFullYear().toString().slice(-2);
          const paddedId = String(jobId).padStart(4, "0");
          finalJobNumber = job_number.replace("####", paddedId).replace("YY", year);

          connection.query(
            `UPDATE jobs SET job_number = ? WHERE job_id = ?`,
            [finalJobNumber, jobId],
            (err) => {
              if (err) return connection.rollback(() => { connection.release(); next(err); });
              insertPaperCoating(0);
            }
          );
        } else {
          insertPaperCoating(0);
        }

        // 3️⃣ Insert Paper Coating + Materials
        function insertPaperCoating(pcIndex) {
          if (pcIndex >= paperCoating.length) return insertInks(0);

          const pc = paperCoating[pcIndex];

          connection.query(
            `INSERT INTO paper_coating_data (job_id, paper, coating, delivery_date) VALUES (?, ?, ?, ?)`,
            [jobId, pc.paper, pc.coating, pc.delivery_date],
            (err) => {
              if (err) return connection.rollback(() => { connection.release(); next(err); });

              const materials = pc.materials || [];
              insertMaterials(materials, 0, () => insertPaperCoating(pcIndex + 1));
            }
          );
        }

        // 4️⃣ Insert Materials (allows negative inventory)
        function insertMaterials(materials, mIndex, callback) {
          if (mIndex >= materials.length) return callback();

          const m = materials[mIndex];

          connection.query(
            `INSERT INTO job_materials
             (job_id, item_id, material_type, material_name, material_description, size, quantity, status, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              jobId,
              m.item_id,
              m.material_type,
              m.material_name,
              m.material_description || null,
              m.size || null,
              m.quantity,
              m.status,
              m.remarks
            ],
            (err) => {
              if (err) return connection.rollback(() => { connection.release(); next(err); });

              // Deduct inventory (allows going negative)
              connection.query(
                `UPDATE main_inventory SET quantity = quantity - ? WHERE item_id = ?`,
                [Number(m.quantity), m.item_id],
                (err) => {
                  if (err) return connection.rollback(() => { connection.release(); next(err); });

                  insertMaterials(materials, mIndex + 1, callback);
                }
              );
            }
          );
        }

        // 5️⃣ Insert Inks
        function insertInks(iIndex) {
          if (iIndex >= inks.length) return commitTransaction();

          const i = inks[iIndex];

          connection.query(
            `INSERT INTO job_ink_data (job_id, ink, quantity, status, remarks) VALUES (?, ?, ?, ?, ?)`,
            [jobId, i.ink, i.quantity, i.status, i.remarks],
            (err) => {
              if (err) return connection.rollback(() => { connection.release(); next(err); });

              insertInks(iIndex + 1);
            }
          );
        }

        // 6️⃣ Commit
        function commitTransaction() {
          connection.commit((err) => {
            connection.release();
            if (err) return next(err);

            res.status(201).json({
              message: "Job created successfully",
              job_id: jobId,
              job_number: finalJobNumber
            });
          });
        }

      }); // end insert job
    }); // end transaction
  }); // end getConnection
};



exports.updateJob = (req, res, next) => {
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
    job_item = null,
    completed_qty = 0,
    wastage = "0",
    updated_by,
    paperCoating = [],
    inks = []
  } = req.body;

  const updatedOn = new Date();

  pool.getConnection((err, connection) => {
    if (err) return next(err);

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        return next(err);
      }

      // 1️⃣ Restore inventory from old materials
      connection.query(`SELECT item_id, quantity FROM job_materials WHERE job_id=?`, [jobId], (err, oldMaterials) => {
        if (err) return connection.rollback(() => { connection.release(); next(err); });

        const restoreInventory = i => {
          if (i >= oldMaterials.length) return updateJobTable();

          const m = oldMaterials[i];
          connection.query(
            `UPDATE main_inventory SET quantity = quantity + ? WHERE item_id=?`,
            [Number(m.quantity), m.item_id],
            err => {
              if (err) return connection.rollback(() => { connection.release(); next(err); });
              restoreInventory(i + 1);
            }
          );
        };
        restoreInventory(0);
      });

      // 2️⃣ Update job table
      function updateJobTable() {
        connection.query(
          `UPDATE jobs SET
            job_name=?, product_type=?, paper_type_id=?, quantity=?, coating=?,
            packing_date=?, expiry_date=?, description=?, artwork=?,
            remarks=?, status=?, completed_qty=?, job_item=?, wastage=?,
            updated_on=?, updated_by=?
           WHERE job_id=?`,
          [
            job_name, product_type, paper_type_id, quantity, coating,
            packing_date, expiry_date, description, artwork,
            remarks, status, completed_qty, job_item, wastage,
            updatedOn, updated_by, jobId
          ],
          err => {
            if (err) return connection.rollback(() => { connection.release(); next(err); });
            deleteOldData();
          }
        );
      }

      // 3️⃣ Delete old materials + paper coating
      function deleteOldData() {
        connection.query(`DELETE FROM job_materials WHERE job_id=?`, [jobId], err => {
          if (err) return connection.rollback(() => { connection.release(); next(err); });

          connection.query(`DELETE FROM paper_coating_data WHERE job_id=?`, [jobId], err => {
            if (err) return connection.rollback(() => { connection.release(); next(err); });

            insertPaperCoating(0);
          });
        });
      }

      // 4️⃣ Insert new paper coating + materials
      function insertPaperCoating(pcIndex) {
        if (pcIndex >= paperCoating.length) return updateInks(0);

        const pc = paperCoating[pcIndex];

        connection.query(
          `INSERT INTO paper_coating_data (job_id, paper, coating, delivery_date) VALUES (?, ?, ?, ?)`,
          [jobId, pc.paper, pc.coating, pc.delivery_date],
          err => {
            if (err) return connection.rollback(() => { connection.release(); next(err); });

            const materials = pc.materials || [];
            insertMaterials(materials, 0, () => insertPaperCoating(pcIndex + 1));
          }
        );
      }

      // Insert materials with inventory check
      function insertMaterials(materials, mIndex, callback) {
        if (mIndex >= materials.length) return callback();

        const m = materials[mIndex];

        connection.query(`SELECT quantity FROM main_inventory WHERE item_id=? FOR UPDATE`, [m.item_id], (err, invRows) => {
          if (err || invRows.length === 0) return connection.rollback(() => { connection.release(); next(err || new Error("Inventory not found")); });
          if (Number(invRows[0].quantity) < Number(m.quantity)) return connection.rollback(() => { connection.release(); next(new Error(`Insufficient stock for item ${m.item_id}`)); });

          connection.query(
            `INSERT INTO job_materials (job_id, item_id, material_type, material_name, material_description, size, quantity, status, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              jobId, m.item_id, m.material_type, m.material_name, m.material_description || null,
              m.size || null, m.quantity, m.status, m.remarks
            ],
            err => {
              if (err) return connection.rollback(() => { connection.release(); next(err); });

              // Deduct inventory
              connection.query(`UPDATE main_inventory SET quantity=quantity-? WHERE item_id=?`, [Number(m.quantity), m.item_id], err => {
                if (err) return connection.rollback(() => { connection.release(); next(err); });
                insertMaterials(materials, mIndex + 1, callback);
              });
            }
          );
        });
      }

      // 5️⃣ Update inks
      function updateInks(iIndex) {
        if (iIndex === 0) {
          connection.query(`DELETE FROM job_ink_data WHERE job_id=?`, [jobId], err => {
            if (err) return connection.rollback(() => { connection.release(); next(err); });
            insertInks(0);
          });
        }
      }

      function insertInks(iIndex) {
        if (iIndex >= inks.length) return commitTransaction();

        const i = inks[iIndex];
        connection.query(
          `INSERT INTO job_ink_data (job_id, ink, quantity, status, remarks) VALUES (?, ?, ?, ?, ?)`,
          [jobId, i.ink, i.quantity, i.status, i.remarks],
          err => {
            if (err) return connection.rollback(() => { connection.release(); next(err); });
            insertInks(iIndex + 1);
          }
        );
      }

      // 6️⃣ Commit
      function commitTransaction() {
        connection.commit(err => {
          connection.release();
          if (err) return next(err);

          res.status(200).json({ message: "Job updated successfully", job_id: jobId });
        });
      }
    });
  });
};



exports.deleteJob = (req, res, next) => {
  const jobId = req.params.jobId;
  if (!jobId) return res.status(400).json({ message: "jobId parameter is required" });

  pool.getConnection((err, connection) => {
    if (err) return next(err);

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        return next(err);
      }

      // 1️⃣ Fetch materials
      connection.query(`SELECT item_id, quantity FROM job_materials WHERE job_id=?`, [jobId], (err, materials) => {
        if (err) return connection.rollback(() => { connection.release(); next(err); });

        // Restore inventory
        const restoreInventory = i => {
          if (i >= materials.length) return deleteMaterials();

          const m = materials[i];
          connection.query(
            `UPDATE main_inventory SET quantity = quantity + ? WHERE item_id=?`,
            [Number(m.quantity), m.item_id],
            err => {
              if (err) return connection.rollback(() => { connection.release(); next(err); });
              restoreInventory(i + 1);
            }
          );
        };

        // Delete job_materials
        const deleteMaterials = () => {
          connection.query(`DELETE FROM job_materials WHERE job_id=?`, [jobId], err => {
            if (err) return connection.rollback(() => { connection.release(); next(err); });
            deletePaperCoating();
          });
        };

        // Delete paper coating
        const deletePaperCoating = () => {
          connection.query(`DELETE FROM paper_coating_data WHERE job_id=?`, [jobId], err => {
            if (err) return connection.rollback(() => { connection.release(); next(err); });
            deleteInks();
          });
        };

        // Delete inks
        const deleteInks = () => {
          connection.query(`DELETE FROM job_ink_data WHERE job_id=?`, [jobId], err => {
            if (err) return connection.rollback(() => { connection.release(); next(err); });
            deleteJobRow();
          });
        };

        // Delete job
        const deleteJobRow = () => {
          connection.query(`DELETE FROM jobs WHERE job_id=?`, [jobId], err => {
            if (err) return connection.rollback(() => { connection.release(); next(err); });

            connection.commit(err => {
              connection.release();
              if (err) return next(err);

              res.status(200).json({ status: "success", message: "Job deleted successfully", job_id: jobId });
            });
          });
        };

        // Start restore
        restoreInventory(0);
      });
    });
  });
};

exports.getJobById = (req, res, next) => {
  const jobId = req.params.jobId;

  if (!jobId) return res.status(400).json({ message: "jobId parameter is required" });

  // 1️⃣ Fetch job
  pool.query(`SELECT * FROM jobs WHERE job_id = ?`, [jobId], (err, jobResults) => {
    if (err) return next(err);

    if (jobResults.length === 0) return res.status(404).json({ message: "Job not found" });

    const job = jobResults[0];
    const customerId = job.customer_id;

    // 2️⃣ Fetch customer
    pool.query(
      `SELECT customer_id, company_name, customer_type, address,
              phone, email, vat_type, vat_no, logo_url,
              contact_person, contact_person_email,
              contact_person_phone, status
       FROM customers WHERE customer_id = ?`,
      [customerId],
      (err, customerResults) => {
        if (err) return next(err);

        const customer = customerResults.length > 0 ? customerResults[0] : null;

        // 3️⃣ Fetch all materials
        pool.query(
          `SELECT jm.*, mi.item_category, mi.item_sub_category, mi.unit_of_measure
           FROM job_materials jm
           LEFT JOIN main_inventory mi ON jm.item_id = mi.item_id
           WHERE jm.job_id = ?`,
          [jobId],
          (err, materialResults) => {
            if (err) return next(err);

            const materials = materialResults.map(m => ({
              item_id: m.item_id,
              material_type: m.material_type,
              material_name: m.material_name,
              size: m.size,
              material_description: m.material_description || null,
              quantity: m.quantity ? Number(m.quantity) : 0,
              status: m.status,
              remarks: m.remarks
            }));

            // 4️⃣ Fetch paper coating
            pool.query(`SELECT * FROM paper_coating_data WHERE job_id = ?`, [jobId], (err, coatingResults) => {
              if (err) return next(err);

              const paperCoating = coatingResults.map(pc => ({
                id: pc.id,
                paper: pc.paper,
                coating: pc.coating,
                delivery_date: pc.delivery_date,
                materials
              }));

              // 5️⃣ Fetch inks
              pool.query(`SELECT * FROM job_ink_data WHERE job_id = ?`, [jobId], (err, inkResults) => {
                if (err) return next(err);

                // 6️⃣ Final structured response
                res.status(200).json({
                  status: "success",
                  data: {
                    ...job,
                    customer,
                    paperCoating,
                    inks: inkResults
                  }
                });
              });
            });
          }
        );
      }
    );
  });
};
