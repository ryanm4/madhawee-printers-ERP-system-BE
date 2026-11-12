const pool = require("../../sql-connection");

const db = () => pool.promise();

const MISSING_TABLE = "ER_NO_SUCH_TABLE";

/** Send a 500, or a clear message when the production schedule migration has not been run yet */
function fail(res, error, context) {
  console.error(`${context}:`, error);
  if (error && error.code === MISSING_TABLE) {
    return res.status(500).json({
      message: "Production schedule tables are missing. Run `npm run migrate` on the backend.",
    });
  }
  return res.status(500).json({ message: "Internal server error" });
}

const userName = (req) => req.user?.name || req.user?.email || null;
const clean = (value) => (typeof value === "string" ? value.trim() : value);

const SLOT_STATUSES = ["SCHEDULED", "IN_PROGRESS", "WAITING_MATERIAL", "BLOCKED", "DONE"];
const DOWNTIME_REASONS = ["MAINTENANCE", "BREAKDOWN", "OTHER"];
/** Jobs that still need production time */
const OPEN_JOB_STATUSES = ["CREATED", "IN PRODUCTION"];

// Times go in and out as plain local "YYYY-MM-DD HH:MM:SS" strings, so no timezone shifts on the way
const DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
const TIME = /^\d{2}:\d{2}(:\d{2})?$/;
const fmt = (column, alias) => `DATE_FORMAT(${column}, '%Y-%m-%d %H:%i:%s') AS ${alias}`;

/** Check start/end strings; returns an error message or null */
function checkRange(start, end) {
  if (!DATETIME.test(start || "") || !DATETIME.test(end || "")) {
    return "Start and end must be dates in the format YYYY-MM-DD HH:MM";
  }
  if (start >= end) return "The end time must be after the start time";
  return null;
}

/**
 * What already occupies this machine between start and end, if anything.
 * Returns a sentence naming the clash, or null when the time is free.
 * Jobs may overlap each other (the board shows the double booking in red), so bookings
 * only check downtime; downtime checks both.
 */
async function findClash(conn, { machineId, start, end, ignoreSlotId = 0, ignoreDowntimeId = 0, includeSlots = true }) {
  const [slots] = !includeSlots ? [[]] : await conn.query(
    `SELECT s.id, s.stage, j.job_number, ${fmt("s.start_at", "start_at")}, ${fmt("s.end_at", "end_at")}
     FROM schedule_slots s
     LEFT JOIN jobs j ON j.job_id = s.job_id
     WHERE s.machine_id = ? AND s.id <> ? AND s.start_at < ? AND s.end_at > ?
     ORDER BY s.start_at LIMIT 1`,
    [machineId, ignoreSlotId, end, start]
  );
  if (slots.length > 0) {
    const s = slots[0];
    return `This machine is already booked for ${s.job_number || `job #${s.id}`} (${s.stage}) from ${s.start_at.slice(0, 16)} to ${s.end_at.slice(0, 16)}`;
  }

  const [downtime] = await conn.query(
    `SELECT reason, ${fmt("start_at", "start_at")}, ${fmt("end_at", "end_at")}
     FROM machine_downtime
     WHERE machine_id = ? AND id <> ? AND start_at < ? AND end_at > ?
     ORDER BY start_at LIMIT 1`,
    [machineId, ignoreDowntimeId, end, start]
  );
  if (downtime.length > 0) {
    const d = downtime[0];
    return `This machine is down for ${d.reason.toLowerCase()} from ${d.start_at.slice(0, 16)} to ${d.end_at.slice(0, 16)}`;
  }
  return null;
}

/* --------------------------------------------------------------- Machines */

const toMachine = (row) => ({ ...row, is_active: Boolean(row.is_active) });

const MACHINE_COLUMNS = `id, name, process, TIME_FORMAT(shift_start, '%H:%i') AS shift_start,
  TIME_FORMAT(shift_end, '%H:%i') AS shift_end, notes, sort_order, is_active`;

exports.getMachines = async (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  try {
    const [rows] = await db().query(
      `SELECT ${MACHINE_COLUMNS} FROM machines
       ${includeInactive ? "" : "WHERE is_active = 1"}
       ORDER BY sort_order, name`
    );
    return res.status(200).json(rows.map(toMachine));
  } catch (error) {
    return fail(res, error, "Error fetching machines");
  }
};

/** Validate a machine body; returns [error, values] */
function readMachine(body) {
  const name = clean(body.name);
  const process = clean(body.process);
  const shiftStart = clean(body.shift_start) || "08:00";
  const shiftEnd = clean(body.shift_end) || "17:00";

  if (!name) return ["A machine name is required"];
  if (name.length > 100) return ["Keep the machine name under 100 characters"];
  if (!process) return ["Choose the process this machine does"];
  if (!TIME.test(shiftStart) || !TIME.test(shiftEnd)) return ["Shift times must look like 08:00"];
  if (shiftStart >= shiftEnd) return ["The shift must end after it starts"];

  return [
    null,
    {
      name,
      process: process.toUpperCase(),
      shift_start: shiftStart,
      shift_end: shiftEnd,
      notes: clean(body.notes) || null,
      sort_order: Number(body.sort_order) || 0,
      is_active: body.is_active === undefined ? 1 : body.is_active ? 1 : 0,
    },
  ];
}

