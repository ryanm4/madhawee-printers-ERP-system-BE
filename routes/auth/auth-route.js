const express = require("express");
const authController = require("../../controllers/users/user-controller");
const authRouter = express.Router();

authRouter.route("/register").post(authController.userRegistration);
authRouter.route("/login").post(authController.userLogin);

module.exports = authRouter;