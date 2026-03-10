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
 *               - customer_id
 *               - po_type_id
 *               - po_date
 *               - delivery_date
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 2
 *               po_type_id:
 *                 type: integer
 *                 example: 1
 *               batch_ref:
 *                 type: string
 *                 example: "BATCH-021"
 *               po_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-21"
 *               delivery_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-31"
 *               TC_E_PR_No:
 *                 type: string
 *                 example: "TC-123"
 *               approved_on:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-15"
 *               approved_by:
 *                 type: string
 *                 example: "Manager"
 *               created_by:
 *                 type: string
 *                 example: "admin"
 *               updated_by:
 *                 type: string
 *                 example: "admin"
 *               status:
 *                 type: string
 *                 example: "APPROVED"
 *               customer_po:
 *                 type: string
 *                 example: "CPO-456"
 *               po_items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - item_code
 *                     - description
 *                     - quantity
 *                     - uom
 *                     - price
 *                   properties:
 *                     item_code:
 *                       type: string
 *                       example: "ITEM-001"
 *                     description:
 *                       type: string
 *                       example: "A4 Paper"
 *                     quantity:
 *                       type: string
 *                       example: "500"
 *                     uom:
 *                       type: string
 *                       example: "Sheets"
 *                     price:
 *                       type: string
 *                       example: "25.00"
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
 *               customer_id:
 *                 type: integer
 *                 example: 2
 *               po_type_id:
 *                 type: integer
 *                 example: 1
 *               batch_ref:
 *                 type: string
 *                 example: "BATCH-021"
 *               po_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-21"
 *               delivery_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-31"
 *               TC_E_PR_No:
 *                 type: string
 *                 example: "TC-123"
 *               approved_on:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-15"
 *               approved_by:
 *                 type: string
 *                 example: "Manager"
 *               created_by:
 *                 type: string
 *                 example: "admin"
 *               updated_by:
 *                 type: string
 *                 example: "admin"
 *               status:
 *                 type: string
 *                 example: "APPROVED"
 *               customer_po:
 *                 type: string
 *                 example: "CPO-456"
 *               po_items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_code:
 *                       type: string
 *                       example: "ITEM-001"
 *                     description:
 *                       type: string
 *                       example: "A4 Paper"
 *                     quantity:
 *                       type: string
 *                       example: "500"
 *                     uom:
 *                       type: string
 *                       example: "Sheets"
 *                     price:
 *                       type: string
 *                       example: "25.00"
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
