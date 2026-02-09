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
 *               - customer_id
 *               - job_name
 *               - product_type
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 1
 *               job_name:
 *                 type: string
 *                 example: Job Black
 *               job_open_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-01-15T10:00:00Z"
 *               product_type:
 *                 type: string
 *                 example: "1"
 *               paper_type_id:
 *                 type: string
 *                 example: "PAPER01"
 *               quantity:
 *                 type: integer
 *                 example: 1000
 *               coating:
 *                 type: string
 *                 example: "Gloss"
 *               packing_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-20"
 *               expiry_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-20"
 *               description:
 *                 type: string
 *                 example: "Sample job"
 *               artwork:
 *                 type: string
 *                 example: "artwork.pdf"
 *               remarks:
 *                 type: string
 *                 example: "Urgent"
 *               status:
 *                 type: string
 *                 example: "OPEN"
 *               completed_qty:
 *                 type: integer
 *                 example: 0
 *               wastage:
 *                 type: string
 *                 example: "0"
 *
 *               materials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: integer
 *                       example: 1004
 *                     material_type:
 *                       type: string
 *                       example: "Paper"
 *                     material_name:
 *                       type: string
 *                       example: "A4 Paper"
 *                     material_description:
 *                       type: string
 *                       example: "White A4"
 *                     quantity:
 *                       type: integer
 *                       example: 50
 *                     status:
 *                       type: string
 *                       example: "USED"
 *                     remarks:
 *                       type: string
 *                       example: ""
 *
 *               paperCoating:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1   
 *                     paper:
 *                       type: string
 *                       example: "A4"
 *                     coating:
 *                       type: string
 *                       example: "Gloss"
 *                     delivery_date:
 *                      type: string
 *                      format: date-time
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
 *   get:
 *     summary: Get a job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 *
 *   put:
 *     summary: Update a job
 *     tags: [Jobs]
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               po_id:
 *                 type: integer
 *                 example: 5005
 *               job_name:
 *                 type: string
 *                 example: Print Job D
 *               product_type:
 *                 type: string
 *                 example: "1"
 *               quantity:
 *                 type: integer
 *                 example: 10000
 *               packing_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-20"
 *               expiry_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-20"
 *               description:
 *                 type: string
 *                 example: Sample job
 *               artwork:
 *                 type: string
 *                 example: artwork.pdf
 *               remarks:
 *                 type: string
 *                 example: Urgent
 *               status:
 *                 type: string
 *                 example: OPEN
 *               materials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - item_id
 *                   properties:
 *                     item_id:
 *                       type: integer
 *                       example: 1004
 *                     material_name:
 *                       type: string
 *                       example: A4 Paper
 *                     material_type:
 *                       type: string
 *                       example: Paper
 *                     quantity:
 *                       type: integer
 *                       example: 40
 *                     status:
 *                       type: string
 *                       example: USED
 *                     remarks:
 *                       type: string
 *                       example: ""
 *               paperCoating:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 6
 *                     paper:
 *                       type: string
 *                       example: GSM 2
 *                     coating:
 *                       type: string
 *                       example: Gloss
 *                     delivery_date:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-02-15 00:00:00"
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete a job
 *     tags: [Jobs]
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 */


jobsRouter.route("/:jobId")
    .get(jobsController.getJobById)
    .put(jobsController.updateJob)
    .delete(jobsController.deleteJob);

module.exports = jobsRouter;
