const express = require("express");
const customerController = require("../../controllers/customers/customer-controller");
const customerRouter = express.Router();

customerRouter.route("/")
    .get(customerController.getAllCustomers)
    .post(customerController.createCustomer);
customerRouter
  .route("/:customerId")
  .get(customerController.getCustomerById)
  .put(customerController.updateCustomer)
  .delete(customerController.deleteCustomer);

module.exports = customerRouter;
