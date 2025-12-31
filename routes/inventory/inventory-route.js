const express = require("express");
const inventoryController = require("../../controllers/inventory/inventory-controller");
const inventoryRouter = express.Router();
inventoryRouter.route("/")
    .get(inventoryController.getAllInventoryItems)
    .post(inventoryController.createInventoryItem);
inventoryRouter.route("/:item_id")
    .put(inventoryController.updateInventoryItem)
    // .get(inventoryController.getInventoryItemById)
    .delete(inventoryController.deleteInventoryItem);

module.exports = inventoryRouter;