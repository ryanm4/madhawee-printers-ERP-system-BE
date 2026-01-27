const express = require("express");
const authController = require("../../controllers/users/user-controller");
const authRouter = express.Router();

authRouter.route("/register").post(authController.userRegistration);
authRouter.route("/login").post(authController.userLogin);
authRouter.route("/users").get(authController.getAllUsers);
authRouter.route("/users/:id").put(authController.updateUser);

module.exports = authRouter;