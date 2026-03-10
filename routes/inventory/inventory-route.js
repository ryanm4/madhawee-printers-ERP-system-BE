const express = require("express");
const inventoryController = require("../../controllers/inventory/inventory-controller");
const inventoryRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Inventory Management
 */

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: Get all inventory items
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: Successfully retrieved all inventory items
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /inventory:
 *   post:
 *     summary: Create a new inventory item
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - job_id
 *             properties:
 *               customer_id:
 *                 type: string
 *                 example: "2"
 *               job_id:
 *                 type: integer
 *                 example: 9012
 *               dispatch_note:
 *                 type: string
 *                 example: "Urgent delivery"
 *               dispatch_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-05"
 *               dispatch_qty:
 *                 type: string
 *                 example: "500"
 *               no_of_bundles:
 *                 type: string
 *                 example: "5"
 *               description:
 *                 type: string
 *                 example: "Flyers"
 *               status:
 *                 type: string
 *                 example: "Pending"
 *               created_by:
 *                 type: string
 *                 example: "admin"
 *               created_on:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-05T10:00:00.000Z"
 *               updated_by:
 *                 type: string
 *                 example: "admin2"
 *               updated_on:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-07T06:15:00.000Z"
 *     responses:
 *       201:
 *         description: Inventory item created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
inventoryRouter.route("/")
    .get(inventoryController.getAllInventoryItems)
    .post(inventoryController.createInventoryItem);

/**
 * @swagger
 * /inventory/{item_id}:
 *   get:
 *     summary: Get inventory item by ID
 *     tags: [Inventory]
 *     parameters:
 *       - name: item_id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The inventory item ID
 *     responses:
 *       200:
 *         description: Successfully retrieved inventory item
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /inventory/{item_id}:
 *   put:
 *     summary: Update an inventory item
 *     tags: [Inventory]
 *     parameters:
 *       - name: item_id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The inventory item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_id:
 *                 type: string
 *                 example: "2"
 *               job_id:
 *                 type: integer
 *                 example: 9012
 *               dispatch_note:
 *                 type: string
 *                 example: "Urgent delivery"
 *               dispatch_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-05"
 *               dispatch_qty:
 *                 type: string
 *                 example: "500"
 *               no_of_bundles:
 *                 type: string
 *                 example: "5"
 *               description:
 *                 type: string
 *                 example: "Flyers"
 *               status:
 *                 type: string
 *                 example: "Pending"
 *               created_by:
 *                 type: string
 *                 example: "admin"
 *               created_on:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-05T10:00:00.000Z"
 *               updated_by:
 *                 type: string
 *                 example: "admin2"
 *               updated_on:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-07T06:15:00.000Z"
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /inventory/{item_id}:
 *   delete:
 *     summary: Delete an inventory item
 *     tags: [Inventory]
 *     parameters:
 *       - name: item_id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The inventory item ID
 *     responses:
 *       200:
 *         description: Inventory item deleted successfully
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Internal server error
 */
inventoryRouter.route("/:item_id")
    .put(inventoryController.updateInventoryItem)
    .get(inventoryController.getInventoryItemById)
    .delete(inventoryController.deleteInventoryItem);

module.exports = inventoryRouter;