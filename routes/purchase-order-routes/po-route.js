const express = require("express");
const poController = require("../../controllers/purchase-orders/po-controller");
const poRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Purchase Orders
 *   description: Purchase Order Management
 */

/**
 * @swagger
 * /po:
 *   get:
 *     summary: Get all purchase orders with jobs
 *     tags: [Purchase Orders]
 *     responses:
 *       200:
 *         description: Successfully retrieved all purchase orders
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /po:
 *   post:
 *     summary: Create a new purchase order
 *     tags: [Purchase Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quote_id
 *             properties:
 *               quote_id:
 *                 type: integer
 *                 example: 1
 *               po_date:
 *                 type: string
 *                 format: date
 *               delivery_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Purchase order created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
poRouter.route("/")
    .get(poController.getAllPOWithJobs)
    .post(poController.createPurchaseOrder);

/**
 * @swagger
 * /po/{poId}:
 *   get:
 *     summary: Get purchase order by ID
 *     tags: [Purchase Orders]
 *     parameters:
 *       - name: poId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The purchase order ID
 *     responses:
 *       200:
 *         description: Successfully retrieved purchase order
 *       404:
 *         description: Purchase order not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /po/{poId}:
 *   put:
 *     summary: Update a purchase order
 *     tags: [Purchase Orders]
 *     parameters:
 *       - name: poId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The purchase order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               po_date:
 *                 type: string
 *                 format: date
 *               delivery_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Purchase order updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Purchase order not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /po/{poId}:
 *   delete:
 *     summary: Delete a purchase order
 *     tags: [Purchase Orders]
 *     parameters:
 *       - name: poId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The purchase order ID
 *     responses:
 *       200:
 *         description: Purchase order deleted successfully
 *       404:
 *         description: Purchase order not found
 *       500:
 *         description: Internal server error
 */
poRouter.route("/:poId")
    .get(poController.getPObyId)
    .put(poController.updatePurchaseOrder)
    .delete(poController.deletePurchaseOrder);

module.exports = poRouter;
