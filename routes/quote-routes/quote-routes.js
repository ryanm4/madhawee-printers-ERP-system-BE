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
 *               quote_id:
 *                 type: string
 *                 example: "Q008"
 *               customer_id:
 *                 type: integer
 *                 example: 1
 *               type_id:
 *                 type: integer
 *                 example: 1
 *               delivery_days:
 *                 type: string
 *                 example: "20"
 *               tax_type_id:
 *                 type: integer
 *                 example: 1
 *               currency:
 *                 type: string
 *                 example: "LKR"
 *               sub_total:
 *                 type: string
 *                 example: "200"
 *               no_of_items:
 *                 type: string
 *                 example: "20"
 *               total_without_tax:
 *                 type: string
 *                 example: "200"
 *               net_total:
 *                 type: string
 *                 example: "2000"
 *               contact_person:
 *                 type: string
 *                 example: "Ryan2"
 *               notes:
 *                 type: string
 *                 example: "no notes"
 *               created_by:
 *                 type: string
 *                 example: "anupa@test.com"
 *               updated_by:
 *                 type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 example: "Created"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - item_id
 *                     - item_qty
 *                     - item_unit_price
 *                   properties:
 *                     item_id:
 *                       type: integer
 *                       example: 7005
 *                     item_category:
 *                       type: string
 *                       example: "cate 02"
 *                     item_description:
 *                       type: string
 *                       example: "item dec2"
 *                     item_qty:
 *                       type: integer
 *                       example: 20
 *                     item_unit_price:
 *                       type: string
 *                       example: "200"
 *                     item_unit_discount:
 *                       type: string
 *                       example: "0"
 *                     item_total_price:
 *                       type: string
 *                       example: "2000"
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
 *               quote_id:
 *                 type: string
 *                 example: "Q008"
 *               customer_id:
 *                 type: integer
 *                 example: 1
 *               type_id:
 *                 type: integer
 *                 example: 1
 *               delivery_days:
 *                 type: string
 *                 example: "20"
 *               tax_type_id:
 *                 type: integer
 *                 example: 1
 *               currency:
 *                 type: string
 *                 example: "LKR"
 *               sub_total:
 *                 type: string
 *                 example: "200"
 *               no_of_items:
 *                 type: string
 *                 example: "20"
 *               total_without_tax:
 *                 type: string
 *                 example: "200"
 *               net_total:
 *                 type: string
 *                 example: "2000"
 *               contact_person:
 *                 type: string
 *                 example: "Ryan2"
 *               notes:
 *                 type: string
 *                 example: "no notes"
 *               created_by:
 *                 type: string
 *                 example: "anupa@test.com"
 *               updated_by:
 *                 type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 example: "Created"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: integer
 *                       example: 7005
 *                     item_category:
 *                       type: string
 *                       example: "cate 02"
 *                     item_description:
 *                       type: string
 *                       example: "item dec2"
 *                     item_qty:
 *                       type: integer
 *                       example: 20
 *                     item_unit_price:
 *                       type: string
 *                       example: "200"
 *                     item_unit_discount:
 *                       type: string
 *                       example: "0"
 *                     item_total_price:
 *                       type: string
 *                       example: "2000"
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
