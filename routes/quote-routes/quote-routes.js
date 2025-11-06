const express = require("express");
const quoteController = require("../../controllers/quote/quote-controller");
const quoteRouter = express.Router();

quoteRouter.route("/").get(quoteController.getAllQuotes);

module.exports = quoteRouter;
