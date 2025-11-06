const connection = require("../../sql-connection");

exports.getAllQuotes = (req, res, next) => {
  const query = `SELECT q.quote_id,q.customer_id,
  c.company_name,c.address AS customer_address,
  c.phone AS customer_phone, c.email AS customer_email,
  q.type_id, q.delivery_days, q.tax_type_id,
  q.currency, q.contact_person AS contact_person,
  q.notes, q.status, q.created_on, q.created_by,
  q.updated_on, q.updated_by
  FROM \`erp-madhawi-db\`.\`quotations\`
  q JOIN \`erp-madhawi-db\`.\`customers\` c
  ON q.customer_id = c.customer_id
  ORDER BY q.created_on DESC;`;

  connection.query(query, (err, results) => {
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
