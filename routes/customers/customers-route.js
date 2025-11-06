const express = require("express");
const customerController = require("../../controllers/customers/customer-controller");
const customerRouter = express.Router();

customerRouter.route("/").get(customerController.getAllCustomers);

module.exports = customerRouter;
