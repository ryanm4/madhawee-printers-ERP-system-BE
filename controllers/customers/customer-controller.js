const connection = require("../../sql-connection");

exports.getAllCustomers = (req, res, next) => {
  const query = `SELECT * FROM \`erp-madhawi-db\`.\`customers\`;`;
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
