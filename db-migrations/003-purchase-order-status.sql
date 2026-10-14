-- Purchase orders no longer sit at CREATED: every order is APPROVED, and an order whose jobs are
-- all COMPLETED (with at least one job) is COMPLETED. Safe to run again; only rows that change are touched.
UPDATE purchase_orders po
LEFT JOIN (
  SELECT po_id,
         COUNT(*) AS total,
         SUM(UPPER(TRIM(COALESCE(status, ''))) = 'COMPLETED') AS done
  FROM jobs
  WHERE po_id IS NOT NULL
  GROUP BY po_id
) j ON j.po_id = po.po_id
SET po.status = IF(j.total > 0 AND j.done = j.total, 'COMPLETED', 'APPROVED'),
    po.updated_on = NOW()
WHERE po.po_id > 0 -- a key column, so MySQL's safe update mode accepts it
  AND COALESCE(po.status, '') <> IF(j.total > 0 AND j.done = j.total, 'COMPLETED', 'APPROVED');
