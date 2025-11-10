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

    res.status(200).json({
      status: "success",
      data: results.length === 1 ? results[0] : results,
    });
  });
};
