const express = require("express");

const jobsController = require("../../controllers/jobs/jobs-controller");

const jobsRouter = express.Router();

jobsRouter.route("/po/:poId")
    .get(jobsController.getJobsByPOId)


jobsRouter.route("/")
    .get(jobsController.getAllJobs)
    .post(jobsController.createJob)

jobsRouter.route("/:jobId")
    .get(jobsController.getJobById)
    .put(jobsController.updateJob);

module.exports = jobsRouter;
