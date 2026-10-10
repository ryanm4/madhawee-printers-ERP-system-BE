const pool = require("../../sql-connection");

const db = () => pool.promise();

const MISSING_TABLE = "ER_NO_SUCH_TABLE";

/** Send a 500, or a clear message when the settings migration has not been run yet */
function fail(res, error, context) {
  console.error(`${context}:`, error);
  if (error && error.code === MISSING_TABLE) {
    return res.status(500).json({
      message: "Settings tables are missing. Run `npm run migrate` on the backend.",
    });
  }
  return res.status(500).json({ message: "Internal server error" });
}

const clean = (value) => (typeof value === "string" ? value.trim() : value);

/* ---------------------------------------------------------------- Company */

const COMPANY_KEYS = [
  "company_name",
  "company_address",
  "company_phone",
  "company_email",
  "company_website",
  "company_registration_number",
  "vat_registration_number",
  "quotation_terms",
];

exports.getCompany = async (req, res) => {
  try {
    const [rows] = await db().query(
      "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN (?)",
      [COMPANY_KEYS]
    );
    const company = Object.fromEntries(COMPANY_KEYS.map((key) => [key, ""]));
    rows.forEach((row) => {
      company[row.setting_key] = row.setting_value ?? "";
    });
    return res.status(200).json(company);
  } catch (error) {
    return fail(res, error, "Error fetching company settings");
  }
};

