import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { processTrigger } from "../lib/workflowEngine.js";

export const appointmentsRouter = Router({ mergeParams: true });

appointmentsRouter.get("/", async (req, res) => {
  const { calendarId, contactId, status } = req.query;
  const params = [req.subAccount.id];
  let where = "sub_account_id=$1";
  if (calendarId) {
    params.push(calendarId);
    where += ` and calendar_id=$${params.length}`;
  }
  if (contactId) {
    params.push(contactId);
    where += ` and contact_id=$${params.length}`;
  }
  if (status) {
    params.push(status);
    where += ` and status=$${params.length}`;
  }
  const { rows } = await pool.query(`select * from appointments where ${where} order by start_time asc`, params);
  res.json(rows);
});

const AppointmentSchema = z.object({
  calendarId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  notes: z.string().optional().nullable(),
});

appointmentsRouter.post("/", async (req, res) => {
  const parsed = AppointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const d = parsed.data;
  const start = new Date(d.startTime);
  const end = new Date(d.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ error: "invalid_time_range" });
  }

  if (d.calendarId) {
    const conflict = await pool.query(
      `select 1 from appointments where calendar_id=$1 and status != 'cancelled'
       and start_time < $3 and end_time > $2 limit 1`,
      [d.calendarId, start.toISOString(), end.toISOString()]
    );
    if (conflict.rows[0]) {
      return res.status(409).json({ error: "slot_unavailable" });
    }
  }

  const { rows } = await pool.query(
    `insert into appointments (sub_account_id, calendar_id, contact_id, start_time, end_time, status, notes)
     values ($1,$2,$3,$4,$5,'booked',$6) returning *`,
    [req.subAccount.id, d.calendarId || null, d.contactId, start.toISOString(), end.toISOString(), d.notes || null]
  );
  const appointment = rows[0];

  await pool.query("update contacts set last_appointment=$1 where id=$2", [start.toISOString(), d.contactId]);
  const contactRes = await pool.query("select * from contacts where id=$1", [d.contactId]);
  if (contactRes.rows[0]) {
    processTrigger(req.subAccount.id, "appointment_created", contactRes.rows[0], { appointment }).catch(() => {});
  }
  res.json(appointment);
});

appointmentsRouter.post("/:appointmentId/status", async (req, res) => {
  const schema = z.object({
    status: z.enum(["booked", "confirmed", "cancelled", "showed", "no_show", "reschedule_requested"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const { rows } = await pool.query(
    "update appointments set status=$1 where id=$2 and sub_account_id=$3 returning *",
    [parsed.data.status, req.params.appointmentId, req.subAccount.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "not_found" });

  if (parsed.data.status === "no_show") {
    await pool.query("update contacts set status='no-show' where id=$1", [rows[0].contact_id]);
  }
  const contactRes = await pool.query("select * from contacts where id=$1", [rows[0].contact_id]);
  if (contactRes.rows[0]) {
    processTrigger(req.subAccount.id, "appointment_status_changed", contactRes.rows[0], {
      status: parsed.data.status,
    }).catch(() => {});
  }
  res.json(rows[0]);
});

appointmentsRouter.delete("/:appointmentId", async (req, res) => {
  await pool.query("delete from appointments where id=$1 and sub_account_id=$2", [
    req.params.appointmentId,
    req.subAccount.id,
  ]);
  res.json({ ok: true });
});
