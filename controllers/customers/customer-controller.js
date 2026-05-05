const pool = require("../../sql-connection");

exports.getAllCustomers = (req, res, next) => {
  const query = `
    SELECT 
      c.*,
      cc.contact_id,
      cc.name AS contact_name,
      cc.email AS contact_email,
      cc.phone AS contact_phone
    FROM customers c
    LEFT JOIN customer_contacts cc 
      ON c.customer_id = cc.customer_id
    ORDER BY c.customer_id DESC
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching customers:", err);
      return next(err);
    }

    // 🔹 Group contacts under each customer
    const customersMap = {};

    results.forEach(row => {
      if (!customersMap[row.customer_id]) {
        customersMap[row.customer_id] = {
          customer_id: row.customer_id,
          company_name: row.company_name,
          customer_type: row.customer_type,
          address: row.address,
          phone: row.phone,
          email: row.email,
          vat_type: row.vat_type,
          vat_no: row.vat_no,
          credit_period: row.credit_period,
          logo_url: row.logo_url,
          created_on: row.created_on,
          created_by: row.created_by,
          updated_on: row.updated_on,
          updated_by: row.updated_by,
          status: row.status,
          contacts: []
        };
      }

      // Add contact if exists
      if (row.contact_id) {
        customersMap[row.customer_id].contacts.push({
          contact_id: row.contact_id,
          name: row.contact_name,
          email: row.contact_email,
          phone: row.contact_phone
        });
      }
    });

    const formattedResults = Object.values(customersMap);

    res.status(200).json({
      status: "success",
      results: formattedResults.length,
      data: formattedResults
    });
  });
};

exports.getCustomerById = (req, res, next) => {
  const customerId = req.params.customerId;

  const customerQuery = `SELECT * FROM customers WHERE customer_id = ?`;
  const contactQuery = `SELECT name, email, phone FROM customer_contacts WHERE customer_id = ?`;

  pool.getConnection((err, connection) => {
    if (err) return next(err);

    connection.query(customerQuery, [customerId], (err, customerResults) => {
      if (err) {
        connection.release();
        return next(err);
      }

      if (customerResults.length === 0) {
        connection.release();
        return res.status(404).json({ message: "Customer not found" });
      }

      connection.query(contactQuery, [customerId], (err, contactResults) => {
        connection.release();

        if (err) return next(err);

        res.status(200).json({
          status: "success",
          data: {
            ...customerResults[0],
            contacts: contactResults
          }
        });
      });
    });
  });
};

exports.createCustomer = (req, res, next) => {
  const {
    company_name,
    customer_type,
    address,
    phone,
    email,
    vat_type,
    vat_no,
    credit_period,
    logo_url,
    contacts = [],
    created_by,
    status,
  } = req.body;

  pool.getConnection((err, connection) => {
    if (err) return next(err);

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return next(err);
      }

      const customerQuery = `
        INSERT INTO customers (
          company_name, customer_type, address, phone, email,
          vat_type, vat_no, credit_period, logo_url,
          created_on, created_by, updated_on, updated_by, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?, ?)
      `;

      const customerValues = [
        company_name,
        customer_type,
        address,
        phone,
        email,
        vat_type,
        vat_no,
        credit_period,
        logo_url,
        created_by,
        created_by,
        status,
      ];

      connection.query(customerQuery, customerValues, (err, result) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            next(err);
          });
        }

        const customerId = result.insertId;

        if (contacts.length === 0) {
          return connection.commit(() => {
            connection.release();
            res.status(201).json({
              status: "success",
              customer_id: customerId,
            });
          });
        }

        const contactValues = contacts.map(c => [
          customerId,
          c.name,
          c.email,
          c.phone
        ]);

        const contactQuery = `
          INSERT INTO customer_contacts (customer_id, name, email, phone)
          VALUES ?
        `;

        connection.query(contactQuery, [contactValues], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              next(err);
            });
          }

          connection.commit((err) => {
            connection.release();
            if (err) return next(err);

            res.status(201).json({
              status: "success",
              customer_id: customerId,
            });
          });
        });
      });
    });
  });
};

exports.updateCustomer = (req, res, next) => {
  const customerId = req.params.customerId;

  if (!customerId) {
    return res.status(400).json({
      status: "fail",
      message: "Customer ID is required",
    });
  }

  const {
    company_name,
    customer_type,
    address,
    phone,
    email,
    vat_type,
    vat_no,
    credit_period,
    logo_url,
    contacts = [],
    updated_by,
    status,
  } = req.body;

  pool.getConnection((err, connection) => {
    if (err) return next(err);

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return next(err);
      }

      try {
        // 1️⃣ Update customer
        const updateCustomerQuery = `
          UPDATE customers SET
            company_name = ?,
            customer_type = ?,
            address = ?,
            phone = ?,
            email = ?,
            vat_type = ?,
            vat_no = ?,
            credit_period = ?,
            logo_url = ?,
            updated_on = NOW(),
            updated_by = ?,
            status = ?
          WHERE customer_id = ?
        `;

        await new Promise((resolve, reject) => {
          connection.query(
            updateCustomerQuery,
            [
              company_name,
              customer_type,
              address,
              phone,
              email,
              vat_type,
              vat_no,
              credit_period,
              logo_url,
              updated_by,
              status,
              customerId,
            ],
            (err, result) => {
              if (err) return reject(err);
              if (result.affectedRows === 0)
                return reject(new Error("Customer not found"));
              resolve();
            }
          );
        });

        // 2️⃣ Get existing contacts from DB
        const existingContacts = await new Promise((resolve, reject) => {
          connection.query(
            `SELECT contact_id FROM customer_contacts WHERE customer_id = ?`,
            [customerId],
            (err, results) => {
              if (err) return reject(err);
              resolve(results);
            }
          );
        });

        const existingIds = existingContacts.map(c => c.contact_id);
        const incomingIds = contacts
          .filter(c => c.contact_id)
          .map(c => c.contact_id);

        // 3️⃣ DELETE removed contacts
        const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));

        if (idsToDelete.length > 0) {
          await new Promise((resolve, reject) => {
            connection.query(
              `DELETE FROM customer_contacts WHERE contact_id IN (?)`,
              [idsToDelete],
              (err) => {
                if (err) return reject(err);
                resolve();
              }
            );
          });
        }

        // 4️⃣ UPDATE existing contacts
        const updatePromises = contacts
          .filter(c => c.contact_id)
          .map(c => {
            return new Promise((resolve, reject) => {
              connection.query(
                `
                UPDATE customer_contacts
                SET name = ?, email = ?, phone = ?
                WHERE contact_id = ? AND customer_id = ?
                `,
                [c.name, c.email, c.phone, c.contact_id, customerId],
                (err) => {
                  if (err) return reject(err);
                  resolve();
                }
              );
            });
          });

        await Promise.all(updatePromises);

        // 5️⃣ INSERT new contacts
        const newContacts = contacts.filter(c => !c.contact_id);

        if (newContacts.length > 0) {
          const values = newContacts.map(c => [
            customerId,
            c.name,
            c.email,
            c.phone,
          ]);

          await new Promise((resolve, reject) => {
            connection.query(
              `
              INSERT INTO customer_contacts (customer_id, name, email, phone)
              VALUES ?
              `,
              [values],
              (err) => {
                if (err) return reject(err);
                resolve();
              }
            );
          });
        }

        // ✅ Commit
        connection.commit((err) => {
          connection.release();
          if (err) return next(err);

          res.status(200).json({
            status: "success",
            message: "Customer and contacts updated successfully",
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          next(error);
        });
      }
    });
  });
};

exports.deleteCustomer = (req, res, next) => {
  const customerId = req.params.customerId;

  if (!customerId) {
    return res.status(400).json({
      status: "fail",
      message: "Customer ID is required",
    });
  }

  pool.getConnection((err, connection) => {
    if (err) return next(err);

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return next(err);
      }

      // Example: delete quotes or orders related to the customer
      const deleteQuotesQuery = `DELETE FROM quotations WHERE customer_id = ?`;
      const deleteCustomerQuery = `DELETE FROM customers WHERE customer_id = ?`;

      connection.query(deleteQuotesQuery, [customerId], (err) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            next(err);
          });
        }

        connection.query(deleteCustomerQuery, [customerId], (err, results) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              next(err);
            });
          }

          if (results.affectedRows === 0) {
            return connection.rollback(() => {
              connection.release();
              res.status(404).json({
                status: "fail",
                message: "Customer not found",
              });
            });
          }

          connection.commit((err) => {
            connection.release();
            if (err) return next(err);

            res.status(200).json({
              status: "success",
              message: "Customer and related records deleted successfully",
            });
          });
        });
      });
    });
  });
};
