const express = require("express");
const dispatchController = require("../../controllers/dispatch/dispatch-controller");

const dispatchRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dispatch
 *   description: Dispatch Management
 */

/**
 * @swagger
 * /dispatch:
 *   get:
 *     summary: Get all dispatch notes
 *     tags: [Dispatch]
 *     responses:
 *       200:
 *         description: Successfully retrieved all dispatch notes
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /dispatch:
 *   post:
 *     summary: Create a new dispatch note
 *     tags: [Dispatch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - job_id
 *               - dispatch_date
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
 *         description: Dispatch note created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
dispatchRouter.route("/").get(dispatchController.getAllDispatchNotes)
dispatchRouter.route("/").post(dispatchController.createDispatch);

/**
 * @swagger
 * /dispatch/{dispatch_id}:
 *   get:
 *     summary: Get dispatch note by ID
 *     tags: [Dispatch]
 *     parameters:
 *       - name: dispatch_id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The dispatch note ID
 *     responses:
 *       200:
 *         description: Successfully retrieved dispatch note
 *       404:
 *         description: Dispatch note not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /dispatch/{dispatch_id}:
 *   put:
 *     summary: Update a dispatch note
 *     tags: [Dispatch]
 *     parameters:
 *       - name: dispatch_id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The dispatch note ID
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
 *         description: Dispatch note updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Dispatch note not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /dispatch/{dispatch_id}:
 *   delete:
 *     summary: Delete a dispatch note
 *     tags: [Dispatch]
 *     parameters:
 *       - name: dispatch_id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The dispatch note ID
 *     responses:
 *       200:
 *         description: Dispatch note deleted successfully
 *       404:
 *         description: Dispatch note not found
 *       500:
 *         description: Internal server error
 */
dispatchRouter.route("/:dispatch_id")
    .put(dispatchController.updateDispatch)
    .get(dispatchController.getDispatchById)
    .delete(dispatchController.deleteDispatch);

module.exports = dispatchRouter;