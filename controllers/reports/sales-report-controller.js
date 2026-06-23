const pool = require('../../sql-connection');


exports.generateSalesReport = async (req, res) => {
    try {
        const { report_type, from_date, to_date } = req.body;

        if (!report_type) {
            return res.status(400).json({
                message: "report_type is required"
            });
        }

        let query = "";
        let params = [];

        switch (report_type) {

            /**
             * =========================================================
             * 1. DAILY / WEEKLY / MONTHLY SALES
             * =========================================================
             */
            case "SALES_DAILY":
                query = `
                SELECT
                    DATE(po_date) AS sales_date,
                    COUNT(po_id) AS total_orders,
                    SUM(CAST(po_items AS DECIMAL(10,2))) AS total_sales
                FROM purchase_orders
                WHERE DATE(po_date) BETWEEN ? AND ?
                GROUP BY DATE(po_date)
                ORDER BY sales_date DESC
                `;
                params = [from_date, to_date];
                break;


            case "SALES_MONTHLY":
                query = `
                SELECT
                    DATE_FORMAT(po_date, '%Y-%m') AS sales_month,
                    COUNT(po_id) AS total_orders,
                    SUM(CAST(po_items AS DECIMAL(10,2))) AS total_sales
                FROM purchase_orders
                WHERE DATE(po_date) BETWEEN ? AND ?
                GROUP BY DATE_FORMAT(po_date, '%Y-%m')
                ORDER BY sales_month ASC
            `;
                params = [from_date, to_date];
                break;

            case "SALES_WEEKLY":
                query = `
                SELECT
                    YEARWEEK(po_date, 1) AS sales_week,
                    MIN(DATE(po_date)) AS week_start_date,
                    MAX(DATE(po_date)) AS week_end_date,
                    COUNT(po_id) AS total_orders,
                    SUM(CAST(po_items AS DECIMAL(10,2))) AS total_sales
                FROM purchase_orders
                WHERE DATE(po_date) BETWEEN ? AND ?
                GROUP BY YEARWEEK(po_date, 1)
                ORDER BY sales_week ASC
            `;
                params = [from_date, to_date];
                break;

            /**
             * =========================================================
             * 2. SALES BY CUSTOMER
             * =========================================================
             */
            case "SALES_BY_CUSTOMER":
                query = `
                SELECT
                    c.customer_id,
                    c.company_name,
                    COUNT(po.po_id) AS total_orders,
                    SUM(CAST(po.po_items AS DECIMAL(10,2))) AS total_sales
                FROM purchase_orders po
                LEFT JOIN customers c ON c.customer_id = po.customer_id
                WHERE DATE(po.po_date) BETWEEN ? AND ?
                GROUP BY c.customer_id, c.company_name
                ORDER BY total_sales DESC
                `;
                params = [from_date, to_date];
                break;

            /**
             * =========================================================
             * 3. SALES BY PRODUCT
             * (via po_items_details)
             * =========================================================
             */
            case "SALES_BY_PRODUCT":
                query = `
                SELECT
                    pid.item_code,
                    pid.description,
                    SUM(CAST(pid.quantity AS DECIMAL(10,2))) AS total_qty,
                    SUM(CAST(pid.price AS DECIMAL(10,2)) * CAST(pid.quantity AS DECIMAL(10,2))) AS total_sales
                FROM purchase_orders po
                INNER JOIN po_items_details pid ON pid.po_id = po.po_id
                WHERE DATE(po.po_date) BETWEEN ? AND ?
                GROUP BY pid.item_code, pid.description
                ORDER BY total_sales DESC
                `;
                params = [from_date, to_date];
                break;

            /**
             * =========================================================
             * 4. SALES BY SALESPERSON
             * =========================================================
             */
            case "SALES_BY_SALESPERSON":
                query = `
                SELECT
                    po.created_by AS salesperson,
                    COUNT(po.po_id) AS total_orders,
                    SUM(CAST(po.po_items AS DECIMAL(10,2))) AS total_sales
                FROM purchase_orders po
                WHERE DATE(po.po_date) BETWEEN ? AND ?
                GROUP BY po.created_by
                ORDER BY total_sales DESC
                `;
                params = [from_date, to_date];
                break;

            default:
                return res.status(400).json({
                    message:
                        "Invalid report_type. Use SALES_DAILY, SALES_BY_CUSTOMER, SALES_BY_PRODUCT, SALES_BY_SALESPERSON"
                });
        }

        const [rows] = await pool.promise().query(query, params);

        return res.status(200).json({
            report_type,
            from_date,
            to_date,
            count: rows.length,
            data: rows
        });

    } catch (error) {
        console.error("Sales report error:", error);

        return res.status(500).json({
            message: "Failed to generate sales report",
            error: error.message
        });
    }
};