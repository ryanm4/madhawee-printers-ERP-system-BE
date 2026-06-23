const pool = require("../../sql-connection");

exports.getAllQuotes = (req, res, next) => {
  const query = `
  SELECT 
    q.quote_id,
    q.customer_id,
    c.company_name,
    c.address AS customer_address,
    c.customer_type AS customer_type,
    c.phone AS customer_phone,
    c.email AS customer_email,
    q.type_id,
    q.delivery_days,
    q.validity_period,
    q.tax_type_id,
    q.currency,
    q.marketing_person,
    q.contact_person,
    q.notes,
    q.status,
    q.created_on,
    q.created_by,
    q.updated_on,
    q.updated_by
  FROM quotations q
  JOIN customers c
    ON q.customer_id = c.customer_id
  ORDER BY q.created_on DESC
`;

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

exports.getQuoteById = (req, res, next) => {
  const quoteId = req.params.quoteId;

  const query = `
    SELECT
    q.quote_id,
    q.customer_id,
    q.type_id,
    q.delivery_days,
    q.validity_period,
    q.tax_type_id,
    q.currency,
    q.sub_total,
    q.no_of_items,
    q.total_without_tax,
    q.net_total,
    q.contact_person,
    q.marketing_person,
    q.notes,
    q.created_on,
    q.created_by,
    q.updated_on,
    q.updated_by,
    q.status,
    qi.item_id,
    qi.item_category,
    qi.item_description,
    qi.item_qty,
    qi.item_unit_price,
    qi.item_unit_discount,
    qi.item_total_price
FROM quotations q
LEFT JOIN quote_items qi
    ON q.quote_id = qi.quote_id
WHERE q.quote_id = ?;
  `;

  pool.query(query, [quoteId], (err, results) => {
    if (err) {
      console.error("Error fetching quote by ID:", err);
      return next(err);
    }

    if (results.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "Quote not found",
      });
    }

    // Extract main quote (same for all rows)
    const quote = {
      quote_id: results[0].quote_id,
      customer_id: results[0].customer_id,
      type_id: results[0].type_id,
      delivery_days: results[0].delivery_days,
      validity_period: results[0].validity_period,
      tax_type_id: results[0].tax_type_id,
      currency: results[0].currency,
      sub_total: results[0].sub_total,
      no_of_items: results[0].no_of_items,
      total_without_tax: results[0].total_without_tax,
      net_total: results[0].net_total,
      contact_person: results[0].contact_person,
      marketing_person: results[0].marketing_person,
      notes: results[0].notes,
      created_on: results[0].created_on,
      created_by: results[0].created_by,
      updated_on: results[0].updated_on,
      updated_by: results[0].updated_by,
      status: results[0].status,
      items: [],
    };

    // Push each item into items array
    results.forEach((row) => {
      if (row.item_id) {
        quote.items.push({
          item_id: row.item_id,
          item_category: row.item_category,
          item_description: row.item_description,
          item_qty: row.item_qty,
          item_unit_price: row.item_unit_price,
          item_unit_discount: row.item_unit_discount,
          item_total_price: row.item_total_price,
        });
      }
    });

    res.status(200).json({
      status: "success",
      data: quote,
    });
  });
};

exports.createQuote = (req, res, next) => {
  const {
    customer_id,
    type_id,
    delivery_days,
    validity_period,
    tax_type_id,
    currency,
    sub_total,
    no_of_items,
    total_without_tax,
    net_total,
    contact_person,
    marketing_person,
    notes,
    created_by,
    updated_by,
    status,
    items,
  } = req.body;

  /* ---------- GET CONNECTION FROM POOL ---------- */
  pool.getConnection((err, connection) => {
    if (err) return next(err);

    /* ---------- START TRANSACTION ---------- */
    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return next(err);
      }

      /* ---------- INSERT QUOTATION ---------- */
      const quoteQuery = `
  INSERT INTO quotations (
    customer_id,
    type_id,
    delivery_days,
    validity_period,
    tax_type_id,
    currency,
    sub_total,
    no_of_items,
    total_without_tax,
    net_total,
    contact_person,
    marketing_person,
    notes,
    created_on,
    created_by,
    updated_on,
    updated_by,
    status
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NULL, ?, ?)
`;
      const quoteValues = [
        customer_id,
        type_id,
        delivery_days,
        validity_period,
        tax_type_id,
        currency,
        sub_total,
        no_of_items,
        total_without_tax,
        net_total,
        contact_person,
        marketing_person,
        notes,
        created_by,
        updated_by,
        status,
      ];

      connection.query(quoteQuery, quoteValues, (err, result) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            next(err);
          });
        }

        const quoteId = result.insertId;

        /* ---------- NO ITEMS CASE ---------- */
        if (!items || items.length === 0) {
          return connection.commit((err) => {
            connection.release();

            if (err) return next(err);

            res.status(201).json({
              status: "success",
              message: "Quotation added without items.",
            });
          });
        }

        /* ---------- INSERT ITEMS ---------- */
        const itemQuery = `
          INSERT INTO quote_items (
            quote_id, item_category, item_description,
            item_qty, item_unit_price, item_unit_discount, item_total_price
          ) VALUES ?
        `;

        const itemValues = items.map((item) => [
          quoteId,
          item.item_category,
          item.item_description,
          item.item_qty,
          item.item_unit_price,
          item.item_unit_discount,
          item.item_total_price,
        ]);

        connection.query(itemQuery, [itemValues], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              next(err);
            });
          }

          /* ---------- COMMIT ---------- */
          connection.commit((err) => {
            connection.release();

            if (err) return next(err);

            res.status(201).json({
              status: "success",
              message: "Quotation and items added successfully.",
            });
          });
        });
      });
    });
  });
};

