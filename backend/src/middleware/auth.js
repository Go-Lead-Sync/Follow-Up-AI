import { verifyToken } from "../lib/auth.js";
import { pool } from "../db.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload?.userId) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const { rows } = await pool.query("select * from users where id=$1", [payload.userId]);
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  req.user = user;
  next();
}

export async function requireSubAccount(req, res, next) {
  const subAccountId = req.params.subAccountId;
  const { rows } = await pool.query("select * from sub_accounts where id=$1 and agency_id=$2", [
    subAccountId,
    req.user.agency_id,
  ]);
  const subAccount = rows[0];
  if (!subAccount) {
    return res.status(404).json({ error: "sub_account_not_found" });
  }
  if (
    req.user.role === "user" &&
    Array.isArray(req.user.scoped_sub_account_ids) &&
    req.user.scoped_sub_account_ids.length > 0 &&
    !req.user.scoped_sub_account_ids.includes(subAccountId)
  ) {
    return res.status(403).json({ error: "forbidden" });
  }
  req.subAccount = subAccount;
  next();
}

export function requireAgencyAdmin(req, res, next) {
  if (req.user.role !== "agency_admin" && req.user.role !== "admin") {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}

export async function logAudit({ subAccountId, userId, action, entityType, entityId, meta }) {
  try {
    await pool.query(
      `insert into audit_logs (sub_account_id, user_id, action, entity_type, entity_id, meta)
       values ($1, $2, $3, $4, $5, $6)`,
      [subAccountId || null, userId || null, action, entityType || null, entityId || null, meta || null]
    );
  } catch {
    // audit logging must never break the request
  }
}
