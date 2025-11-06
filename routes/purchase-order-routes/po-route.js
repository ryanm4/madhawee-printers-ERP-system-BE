const express = require("express");
const poController = require("../../controllers/purchase-orders/po-controller");
const poRouter = express.Router();

poRouter.route("/").get(poController.getAllPO);

module.exports = poRouter;
