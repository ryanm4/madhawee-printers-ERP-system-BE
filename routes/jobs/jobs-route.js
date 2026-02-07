const express = require("express");

const jobsController = require("../../controllers/jobs/jobs-controller");

const jobsRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job Management
 */

/**
 * @swagger
 * /jobs/po/{poId}:
 *   get:
 *     summary: Get jobs by purchase order ID
 *     tags: [Jobs]
 *     parameters:
 *       - name: poId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The purchase order ID
 *     responses:
 *       200:
 *         description: Successfully retrieved jobs for the PO
 *       404:
 *         description: Purchase order not found
 *       500:
 *         description: Internal server error
 */
jobsRouter.route("/po/:poId")
    .get(jobsController.getJobsByPOId)

/**
 * @swagger
 * /jobs:
 *   get:
 *     summary: Get all jobs
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: Successfully retrieved all jobs
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - po_id
 *             properties:
 *               po_id:
 *                 type: integer
 *                 example: 1
 *               job_name:
 *                 type: string
 *                 example: Printing Job A
 *               status:
 *                 type: string
 *                 example: PENDING
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
jobsRouter.route("/")
    .get(jobsController.getAllJobs)
    .post(jobsController.createJob)

/**
 * @swagger
 * /jobs/{jobId}:
 *   get:
 *     summary: Get job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The job ID
 *     responses:
 *       200:
 *         description: Successfully retrieved job
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /jobs/{jobId}:
 *   put:
 *     summary: Update a job
 *     tags: [Jobs]
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               job_name:
 *                 type: string
 *               status:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 */
jobsRouter.route("/:jobId")
    .get(jobsController.getJobById)
    .put(jobsController.updateJob);

module.exports = jobsRouter;
