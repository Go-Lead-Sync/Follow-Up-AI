import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { pool } from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await pool.query("select 1 as ok");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "db" });
  }
});

const FollowupSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(["sms", "email"]),
  intent: z.enum(["confirm", "reschedule", "no_show", "rebook"]),
  businessName: z.string().min(1),
  appointmentTime: z.string().min(1),
});

app.post("/api/followup/compose", async (req, res) => {
  const parsed = FollowupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }

  const { name, channel, intent, businessName, appointmentTime } = parsed.data;

  const templateByIntent = {
    confirm: `Hi ${name}, just confirming your appointment with ${businessName} at ${appointmentTime}. Reply YES to confirm or RESCHEDULE to pick a new time.`,
    reschedule: `No problem ${name}. What time works better for you to reschedule with ${businessName}?`,
    no_show: `Hey ${name}, we missed you today at ${businessName}. Want to grab the next available time this week?`,
    rebook: `Thanks for coming in, ${name}. Want to book your next visit with ${businessName}?`,
  };

  const text = templateByIntent[intent];
  res.json({ channel, text });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Follow-Up AI backend running on :${port}`);
});