exports.createMachine = async (req, res) => {
  const [error, values] = readMachine(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const [result] = await db().query("INSERT INTO machines SET ?", [values]);
    const [rows] = await db().query(`SELECT ${MACHINE_COLUMNS} FROM machines WHERE id = ?`, [result.insertId]);
    return res.status(201).json(toMachine(rows[0]));
  } catch (error) {
    return fail(res, error, "Error creating machine");
  }
};

exports.updateMachine = async (req, res) => {
  const [error, values] = readMachine(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const [result] = await db().query("UPDATE machines SET ? WHERE id = ?", [values, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Machine not found" });
    const [rows] = await db().query(`SELECT ${MACHINE_COLUMNS} FROM machines WHERE id = ?`, [req.params.id]);
    return res.status(200).json(toMachine(rows[0]));
  } catch (error) {
    return fail(res, error, "Error updating machine");
  }
};

exports.deleteMachine = async (req, res) => {
  try {
    const [[{ booked }]] = await db().query(
      "SELECT COUNT(*) AS booked FROM schedule_slots WHERE machine_id = ?",
      [req.params.id]
    );
    if (booked > 0) {
      return res.status(409).json({
        message: "This machine has jobs on the schedule. Switch it off instead of deleting it.",
      });
    }
    await db().query("DELETE FROM machine_downtime WHERE machine_id = ?", [req.params.id]);
    const [result] = await db().query("DELETE FROM machines WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Machine not found" });
    return res.status(200).json({ message: "Machine deleted" });
  } catch (error) {
    return fail(res, error, "Error deleting machine");
  }
};

/* ------------------------------------------------------------------ Board */

const SLOT_SELECT = `
  SELECT s.id, s.job_id, s.machine_id, s.stage, s.status, s.operator, s.notes,
         ${fmt("s.start_at", "start_at")}, ${fmt("s.end_at", "end_at")},
         j.job_number, j.job_name, j.quantity, j.status AS job_status,
         c.company_name AS customer_name,
         (SELECT DATE_FORMAT(MIN(pcd.delivery_date), '%Y-%m-%d') FROM paper_coating_data pcd
          WHERE pcd.job_id = s.job_id) AS delivery_date
  FROM schedule_slots s
  LEFT JOIN jobs j ON j.job_id = s.job_id
  LEFT JOIN customers c ON c.customer_id = j.customer_id`;

/** Everything the schedule board needs for one date range: ?from=YYYY-MM-DD&to=YYYY-MM-DD (to is exclusive) */
exports.getBoard = async (req, res) => {
  const { from, to } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "") || from >= to) {
    return res.status(400).json({ message: "Pass from and to as YYYY-MM-DD, with from before to" });
  }

  try {
    const [machines] = await db().query(
      `SELECT ${MACHINE_COLUMNS} FROM machines WHERE is_active = 1 ORDER BY sort_order, name`
    );
    const [processes] = await db().query(
      `SELECT value, label FROM option_values
       WHERE list_key = 'machine_process' AND is_active = 1 ORDER BY sort_order, label`
    );
    const [slots] = await db().query(
      `${SLOT_SELECT} WHERE s.start_at < ? AND s.end_at > ? ORDER BY s.start_at`,
      [to, from]
    );
    const [downtime] = await db().query(
      `SELECT id, machine_id, reason, notes, ${fmt("start_at", "start_at")}, ${fmt("end_at", "end_at")}
       FROM machine_downtime WHERE start_at < ? AND end_at > ? ORDER BY start_at`,
      [to, from]
    );
    // Open jobs, with how many stages are already booked (anywhere on the schedule, not only this range)
    const [jobs] = await db().query(
      `SELECT j.job_id, j.job_number, j.job_name, j.quantity, j.status, j.product_type,
              c.company_name AS customer_name,
              (SELECT DATE_FORMAT(MIN(pcd.delivery_date), '%Y-%m-%d') FROM paper_coating_data pcd
               WHERE pcd.job_id = j.job_id) AS delivery_date,
              (SELECT COUNT(*) FROM schedule_slots s WHERE s.job_id = j.job_id) AS stages_booked
       FROM jobs j
       LEFT JOIN customers c ON c.customer_id = j.customer_id
       WHERE UPPER(TRIM(COALESCE(j.status, ''))) IN (?)
       ORDER BY delivery_date IS NULL, delivery_date, j.job_id`,
      [OPEN_JOB_STATUSES]
    );

    return res.status(200).json({
      machines: machines.map(toMachine),
      processes,
      slots,
      downtime,
      jobs: jobs.map((job) => ({ ...job, stages_booked: Number(job.stages_booked) })),
    });
  } catch (error) {
    return fail(res, error, "Error fetching production schedule");
  }
};

/* ------------------------------------------------------------------ Slots */