exports.updateQuote = (req, res, next) => {
  const quoteId = req.params.quoteId;

  const {
    customer_id,
    type_id,
    delivery_days,
    validity_period,
    tax_type_id,
    currency,
    sub_total,
    no_of_items,
    total_without_tax,
    net_total,
    contact_person,
    marketing_person,
    notes,
    updated_by,
    status,
    items,
  } = req.body;

  /* ---------- GET CONNECTION FROM POOL ---------- */
  pool.getConnection((err, connection) => {
    if (err) return next(err);

    /* ---------- START TRANSACTION ---------- */
    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return next(err);
      }

      /* ---------- UPDATE QUOTATION ---------- */
      const updateQuoteQuery = `
  UPDATE quotations
  SET
    customer_id = ?,
    type_id = ?,
    delivery_days = ?,
    validity_period = ?,
    tax_type_id = ?,
    currency = ?,
    sub_total = ?,
    no_of_items = ?,
    total_without_tax = ?,
    net_total = ?,
    contact_person = ?,
    marketing_person = ?,
    notes = ?,
    updated_on = NOW(),
    updated_by = ?,
    status = ?
  WHERE quote_id = ?
`;

      const updateQuoteValues = [
        customer_id,
        type_id,
        delivery_days,
        validity_period,
        tax_type_id,
        currency,
        sub_total,
        no_of_items,
        total_without_tax,
        net_total,
        contact_person,
        marketing_person,
        notes,
        updated_by,
        status,
        quoteId,
      ];

      connection.query(updateQuoteQuery, updateQuoteValues, (err) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            next(err);
          });
        }

        /* ---------- DELETE EXISTING ITEMS ---------- */
        const deleteItemsQuery = `DELETE FROM quote_items WHERE quote_id = ?`;

        connection.query(deleteItemsQuery, [quoteId], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              next(err);
            });
          }

          /* ---------- NO ITEMS CASE ---------- */
          if (!items || items.length === 0) {
            return connection.commit((err) => {
              connection.release();

              if (err) return next(err);

              res.status(200).json({
                status: "success",
                message: "Quotation updated (no items provided)",
              });
            });
          }

          /* ---------- INSERT ITEMS ---------- */
          const insertItemsQuery = `
            INSERT INTO quote_items (
              quote_id, item_category, item_description,
              item_qty, item_unit_price, item_unit_discount, item_total_price
            ) VALUES ?
          `;

          const itemValues = items.map((item) => [
            quoteId,
            item.item_category,
            item.item_description,
            item.item_qty,
            item.item_unit_price,
            item.item_unit_discount,
            item.item_total_price,
          ]);

          connection.query(insertItemsQuery, [itemValues], (err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                next(err);
              });
            }

            /* ---------- COMMIT ---------- */
            connection.commit((err) => {
              connection.release();

              if (err) return next(err);

              res.status(200).json({
                status: "success",
                message: "Quotation and items updated successfully",
              });
            });
          });
        });
      });
    });
  });
};

exports.deleteQuote = (req, res, next) => {
  const quoteId = req.params.quoteId;

  /* ---------- GET CONNECTION FROM POOL ---------- */
  pool.getConnection((err, connection) => {
    if (err) return next(err);

    /* ---------- START TRANSACTION ---------- */
    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return next(err);
      }

      const deleteItemsQuery = `
        DELETE FROM quote_items WHERE quote_id = ?
      `;

      const deleteQuoteQuery = `
        DELETE FROM quotations WHERE quote_id = ?
      `;

      /* ---------- DELETE QUOTE ITEMS ---------- */
      connection.query(deleteItemsQuery, [quoteId], (err) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            next(err);
          });
        }

        /* ---------- DELETE QUOTE ---------- */
        connection.query(deleteQuoteQuery, [quoteId], (err, result) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              next(err);
            });
          }

          if (result.affectedRows === 0) {
            return connection.rollback(() => {
              connection.release();
              res.status(404).json({
                status: "fail",
                message: "Quote not found",
              });
            });
          }

          /* ---------- COMMIT ---------- */
          connection.commit((err) => {
            connection.release();

            if (err) return next(err);

            res.status(200).json({
              status: "success",
              message: "Quote and related items deleted successfully",
            });
          });
        });
      });
    });
  });
};

exports.getQuotesByCustomerId = (req, res, next) => {
  const customerId = req.params.customerId;

  // 1️⃣ Get all quotations for this customer
  const quoteQuery = `
    SELECT *
    FROM quotations
    WHERE customer_id = ?
      AND status = 'Created'
    ORDER BY created_on DESC
  `;

  pool.query(quoteQuery, [customerId], (err, quotes) => {
    if (err) {
      console.error("Error fetching quotations:", err);
      return next(err);
    }

    if (quotes.length === 0) {
      return res.status(200).json({
        status: "success",
        data: [],
      });
    }

    const quoteIds = quotes.map((q) => q.quote_id);

    // 2️⃣ Fetch all quote_items for these quoteIds
    const itemQuery = `
      SELECT *
      FROM quote_items
      WHERE quote_id IN (?)
    `;

    pool.query(itemQuery, [quoteIds], (err, items) => {
      if (err) {
        console.error("Error fetching quote items:", err);
        return next(err);
      }

      // 3️⃣ Attach items to the respective quote
      const quoteMap = {};

      quotes.forEach((q) => {
        quoteMap[q.quote_id] = {
          ...q,
          items: [],
        };
      });

      items.forEach((item) => {
        if (quoteMap[item.quote_id]) {
          quoteMap[item.quote_id].items.push(item);
        }
      });

      // Convert map to array
      const responseArray = Object.values(quoteMap);

      res.status(200).json({
        status: "success",
        data: responseArray,
      });
    });
  });
};
