import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";

export const calendarsRouter = Router({ mergeParams: true });

calendarsRouter.get("/", async (req, res) => {
  const { rows } = await pool.query("select * from calendars where sub_account_id=$1 order by name asc", [
    req.subAccount.id,
  ]);
  res.json(rows);
});

const ConfigSchema = z.object({
  availability: z
    .array(z.object({ day: z.number().int().min(0).max(6), start: z.string(), end: z.string() }))
    .optional(),
  slotMinutes: z.number().int().min(5).optional(),
  bufferMinutes: z.number().int().min(0).optional(),
  leadTimeHours: z.number().int().min(0).optional(),
  bookingWindowDays: z.number().int().min(1).optional(),
});

const CalendarSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["round_robin", "collective", "class", "service", "event", "personal"]).default("personal"),
  config: ConfigSchema.default({}),
});

calendarsRouter.post("/", async (req, res) => {
  const parsed = CalendarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const { rows } = await pool.query(
    "insert into calendars (sub_account_id, name, type, config) values ($1,$2,$3,$4) returning *",
    [req.subAccount.id, parsed.data.name, parsed.data.type, JSON.stringify(parsed.data.config)]
  );
  res.json(rows[0]);
});

calendarsRouter.put("/:calendarId", async (req, res) => {
  const parsed = CalendarSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  const existing = await pool.query("select * from calendars where id=$1 and sub_account_id=$2", [
    req.params.calendarId,
    req.subAccount.id,
  ]);
  if (!existing.rows[0]) return res.status(404).json({ error: "not_found" });
  const current = existing.rows[0];
  const d = parsed.data;
  const { rows } = await pool.query("update calendars set name=$1, type=$2, config=$3 where id=$4 returning *", [
    d.name ?? current.name,
    d.type ?? current.type,
    d.config ? JSON.stringify(d.config) : current.config,
    req.params.calendarId,
  ]);
  res.json(rows[0]);
});

calendarsRouter.delete("/:calendarId", async (req, res) => {
  await pool.query("delete from calendars where id=$1 and sub_account_id=$2", [
    req.params.calendarId,
    req.subAccount.id,
  ]);
  res.json({ ok: true });
});
