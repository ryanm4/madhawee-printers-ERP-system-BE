const express = require("express");
const poController = require("../../controllers/purchase-orders/po-controller");
const poRouter = express.Router();

poRouter.route("/").get(poController.getAllPO);
poRouter.route("/:poId").get(poController.getPObyId);

module.exports = poRouter;
