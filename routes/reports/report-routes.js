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
 *             required:
 *               - reportType
 *               - filters
 *             properties:
 *               reportType:
 *                 type: string
 *                 enum:
 *                   - JOB_PRODUCTION
 *                   - QUOTATION_SUMMARY
 *                   - QUOTE_TO_PO_CONVERSION
 *                   - INVENTORY_HEALTH
 *                   - DISPATCH_INSIGHTS
 *                 example: QUOTE_TO_PO_CONVERSION
 *                 description: Type of report to generate
 *               filters:
 *                 type: object
 *                 required:
 *                   - fromDate
 *                   - toDate
 *                 properties:
 *                   fromDate:
 *                     type: string
 *                     format: date
 *                     example: "2025-01-01"
 *                     description: Start date for the report
 *                   toDate:
 *                     type: string
 *                     format: date
 *                     example: "2026-01-31"
 *                     description: End date for the report
 *                   customer_id:
 *                     type: integer
 *                     example: 1
 *                     description: Optional customer filter
 *                   status:
 *                     type: string
 *                     example: "OPEN"
 *                     description: Optional status filter
 *                   product_type:
 *                     type: string
 *                     example: "BOX"
 *                     description: Optional product type filter
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
 *             required:
 *               - dateFrom
 *               - dateTo
 *             properties:
 *               dateFrom:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *                 description: Start date for dashboard insights
 *               dateTo:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-31"
 *                 description: End date for dashboard insights
 *     responses:
 *       200:
 *         description: Dashboard insights retrieved successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
reportRouter.route("/dashboard/insights").post(reportController.getDashboardInsights);


reportRouter.route("/summary").post(reportController.getAllDataReports);

module.exports = reportRouter;