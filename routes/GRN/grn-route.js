const express = require("express");
const grnController = require("../../controllers/GRN/grn-controller");
const grnRouter = express.Router();

grnRouter.get("/", grnController.getAllGRNs)
    .post("/", grnController.createGRN)
    .get("/:id", grnController.getGRNById)
    .put("/:id", grnController.updateGRN)
    .delete("/:id", grnController.deleteGRN);

module.exports = grnRouter;