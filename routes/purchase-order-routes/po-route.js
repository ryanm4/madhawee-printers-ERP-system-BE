const express = require("express");
const poController = require("../../controllers/purchase-orders/po-controller");
const poRouter = express.Router();

poRouter.route("/")
    .get(poController.getAllPOWithJobs)
    .post(poController.createPurchaseOrder);
poRouter.route("/:poId")
    .get(poController.getPObyId)
    .put(poController.updatePurchaseOrder)
    .delete(poController.deletePurchaseOrder);

module.exports = poRouter;
