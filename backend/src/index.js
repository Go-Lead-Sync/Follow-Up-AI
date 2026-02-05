import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { pool, ensureSchema } from "./db.js";

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

  let text = templateByIntent[intent];

  if (process.env.GROQ_API_KEY) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "You are a follow-up assistant for local businesses. Keep messages short, friendly, and action-oriented. Never invent policies or prices.",
            },
            {
              role: "user",
              content: `Compose a ${channel.toUpperCase()} message for ${intent}.\nClient: ${name}\nBusiness: ${businessName}\nAppointment: ${appointmentTime}`,
            },
          ],
        }),
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const candidate = groqData?.choices?.[0]?.message?.content?.trim();
        if (candidate) {
          text = candidate;
        }
      }
    } catch (err) {
      // fallback to template
    }
  }

  try {
    await pool.query(
      `insert into followup_requests (name, business_name, appointment_time, channel, intent, response_text)
       values ($1, $2, $3, $4, $5, $6)`,
      [name, businessName, appointmentTime, channel, intent, text]
    );
  } catch (err) {
    // ignore db errors for MVP response
  }

  res.json({ channel, text });
});

const port = Number(process.env.PORT || 8080);
ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Follow-Up AI backend running on :${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start:", err.message);
    process.exit(1);
  });
