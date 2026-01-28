const express = require("express");
const reportRouter = express.Router();
const reportController = require("../../controllers/reports/report-controller");

reportRouter.route("/").post(reportController.generateReport);
reportRouter.route("/dashboard/insights").post(reportController.getDashboardInsights);

module.exports = reportRouter;