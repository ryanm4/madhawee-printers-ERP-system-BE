const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connection = require("./sql-connection");

const swaggerUI = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const quoteRouter = require("./routes/quote-routes/quote-routes");
const customerRouter = require("./routes/customers/customers-route");
const poRouter = require("./routes/purchase-order-routes/po-route");
const jobsRouter = require("./routes/jobs/jobs-route");
const dispatchRouter = require("./routes/dispatch/dispatch-route");
const inventoryRouter = require("./routes/inventory/inventory-route");
const authRouter = require("./routes/auth/auth-route");
const { verifyToken } = require("./middleware/verify-token");
const reportRouter = require("./routes/reports/report-routes");
const grnRouter = require("./routes/GRN/grn-route");

dotenv.config({ path: "./config.env" });
const port = process.env.PORT || 3000;
const app = express();

// ✅ 1. CORS and JSON parsing first
app.use(express.json());
app.use(cors());

// ✅ 2. DB connection check
connection.getConnection((err, conn) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Database connected successfully");
    conn.release();
  }
});

// ✅ 3. Swagger BEFORE verifyToken (so it's publicly accessible)
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// ✅ 4. Auth route BEFORE verifyToken
app.use("/api/v1/auth", authRouter);

// ✅ 5. Token verification middleware
app.use('/api',verifyToken);

app.get('/debug-swagger', (req, res) => {
  const path = require('path');
  const swaggerUiPath = require('swagger-ui-express');
  res.json({
    swaggerUiExpressVersion: require('./node_modules/swagger-ui-express/package.json').version,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
  });
});

// ✅ 6. Protected routes
app.use("/api/v1/quotes", quoteRouter);
app.use("/api/v1/customers", customerRouter);
app.use("/api/v1/purchase_orders", poRouter);
app.use("/api/v1/jobs", jobsRouter);
app.use("/api/v1/dispatch", dispatchRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/grn", grnRouter);



// ✅ 7. Error handler LAST
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    message: err.message || "Internal Server Error"
  });
});

// ✅ 8. Start server last
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});