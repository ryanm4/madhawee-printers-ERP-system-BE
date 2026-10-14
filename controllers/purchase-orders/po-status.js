const pool = require("../../sql-connection");

/**
 * Purchase orders are approved as soon as they are entered, and complete themselves:
 * an order with at least one job, every one of them COMPLETED, is COMPLETED; any other order is APPROVED.
 * Only rows whose status actually changes are touched.
 */
const syncQuery = (oneOrder) => `
  UPDATE purchase_orders po
  LEFT JOIN (
    SELECT po_id,
           COUNT(*) AS total,
           SUM(UPPER(TRIM(COALESCE(status, ''))) = 'COMPLETED') AS done
    FROM jobs
    ${oneOrder ? "WHERE po_id = ?" : "WHERE po_id IS NOT NULL"}
    GROUP BY po_id
  ) j ON j.po_id = po.po_id
  SET po.status = IF(j.total > 0 AND j.done = j.total, 'COMPLETED', 'APPROVED'),
      po.updated_on = NOW()
  WHERE ${oneOrder ? "po.po_id = ?" : "po.po_id > 0"}
    AND COALESCE(po.status, '') <> IF(j.total > 0 AND j.done = j.total, 'COMPLETED', 'APPROVED')
`;

/** Bring one order's status in line with its jobs. Never throws: a failed sync must not fail the request */
exports.syncPurchaseOrderStatus = async (poId) => {
  if (!poId) return;
  try {
    await pool.promise().query(syncQuery(true), [poId, poId]);
  } catch (error) {
    console.error(`Could not update the status of purchase order ${poId}:`, error.message);
  }
};

/** The same, for the order a job belongs to */
exports.syncPurchaseOrderStatusForJob = async (jobId) => {
  try {
    const [[job]] = await pool.promise().query("SELECT po_id FROM jobs WHERE job_id = ?", [jobId]);
    await exports.syncPurchaseOrderStatus(job?.po_id);
  } catch (error) {
    console.error(`Could not find the purchase order for job ${jobId}:`, error.message);
  }
};

/** Every order at once, e.g. after a job is deleted and its order is no longer known */
exports.syncAllPurchaseOrderStatuses = async () => {
  try {
    await pool.promise().query(syncQuery(false));
  } catch (error) {
    console.error("Could not update purchase order statuses:", error.message);
  }
};
