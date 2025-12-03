const express = require("express");
const quoteController = require("../../controllers/quote/quote-controller");
const quoteRouter = express.Router();

quoteRouter.route("/")
    .get(quoteController.getAllQuotes)
    .post(quoteController.createQuote);
quoteRouter.route("/:quoteId")
    .get(quoteController.getQuoteById)
    .put(quoteController.updateQuote)
    .delete(quoteController.deleteQuote);
quoteRouter.route("/customer/:customerId")
    .get(quoteController.getQuotesByCustomerId);

module.exports = quoteRouter;
