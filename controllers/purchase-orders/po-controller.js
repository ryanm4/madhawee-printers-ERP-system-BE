const connection = require("../../sql-connection");

exports.getAllPO = (req, res, next) => {
  const query = `SELECT * FROM \`erp-madhawi-db\`.\`purchase_orders\`;`;
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching purchase orders:", err);
      return next(err);
    } else {
      res.status(200).json({
        status: "success",
        data: results,
      });
    }
  });
};