exports.updateCompany = async (req, res) => {
  const updates = COMPANY_KEYS.filter((key) => req.body[key] !== undefined).map((key) => [
    key,
    String(clean(req.body[key]) ?? ""),
    req.user?.name || req.user?.email || null,
  ]);

  if (updates.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  const email = req.body.company_email && clean(req.body.company_email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }

  try {
    await db().query(
      `INSERT INTO app_settings (setting_key, setting_value, updated_by) VALUES ?
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
      [updates]
    );
    return exports.getCompany(req, res);
  } catch (error) {
    return fail(res, error, "Error updating company settings");
  }
};

/* ----------------------------------------------------------- Option lists */

/** The lists Settings can edit. Workflow lists hold stages a job moves through. */
const OPTION_LISTS = [
  { key: "item_category", label: "Item categories", description: "The main group a stock item belongs to." },
  { key: "item_sub_category", label: "Item sub-categories", description: "The narrower group within a category." },
  { key: "unit_of_measure", label: "Units of measure", description: "How stock is counted or weighed." },
  { key: "product_type", label: "Product types", description: "What is being printed. Chosen on job tickets." },
  { key: "coating_type", label: "Coating types", description: "Finishes offered on job tickets." },
  { key: "plate_status", label: "Plate status", description: "Where a job's plates are.", is_workflow_state: true },
  { key: "ink_status", label: "Ink status", description: "Whether a job's ink is in stock.", is_workflow_state: true },
];

const isListKey = (key) => OPTION_LISTS.some((list) => list.key === key);

/** What documents store: upper case with single spaces, matching the existing data */
const toStoredValue = (label) => label.toUpperCase();

/** Trim and collapse runs of spaces, so "Gift   box" and "Gift box" are the same entry */
const cleanLabel = (value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value);

const toOption = (row) => ({ ...row, is_active: Boolean(row.is_active) });

exports.getOptionLists = async (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  try {
    const [rows] = await db().query(
      `SELECT id, list_key, value, label, sort_order, is_active
       FROM option_values
       ${includeInactive ? "" : "WHERE is_active = 1"}
       ORDER BY list_key, sort_order, label`
    );
    const lists = Object.fromEntries(OPTION_LISTS.map((list) => [list.key, []]));
    rows.forEach((row) => {
      if (lists[row.list_key]) lists[row.list_key].push(toOption(row));
    });
    return res.status(200).json({ definitions: OPTION_LISTS, lists });
  } catch (error) {
    return fail(res, error, "Error fetching option lists");
  }
};

exports.createOption = async (req, res) => {
  const { listKey } = req.params;
  const label = cleanLabel(req.body.label);

  if (!isListKey(listKey)) return res.status(404).json({ message: "Unknown list" });
  if (!label) return res.status(400).json({ message: "A name is required" });
  if (label.length > 150) return res.status(400).json({ message: "Keep the name under 150 characters" });

  const value = toStoredValue(label);

  try {
    const [existing] = await db().query(
      "SELECT id, label, is_active FROM option_values WHERE list_key = ? AND (value = ? OR UPPER(label) = UPPER(?))",
      [listKey, value, label]
    );
    if (existing.length > 0) {
      const match = existing[0];
      return res.status(409).json({
        message: match.is_active
          ? `"${match.label}" is already on this list`
          : `"${match.label}" is already on this list but switched off. Switch it back on instead.`,
      });
    }

    const [[{ next_order }]] = await db().query(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM option_values WHERE list_key = ?",
      [listKey]
    );
    const [result] = await db().query(
      "INSERT INTO option_values (list_key, value, label, sort_order) VALUES (?, ?, ?, ?)",
      [listKey, value, label, next_order]
    );
    const [[row]] = await db().query(
      "SELECT id, list_key, value, label, sort_order, is_active FROM option_values WHERE id = ?",
      [result.insertId]
    );
    return res.status(201).json(toOption(row));
  } catch (error) {
    return fail(res, error, "Error creating option");
  }
};

/** Rename or switch an option on or off. The stored value never changes, so old documents still match. */
exports.updateOption = async (req, res) => {
  const { listKey, id } = req.params;
  const label = cleanLabel(req.body.label);
  const isActive = req.body.is_active;

  if (!isListKey(listKey)) return res.status(404).json({ message: "Unknown list" });
  if (label === undefined && isActive === undefined) {
    return res.status(400).json({ message: "Nothing to update" });
  }
  if (label !== undefined && !label) return res.status(400).json({ message: "A name is required" });

  try {
    if (label) {
      const [clash] = await db().query(
        "SELECT label FROM option_values WHERE list_key = ? AND id <> ? AND UPPER(label) = UPPER(?)",
        [listKey, id, label]
      );
      if (clash.length > 0) {
        return res.status(409).json({ message: `"${clash[0].label}" is already on this list` });
      }
    }

    const sets = [];
    const params = [];
    if (label) {
      sets.push("label = ?");
      params.push(label);
    }
    if (isActive !== undefined) {
      sets.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }
    params.push(id, listKey);

    const [result] = await db().query(
      `UPDATE option_values SET ${sets.join(", ")} WHERE id = ? AND list_key = ?`,
      params
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Option not found" });

    const [[row]] = await db().query(
      "SELECT id, list_key, value, label, sort_order, is_active FROM option_values WHERE id = ?",
      [id]
    );
    return res.status(200).json(toOption(row));
  } catch (error) {
    return fail(res, error, "Error updating option");
  }
};

/* ---------------------------------------------------------- Bank accounts */

const BANK_FIELDS = ["bank_name", "branch_name", "account_name", "account_number", "swift_code", "currency", "notes"];

const toAccount = (row) => ({ ...row, is_default: Boolean(row.is_default), is_active: Boolean(row.is_active) });

function validateAccount(body, partial) {
  const required = { bank_name: "the bank's name", account_name: "the name on the account", account_number: "the account number" };
  for (const [field, text] of Object.entries(required)) {
    if ((!partial || body[field] !== undefined) && !clean(body[field])) return `Enter ${text}`;
  }
  if ((!partial || body.currency !== undefined) && !/^[A-Za-z]{3}$/.test(clean(body.currency) || "")) {
    return "Use a three-letter currency code, such as LKR";
  }
  return null;
}

exports.getBankAccounts = async (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  try {
    const [rows] = await db().query(
      `SELECT * FROM bank_accounts ${includeInactive ? "" : "WHERE is_active = 1"}
       ORDER BY is_default DESC, bank_name, id`
    );
    return res.status(200).json(rows.map(toAccount));
  } catch (error) {
    return fail(res, error, "Error fetching bank accounts");
  }
};

/** Make one account the default, clearing it from the rest, inside the caller's transaction */
async function setOnlyDefault(conn, id) {
  await conn.query("UPDATE bank_accounts SET is_default = 0 WHERE id <> ?", [id]);
  await conn.query("UPDATE bank_accounts SET is_default = 1, is_active = 1 WHERE id = ?", [id]);
}

async function inTransaction(work) {
  const conn = await db().getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function readAccount(id) {
  const [[row]] = await db().query("SELECT * FROM bank_accounts WHERE id = ?", [id]);
  return row ? toAccount(row) : null;
}

exports.createBankAccount = async (req, res) => {
  const problem = validateAccount(req.body, false);
  if (problem) return res.status(400).json({ message: problem });

  const values = BANK_FIELDS.map((field) => {
    const value = clean(req.body[field]);
    return field === "currency" ? value.toUpperCase() : value || null;
  });

  try {
    const id = await inTransaction(async (conn) => {
      const [[{ total }]] = await conn.query("SELECT COUNT(*) AS total FROM bank_accounts");
      const [result] = await conn.query(
        `INSERT INTO bank_accounts (${BANK_FIELDS.join(", ")}) VALUES (?)`,
        [values]
      );
      // The first account is the default whether or not it was asked for
      if (req.body.is_default || total === 0) await setOnlyDefault(conn, result.insertId);
      return result.insertId;
    });
    return res.status(201).json(await readAccount(id));
  } catch (error) {
    return fail(res, error, "Error creating bank account");
  }
};

exports.updateBankAccount = async (req, res) => {
  const { id } = req.params;
  const problem = validateAccount(req.body, true);
  if (problem) return res.status(400).json({ message: problem });

  const sets = [];
  const params = [];
  BANK_FIELDS.forEach((field) => {
    if (req.body[field] === undefined) return;
    const value = clean(req.body[field]);
    sets.push(`${field} = ?`);
    params.push(field === "currency" ? value.toUpperCase() : value || null);
  });
  if (req.body.is_active !== undefined) {
    sets.push("is_active = ?");
    params.push(req.body.is_active ? 1 : 0);
  }

  try {
    const existing = await readAccount(id);
    if (!existing) return res.status(404).json({ message: "Bank account not found" });
    if (req.body.is_active === false && existing.is_default) {
      return res.status(400).json({ message: "Make another account the default before switching this one off" });
    }

    await inTransaction(async (conn) => {
      if (sets.length > 0) {
        await conn.query(`UPDATE bank_accounts SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
      }
      if (req.body.is_default) await setOnlyDefault(conn, id);
    });
    return res.status(200).json(await readAccount(id));
  } catch (error) {
    return fail(res, error, "Error updating bank account");
  }
};

