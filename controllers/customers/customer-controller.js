const pool = require("../../sql-connection");

exports.getAllCustomers = (req, res, next) => {
  const query = `SELECT * FROM \`erp_madhawi_db\`.\`customers\`;`;
  pool.query(query, (err, results) => {
    // console.log(results);
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

exports.getCustomerById = (req, res, next) => {
  const customerId = req.params.customerId;

  const query = `
    SELECT 
      customer_id,
      customer_type,
      company_name,
      address,
      phone,
      email,
      vat_type,
      vat_no,
      credit_period,
      logo_url,
      contact_person,
      contact_person_email,
      contact_person_phone,
      created_on,
      created_by,
      updated_on,
      updated_by,
      status
    FROM customers
    WHERE customer_id = ?
  `;

  pool.query(query, [customerId], (err, results) => {
    if (err) {
      console.error("Error fetching customer:", err);
      return next(err);
    }

    if (results.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "Customer not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: results[0],
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
    contact_person,
    contact_person_email,
    contact_person_phone,
    created_by,
    status,
  } = req.body;

  const query = `
  INSERT INTO customers (
    company_name,
    customer_type,
    address,
    phone,
    email,
    vat_type,
    vat_no,
    credit_period,
    logo_url,
    contact_person,
    contact_person_email,
    contact_person_phone,
    created_on,
    created_by,
    updated_on,
    updated_by,
    status
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?, ?)
`;

  const values = [
    company_name,
    customer_type,
    address,
    phone,
    email,
    vat_type,
    vat_no,
    credit_period,
    logo_url,
    contact_person,
    contact_person_email,
    contact_person_phone,
    created_by,
    created_by,
    status,
  ];

  pool.query(query, values, (err, results) => {
    if (err) {
      console.error("Error creating customer:", err);
      return next(err);
    }

    res.status(201).json({
      status: "success",
      message: "Customer created successfully",
      customer_id: results.insertId,
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
    contact_person,
    contact_person_email,
    contact_person_phone,
    updated_by,
    status,
  } = req.body;

  const query = `
    UPDATE customers
    SET
      company_name = ?,
      customer_type = ?,
      address = ?,
      phone = ?,
      email = ?,
      vat_type = ?,
      vat_no = ?,
      credit_period = ?,
      logo_url = ?,
      contact_person = ?,
      contact_person_email = ?,
      contact_person_phone = ?,
      updated_on = NOW(),
      updated_by = ?,
      status = ?
    WHERE customer_id = ?
  `;

  const values = [
    company_name,
    customer_type,
    address,
    phone,
    email,
    vat_type,
    vat_no,
    credit_period,
    logo_url,
    contact_person,
    contact_person_email,
    contact_person_phone,
    updated_by,
    status,
    customerId,
  ];

  pool.query(query, values, (err, results) => {
    if (err) {
      console.error("Error updating customer:", err);
      return next(err);
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        status: "fail",
        message: "Customer not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Customer updated successfully",
      updated_customer_id: customerId,
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
