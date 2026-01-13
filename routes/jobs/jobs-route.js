const express = require("express");

const jobsController = require("../../controllers/jobs/jobs-controller");

const jobsRouter = express.Router();

jobsRouter.route("/:poId").get(jobsController.getJobsByPOId);

jobsRouter.route("/").get(jobsController.getAllJobs);

module.exports = jobsRouter;
