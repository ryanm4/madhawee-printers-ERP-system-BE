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

