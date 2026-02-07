const express = require("express");
const reportRouter = express.Router();
const reportController = require("../../controllers/reports/report-controller");

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Report Generation & Analytics
 */

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Generate a report
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               report_type:
 *                 type: string
 *                 example: sales
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               filters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Report generated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
reportRouter.route("/").post(reportController.generateReport);

/**
 * @swagger
 * /reports/dashboard/insights:
 *   post:
 *     summary: Get dashboard insights
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *                 example: monthly
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Dashboard insights retrieved successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
reportRouter.route("/dashboard/insights").post(reportController.getDashboardInsights);

module.exports = reportRouter;