/** Validate a slot body; returns [error, values] */
function readSlot(body) {
  const start = clean(body.start_at);
  const end = clean(body.end_at);
  const status = clean(body.status) || "SCHEDULED";

  if (!Number(body.job_id)) return ["Choose a job"];
  if (!Number(body.machine_id)) return ["Choose a machine"];
  const rangeError = checkRange(start, end);
  if (rangeError) return [rangeError];
  if (!SLOT_STATUSES.includes(status)) return [`Status must be one of ${SLOT_STATUSES.join(", ")}`];

  return [
    null,
    {
      job_id: Number(body.job_id),
      machine_id: Number(body.machine_id),
      stage: clean(body.stage) || null,
      start_at: start,
      end_at: end,
      status,
      operator: clean(body.operator) || null,
      notes: clean(body.notes) || null,
    },
  ];
}

async function getSlot(id) {
  const [rows] = await db().query(`${SLOT_SELECT} WHERE s.id = ?`, [id]);
  return rows[0];
}

exports.createSlot = async (req, res) => {
  const [error, values] = readSlot(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const [machines] = await db().query("SELECT process FROM machines WHERE id = ? AND is_active = 1", [
      values.machine_id,
    ]);
    if (machines.length === 0) return res.status(400).json({ message: "That machine is not available" });

    const clash = await findClash(db(), {
      machineId: values.machine_id,
      start: values.start_at,
      end: values.end_at,
      includeSlots: false,
    });
    if (clash) return res.status(409).json({ message: clash });

    const [result] = await db().query("INSERT INTO schedule_slots SET ?", [
      { ...values, stage: values.stage || machines[0].process, created_by: userName(req), updated_by: userName(req) },
    ]);
    return res.status(201).json(await getSlot(result.insertId));
  } catch (error) {
    return fail(res, error, "Error creating schedule slot");
  }
};

exports.updateSlot = async (req, res) => {
  const [error, values] = readSlot(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const clash = await findClash(db(), {
      machineId: values.machine_id,
      start: values.start_at,
      end: values.end_at,
      ignoreSlotId: Number(req.params.id),
      includeSlots: false,
    });
    if (clash) return res.status(409).json({ message: clash });

    const update = { ...values, updated_by: userName(req) };
    if (!update.stage) delete update.stage;
    const [result] = await db().query("UPDATE schedule_slots SET ? WHERE id = ?", [update, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Schedule entry not found" });
    return res.status(200).json(await getSlot(req.params.id));
  } catch (error) {
    return fail(res, error, "Error updating schedule slot");
  }
};

exports.deleteSlot = async (req, res) => {
  try {
    const [result] = await db().query("DELETE FROM schedule_slots WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Schedule entry not found" });
    return res.status(200).json({ message: "Removed from the schedule" });
  } catch (error) {
    return fail(res, error, "Error deleting schedule slot");
  }
};

/* --------------------------------------------------------------- Downtime */

function readDowntime(body) {
  const start = clean(body.start_at);
  const end = clean(body.end_at);
  const reason = clean(body.reason) || "MAINTENANCE";

  if (!Number(body.machine_id)) return ["Choose a machine"];
  const rangeError = checkRange(start, end);
  if (rangeError) return [rangeError];
  if (!DOWNTIME_REASONS.includes(reason)) return [`Reason must be one of ${DOWNTIME_REASONS.join(", ")}`];

  return [null, { machine_id: Number(body.machine_id), reason, start_at: start, end_at: end, notes: clean(body.notes) || null }];
}

async function getDowntime(id) {
  const [rows] = await db().query(
    `SELECT id, machine_id, reason, notes, ${fmt("start_at", "start_at")}, ${fmt("end_at", "end_at")}
     FROM machine_downtime WHERE id = ?`,
    [id]
  );
  return rows[0];
}

exports.createDowntime = async (req, res) => {
  const [error, values] = readDowntime(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const clash = await findClash(db(), { machineId: values.machine_id, start: values.start_at, end: values.end_at });
    if (clash) return res.status(409).json({ message: `${clash}. Move that first.` });

    const [result] = await db().query("INSERT INTO machine_downtime SET ?", [{ ...values, created_by: userName(req) }]);
    return res.status(201).json(await getDowntime(result.insertId));
  } catch (error) {
    return fail(res, error, "Error creating downtime");
  }
};

exports.updateDowntime = async (req, res) => {
  const [error, values] = readDowntime(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const clash = await findClash(db(), {
      machineId: values.machine_id,
      start: values.start_at,
      end: values.end_at,
      ignoreDowntimeId: Number(req.params.id),
    });
    if (clash) return res.status(409).json({ message: `${clash}. Move that first.` });

    const [result] = await db().query("UPDATE machine_downtime SET ? WHERE id = ?", [values, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Downtime not found" });
    return res.status(200).json(await getDowntime(req.params.id));
  } catch (error) {
    return fail(res, error, "Error updating downtime");
  }
};

exports.deleteDowntime = async (req, res) => {
  try {
    const [result] = await db().query("DELETE FROM machine_downtime WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Downtime not found" });
    return res.status(200).json({ message: "Downtime removed" });
  } catch (error) {
    return fail(res, error, "Error deleting downtime");
  }
};
