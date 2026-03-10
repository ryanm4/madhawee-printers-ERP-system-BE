const express = require("express");
const customerController = require("../../controllers/customers/customer-controller");
const customerRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer Management
 */


/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
 *     responses:
 *       200:
 *         description: Successfully retrieved customers
 */

customerRouter.route("/")
  .get(customerController.getAllCustomers)

  /**
 * @swagger
 * /customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_name
 *               - address
 *               - phone
 *             properties:
 *               company_name:
 *                 type: string
 *                 example: New Packaging (Pvt) Ltd.
 *               address:
 *                 type: string
 *                 example: Avissawella, Ranala.
 *               phone:
 *                 type: string
 *                 example: "0712415000"
 *               email:
 *                 type: string
 *                 nullable: true
 *                 example: info@starpackaging.lk
 *               vat_type:
 *                 type: string
 *                 nullable: true
 *                 example: SVAT
 *               vat_no:
 *                 type: string
 *                 nullable: true
 *                 example: "123456789"
 *               logo_url:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/logo.png
 *               contact_person:
 *                 type: string
 *                 nullable: true
 *                 example: John Perera
 *               contact_person_email:
 *                 type: string
 *                 nullable: true
 *                 example: john.perera@email.com
 *               contact_person_phone:
 *                 type: string
 *                 nullable: true
 *                 example: "0771234567"
 *               created_on:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               created_by:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *               updated_on:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               updated_by:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *               status:
 *                 type: string
 *                 nullable: true
 *                 example: ACTIVE
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Bad request
 */

  .post(customerController.createCustomer);
customerRouter

  /**
   * @swagger
   * /customers/{customerId}:
   *   get:
   *     summary: Get customer by ID
   *     tags: [Customers]
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the customer to retrieve
   *     responses:
   *       200:
   *         description: Successfully retrieved customer
   *       404:
   *         description: Customer not found
   *       400:
   *         description: Invalid customer ID
   */

  .route("/:customerId")
  .get(customerController.getCustomerById)


  /**
  * @swagger
  * /customers/{customerId}:
  *   put:
  *     summary: Update an existing customer
  *     tags: [Customers]
  *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the customer to retrieve
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - company_name
  *               - address
  *               - phone
  *             properties:
  *               company_name:
  *                 type: string
  *                 example: New Packaging (Pvt) Ltd.
  *               address:
  *                 type: string
  *                 example: Avissawella, Ranala.
  *               phone:
  *                 type: string
  *                 example: "0712415000"
  *               email:
  *                 type: string
  *                 nullable: true
  *                 example: info@starpackaging.lk
  *               vat_type:
  *                 type: string
  *                 nullable: true
  *                 example: SVAT
  *               vat_no:
  *                 type: string
  *                 nullable: true
  *                 example: "123456789"
  *               logo_url:
  *                 type: string
  *                 nullable: true
  *                 example: https://example.com/logo.png
  *               contact_person:
  *                 type: string
  *                 nullable: true
  *                 example: John Perera
  *               contact_person_email:
  *                 type: string
  *                 nullable: true
  *                 example: john.perera@email.com
  *               contact_person_phone:
  *                 type: string
  *                 nullable: true
  *                 example: "0771234567"
  *               created_on:
  *                 type: string
  *                 format: date-time
  *                 nullable: true
  *               created_by:
  *                 type: integer
  *                 nullable: true
  *                 example: 1
  *               updated_on:
  *                 type: string
  *                 format: date-time
  *                 nullable: true
  *               updated_by:
  *                 type: integer
  *                 nullable: true
  *                 example: 1
  *               status:
  *                 type: string
  *                 nullable: true
  *                 example: ACTIVE
  *     responses:
  *       200:
  *         description: Customer updated successfully
  *       400:
  *         description: Bad request
  */


  .put(customerController.updateCustomer)

  /**
   * @swagger
   * /customers/{customerId}:
   *   delete:
   *     summary: Delete a customer
   *     tags: [Customers]
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the customer to delete
   *     responses:
   *       200:
   *         description: Successfully deleted customer
   *       404:
   *         description: Customer not found
   *       400:
   *         description: Invalid customer ID
   */

  .delete(customerController.deleteCustomer);

module.exports = customerRouter;