exports.setDefaultBankAccount = async (req, res) => {
  try {
    if (!(await readAccount(req.params.id))) {
      return res.status(404).json({ message: "Bank account not found" });
    }
    await inTransaction((conn) => setOnlyDefault(conn, req.params.id));
    return res.status(200).json(await readAccount(req.params.id));
  } catch (error) {
    return fail(res, error, "Error setting default bank account");
  }
};

exports.deleteBankAccount = async (req, res) => {
  try {
    const existing = await readAccount(req.params.id);
    if (!existing) return res.status(404).json({ message: "Bank account not found" });

    await inTransaction(async (conn) => {
      await conn.query("DELETE FROM bank_accounts WHERE id = ?", [req.params.id]);
      // Hand the default on, so quotations always have an account to print
      if (existing.is_default) {
        const [[next]] = await conn.query(
          "SELECT id FROM bank_accounts WHERE is_active = 1 ORDER BY id LIMIT 1"
        );
        if (next) await setOnlyDefault(conn, next.id);
      }
    });
    return res.status(200).json({ message: "Bank account removed" });
  } catch (error) {
    return fail(res, error, "Error deleting bank account");
  }
};

/* ------------------------------------------------------ Document numbering */

/** One #### for the running number, at most one YY for the year, and characters safe in a job number */
function validateTemplate(template) {
  if (!template) return "Enter a format";
  if (template.length > 60) return "Keep the format under 60 characters";
  if (!/^[A-Za-z0-9/_\-. #]+$/.test(template)) return "Use letters, numbers, spaces and / - _ . only";
  if (template.split("####").length !== 2) return "Put #### exactly once, where the running number goes";
  if (/#/.test(template.replace("####", ""))) return "Use # only as part of ####";
  if (template.split("YY").length > 2) return "Put YY at most once";
  return null;
}

exports.getNumberFormats = async (req, res) => {
  try {
    const [rows] = await db().query(
      "SELECT doc_type, label, template FROM document_number_formats ORDER BY sort_order, doc_type"
    );
    return res.status(200).json(rows);
  } catch (error) {
    return fail(res, error, "Error fetching document number formats");
  }
};

exports.updateNumberFormat = async (req, res) => {
  const { docType } = req.params;
  const template = clean(req.body.template);
  const problem = validateTemplate(template);
  if (problem) return res.status(400).json({ message: problem });

  try {
    // Two types sharing a format would hand out the same numbers
    const [clash] = await db().query(
      "SELECT label FROM document_number_formats WHERE template = ? AND doc_type <> ?",
      [template, docType]
    );
    if (clash.length > 0) {
      return res.status(409).json({ message: `${clash[0].label} already use this format` });
    }

    const [result] = await db().query(
      "UPDATE document_number_formats SET template = ? WHERE doc_type = ?",
      [template, docType]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Document type not found" });

    const [[row]] = await db().query(
      "SELECT doc_type, label, template FROM document_number_formats WHERE doc_type = ?",
      [docType]
    );
    return res.status(200).json(row);
  } catch (error) {
    return fail(res, error, "Error updating document number format");
  }
};
