const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connection = require("./sql-connection");

const quoteRouter = require("./routes/quote-routes/quote-routes");
const customerRouter = require("./routes/customers/customers-route");
const poRouter = require("./routes/purchase-order-routes/po-route");
const jobsRouter = require("./routes/jobs/jobs-route");
const dispatchRouter = require("./routes/dispatch/dispatch-route");
const inventoryRouter = require("./routes/inventory/inventory-route");

dotenv.config({ path: "./config.env" });
const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use(cors());

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the MySQL database.");
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.use((err, req, res, next) => {
  console.error(err.stack || err);

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    message: err.message || "Internal Server Error"
  });
});


app.use("/api/v1/quotes", quoteRouter);
app.use("/api/v1/customers", customerRouter);
app.use("/api/v1/purchase_orders", poRouter);
app.use("/api/v1/jobs", jobsRouter);
app.use("/api/v1/dispatch", dispatchRouter);
app.use("/api/v1/inventory", inventoryRouter);
