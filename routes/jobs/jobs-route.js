const express = require("express");

const jobsController = require("../../controllers/jobs/jobs-controller");

const jobsRouter = express.Router();

jobsRouter.route("/:poId").get(jobsController.getJobsByPOId);

module.exports = jobsRouter;
