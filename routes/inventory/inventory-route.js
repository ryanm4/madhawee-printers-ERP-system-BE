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
 *               - item_name
 *               - quantity
 *             properties:
 *               item_name:
 *                 type: string
 *                 example: Paper Rolls
 *               quantity:
 *                 type: integer
 *                 example: 100
 *               sku:
 *                 type: string
 *                 example: SKU-001
 *               unit_price:
 *                 type: number
 *                 example: 10.50
 *               description:
 *                 type: string
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
 *               item_name:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               sku:
 *                 type: string
 *               unit_price:
 *                 type: number
 *               description:
 *                 type: string
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