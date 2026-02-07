const express = require("express");
const quoteController = require("../../controllers/quote/quote-controller");
const quoteRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Quotes
 *   description: Quote Management
 */

/**
 * @swagger
 * /quotes:
 *   get:
 *     summary: Get all quotes
 *     tags: [Quotes]
 *     responses:
 *       200:
 *         description: Successfully retrieved all quotes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /quotes:
 *   post:
 *     summary: Create a new quote
 *     tags: [Quotes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - type_id
 *               - tax_type_id
 *               - currency
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 1
 *               type_id:
 *                 type: integer
 *                 example: 1
 *               delivery_days:
 *                 type: integer
 *                 example: 5
 *               tax_type_id:
 *                 type: integer
 *                 example: 1
 *               currency:
 *                 type: string
 *                 example: LKR
 *               contact_person:
 *                 type: string
 *                 example: John Doe
 *               notes:
 *                 type: string
 *                 example: Special instructions
 *     responses:
 *       201:
 *         description: Quote created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
quoteRouter.route("/")
    .get(quoteController.getAllQuotes)
    .post(quoteController.createQuote);

/**
 * @swagger
 * /quotes/{quoteId}:
 *   get:
 *     summary: Get quote by ID
 *     tags: [Quotes]
 *     parameters:
 *       - name: quoteId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The quote ID
 *     responses:
 *       200:
 *         description: Successfully retrieved quote
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /quotes/{quoteId}:
 *   put:
 *     summary: Update a quote
 *     tags: [Quotes]
 *     parameters:
 *       - name: quoteId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The quote ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_id:
 *                 type: integer
 *               type_id:
 *                 type: integer
 *               delivery_days:
 *                 type: integer
 *               tax_type_id:
 *                 type: integer
 *               currency:
 *                 type: string
 *               contact_person:
 *                 type: string
 *               notes:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Quote updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /quotes/{quoteId}:
 *   delete:
 *     summary: Delete a quote
 *     tags: [Quotes]
 *     parameters:
 *       - name: quoteId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The quote ID
 *     responses:
 *       200:
 *         description: Quote deleted successfully
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */
quoteRouter.route("/:quoteId")
    .get(quoteController.getQuoteById)
    .put(quoteController.updateQuote)
    .delete(quoteController.deleteQuote);

/**
 * @swagger
 * /quotes/customer/{customerId}:
 *   get:
 *     summary: Get quotes by customer ID
 *     tags: [Quotes]
 *     parameters:
 *       - name: customerId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The customer ID
 *     responses:
 *       200:
 *         description: Successfully retrieved customer quotes
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
quoteRouter.route("/customer/:customerId")
    .get(quoteController.getQuotesByCustomerId);

module.exports = quoteRouter;
