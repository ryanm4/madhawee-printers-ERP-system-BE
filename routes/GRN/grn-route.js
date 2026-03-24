const express = require("express");
const grnController = require("../../controllers/GRN/grn-controller");
const grnRouter = express.Router();

/**
 * @swagger
 * /grn:
 *   get:
 *     summary: Retrieve all Goods Received Notes (GRNs)
 *     tags: [GRN]
 *     responses:
 *       200:
 *         description: List of all GRNs with their items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       releated_po:
 *                         type: string
 *                       received_date:
 *                         type: string
 *                         format: date
 *                       supplier_name:
 *                         type: string
 *                       stock_location:
 *                         type: string
 *                       payee_name:
 *                         type: string
 *                       payment_method:
 *                         type: string
 *                       currency:
 *                         type: string
 *                       supplier_invoice_no:
 *                         type: string
 *                       remarks:
 *                         type: string
 *                       created_on:
 *                         type: string
 *                         format: date-time
 *                       created_by:
 *                         type: string
 *                       updated_on:
 *                         type: string
 *                         format: date-time
 *                       updated_by:
 *                         type: string
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             item_name:
 *                               type: string
 *                             quantity:
 *                               type: number
 *                             rate:
 *                               type: number
 *                             amount:
 *                               type: number
 *       500:
 *         description: Internal server error
 */
grnRouter.get("/", grnController.getAllGRNs);

/**
 * @swagger
 * /grn:
 *   post:
 *     summary: Create a new Goods Received Note (GRN)
 *     tags: [GRN]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - releated_po
 *               - received_date
 *               - supplier_name
 *               - stock_location
 *               - payee_name
 *               - payment_method
 *               - currency
 *               - supplier_invoice_no
 *               - created_by
 *               - items
 *             properties:
 *               releated_po:
 *                 type: string
 *               received_date:
 *                 type: string
 *                 format: date
 *               supplier_name:
 *                 type: string
 *               stock_location:
 *                 type: string
 *               payee_name:
 *                 type: string
 *               payment_method:
 *                 type: string
 *               currency:
 *                 type: string
 *               supplier_invoice_no:
 *                 type: string
 *               remarks:
 *                 type: string
 *               created_by:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - item_name
 *                     - quantity
 *                     - rate
 *                   properties:
 *                     item_name:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     rate:
 *                       type: number
 *     responses:
 *       200:
 *         description: GRN created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 id:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
grnRouter.post("/", grnController.createGRN);

/**
 * @swagger
 * /grn/{id}:
 *   get:
 *     summary: Retrieve a specific GRN by ID
 *     tags: [GRN]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The GRN ID
 *     responses:
 *       200:
 *         description: GRN details with items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 releated_po:
 *                   type: string
 *                 received_date:
 *                   type: string
 *                   format: date
 *                 supplier_name:
 *                   type: string
 *                 stock_location:
 *                   type: string
 *                 payee_name:
 *                   type: string
 *                 payment_method:
 *                   type: string
 *                 currency:
 *                   type: string
 *                 supplier_invoice_no:
 *                   type: string
 *                 remarks:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       item_name:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       rate:
 *                         type: number
 *                       amount:
 *                         type: number
 *       404:
 *         description: GRN not found
 *       500:
 *         description: Internal server error
 */
grnRouter.get("/:id", grnController.getGRNById);

/**
 * @swagger
 * /grn/{id}:
 *   put:
 *     summary: Update an existing GRN
 *     tags: [GRN]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The GRN ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - releated_po
 *               - received_date
 *               - supplier_name
 *               - stock_location
 *               - payee_name
 *               - payment_method
 *               - currency
 *               - supplier_invoice_no
 *               - updated_by
 *               - items
 *             properties:
 *               releated_po:
 *                 type: string
 *               received_date:
 *                 type: string
 *                 format: date
 *               supplier_name:
 *                 type: string
 *               stock_location:
 *                 type: string
 *               payee_name:
 *                 type: string
 *               payment_method:
 *                 type: string
 *               currency:
 *                 type: string
 *               supplier_invoice_no:
 *                 type: string
 *               remarks:
 *                 type: string
 *               updated_by:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - item_name
 *                     - quantity
 *                     - rate
 *                   properties:
 *                     item_name:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     rate:
 *                       type: number
 *     responses:
 *       200:
 *         description: GRN updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
grnRouter.put("/:id", grnController.updateGRN);

/**
 * @swagger
 * /grn/{id}:
 *   delete:
 *     summary: Delete a GRN by ID
 *     tags: [GRN]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The GRN ID
 *     responses:
 *       200:
 *         description: GRN deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
grnRouter.delete("/:id", grnController.deleteGRN);

module.exports = grnRouter;