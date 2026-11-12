const express = require("express");
const router = express.Router();
const controller = require("../../controllers/production-schedule/production-schedule-controller");

router.get("/board", controller.getBoard);

router.route("/machines").get(controller.getMachines).post(controller.createMachine);
router.route("/machines/:id").put(controller.updateMachine).delete(controller.deleteMachine);

router.post("/slots", controller.createSlot);
router.route("/slots/:id").put(controller.updateSlot).delete(controller.deleteSlot);

router.post("/downtime", controller.createDowntime);
router.route("/downtime/:id").put(controller.updateDowntime).delete(controller.deleteDowntime);

module.exports = router;
