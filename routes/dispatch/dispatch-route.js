const express = require("express");
const dispatchController = require("../../controllers/dispatch/dispatch-controller");

const dispatchRouter = express.Router();
dispatchRouter.route("/").get(dispatchController.getAllDispatchNotes)
dispatchRouter.route("/").post(dispatchController.createDispatch);
dispatchRouter.route("/:dispatch_id")
    .put(dispatchController.updateDispatch)
    .get(dispatchController.getDispatchById)
    .delete(dispatchController.deleteDispatch);

module.exports = dispatchRouter;