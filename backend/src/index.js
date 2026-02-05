import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { pool, ensureSchema } from "./db.js";
import * as cheerio from "cheerio";
import { File, Blob, FormData } from "undici";

if (!globalThis.File) globalThis.File = File;
if (!globalThis.Blob) globalThis.Blob = Blob;
if (!globalThis.FormData) globalThis.FormData = FormData;

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

const BusinessSchema = z.object({
  name: z.string().min(1),
  tone: z.string().min(1),
  instructionBlock: z.string().optional().nullable(),
  doList: z.string().optional().nullable(),
  dontList: z.string().optional().nullable(),
  bookingLink: z.string().optional().nullable(),
  hours: z.string().optional().nullable(),
  policies: z.string().optional().nullable(),
  faqs: z.string().optional().nullable(),
});

const ContactSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  lastAppointment: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const WorkflowSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  definition: z.unknown(),
});

const MessageSchema = z.object({
  businessId: z.string().uuid(),
  contactId: z.string().uuid(),
  direction: z.enum(["inbound", "outbound"]),
  channel: z.enum(["sms", "email"]),
  body: z.string().min(1),
  status: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  meta: z.unknown().optional().nullable(),
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

app.get("/api/business", async (req, res) => {
  const { rows } = await pool.query("select * from business_profiles order by created_at desc limit 1");
  res.json(rows[0] || null);
});

app.post("/api/business", async (req, res) => {
  const parsed = BusinessSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }

  const { name, tone, instructionBlock, doList, dontList, bookingLink, hours, policies, faqs } = parsed.data;
  const { rows } = await pool.query(
    `insert into business_profiles (name, tone, instruction_block, do_list, dont_list, booking_link, hours, policies, faqs)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *`,
    [name, tone, instructionBlock || null, doList || null, dontList || null, bookingLink || null, hours || null, policies || null, faqs || null]
  );
  res.json(rows[0]);
});

app.put("/api/business/:id", async (req, res) => {
  const parsed = BusinessSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const { id } = req.params;
  const { name, tone, instructionBlock, doList, dontList, bookingLink, hours, policies, faqs } = parsed.data;
  const { rows } = await pool.query(
    `update business_profiles
     set name=$1, tone=$2, instruction_block=$3, do_list=$4, dont_list=$5,
         booking_link=$6, hours=$7, policies=$8, faqs=$9
     where id=$10 returning *`,
    [name, tone, instructionBlock || null, doList || null, dontList || null, bookingLink || null, hours || null, policies || null, faqs || null, id]
  );
  res.json(rows[0] || null);
});

app.get("/api/contacts", async (req, res) => {
  const { businessId } = req.query;
  if (!businessId) {
    return res.json([]);
  }
  const { rows } = await pool.query("select * from contacts where business_id=$1 order by created_at desc", [
    businessId,
  ]);
  res.json(rows);
});

app.post("/api/contacts", async (req, res) => {
  const parsed = ContactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const { businessId, name, email, phone, lastAppointment, status, notes } = parsed.data;
  const { rows } = await pool.query(
    `insert into contacts (business_id, name, email, phone, last_appointment, status, notes)
     values ($1, $2, $3, $4, $5, $6, $7) returning *`,
    [businessId, name, email || null, phone || null, lastAppointment || null, status || null, notes || null]
  );
  res.json(rows[0]);
});

app.get("/api/workflows", async (req, res) => {
  const { businessId } = req.query;
  if (!businessId) {
    return res.json([]);
  }
  const { rows } = await pool.query("select * from workflows where business_id=$1 order by created_at desc", [
    businessId,
  ]);
  res.json(rows);
});

app.post("/api/workflows", async (req, res) => {
  const parsed = WorkflowSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const { businessId, name, definition } = parsed.data;
  const { rows } = await pool.query(
    `insert into workflows (business_id, name, definition)
     values ($1, $2, $3) returning *`,
    [businessId, name, definition]
  );
  res.json(rows[0]);
});

app.put("/api/workflows/:id", async (req, res) => {
  const parsed = WorkflowSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const { id } = req.params;
  const { businessId, name, definition } = parsed.data;
  const { rows } = await pool.query(
    `update workflows set business_id=$1, name=$2, definition=$3 where id=$4 returning *`,
    [businessId, name, definition, id]
  );
  res.json(rows[0] || null);
});

app.get("/api/messages", async (req, res) => {
  const { businessId, contactId } = req.query;
  if (!businessId) {
    return res.json([]);
  }
  const params = [businessId];
  let where = "business_id=$1";
  if (contactId) {
    params.push(contactId);
    where += ` and contact_id=$${params.length}`;
  }
  const { rows } = await pool.query(`select * from messages where ${where} order by created_at desc`, params);
  res.json(rows);
});

app.post("/api/messages", async (req, res) => {
  const parsed = MessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const { businessId, contactId, direction, channel, body, status, provider, meta } = parsed.data;
  const { rows } = await pool.query(
    `insert into messages (business_id, contact_id, direction, channel, body, status, provider, meta)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
    [businessId, contactId, direction, channel, body, status || null, provider || null, meta || null]
  );
  res.json(rows[0]);
});

app.post("/api/prompt-preview", async (req, res) => {
  const schema = z.object({
    businessId: z.string().uuid(),
    contactId: z.string().uuid(),
    intent: z.enum(["confirm", "reschedule", "no_show", "rebook"]),
    channel: z.enum(["sms", "email"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }

  const { businessId, contactId, intent, channel } = parsed.data;
  const business = await pool.query("select * from business_profiles where id=$1", [businessId]);
  const contact = await pool.query("select * from contacts where id=$1", [contactId]);
  if (!business.rows[0] || !contact.rows[0]) {
    return res.status(404).json({ error: "not_found" });
  }

  const b = business.rows[0];
  const c = contact.rows[0];
  const prompt = `You are the follow-up assistant for ${b.name}.\nTone: ${b.tone}\nInstruction block: ${
    b.instruction_block || "N/A"
  }\nDo list: ${b.do_list || "N/A"}\nDon't list: ${b.dont_list || "N/A"}\nHours: ${b.hours || "N/A"}\nPolicies: ${
    b.policies || "N/A"
  }\nFAQs: ${b.faqs || "N/A"}\nBooking link: ${b.booking_link || "N/A"}\n\nContact: ${
    c.name
  }\nStatus: ${c.status || "unknown"}\nLast appointment: ${c.last_appointment || "unknown"}\nNotes: ${
    c.notes || "none"
  }\n\nGoal: Write a ${channel.toUpperCase()} follow-up for intent "${intent}". Keep it short and actionable.`;

  let text = `Hi ${c.name}, just checking in about your ${b.name} appointment.`;
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
            { role: "system", content: "You are a precise follow-up assistant for local businesses." },
            { role: "user", content: prompt },
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
      // fallback
    }
  }

  res.json({ prompt, text });
});

app.post("/api/scan", async (req, res) => {
  const schema = z.object({
    url: z.string().min(1),
    maxPages: z.number().int().min(1).max(50).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }

  let { url, maxPages } = parsed.data;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const origin = new URL(url).origin;
  const limit = maxPages || 15;
  const queue = [url];
  const visited = new Set();
  const pages = [];
  const textChunks = [];

  while (queue.length && pages.length < limit) {
    const next = queue.shift();
    if (!next || visited.has(next)) continue;
    visited.add(next);
    try {
      const resp = await fetch(next, { redirect: "follow" });
      if (!resp.ok || !resp.headers.get("content-type")?.includes("text/html")) continue;
      const html = await resp.text();
      const $ = cheerio.load(html);
      $("script, style, noscript, svg").remove();
      const title = $("title").first().text().trim();
      const description = $("meta[name='description']").attr("content") || "";
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      const slice = bodyText.slice(0, 4000);
      pages.push({ url: next, title, description });
      textChunks.push([title, description, slice].filter(Boolean).join(" ").trim());

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
        try {
          const resolved = new URL(href, next);
          if (resolved.origin !== origin) return;
          const cleaned = resolved.toString().split("#")[0];
          if (!visited.has(cleaned)) {
            queue.push(cleaned);
          }
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore fetch errors
    }
  }

  const raw = textChunks.join("\n").slice(0, 12000);
  let profile = {
    name: pages[0]?.title || "Business",
    tone: "Warm, concise, confident",
    bookingLink: "",
    hours: "",
    policies: "",
    faqs: "",
    instructionBlock: "",
    doList: "",
    dontList: "",
  };

  if (process.env.GROQ_API_KEY && raw.length > 50) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          temperature: 0.2,
          messages: [
            { role: "system", content: "Extract a business profile from website text. Return JSON only." },
            {
              role: "user",
              content: `Website text:\n${raw}\n\nReturn JSON with keys: name, tone, bookingLink, hours, policies, faqs, instructionBlock, doList, dontList.`,
            },
          ],
        }),
      });
      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const content = groqData?.choices?.[0]?.message?.content?.trim();
        if (content) {
          const jsonStart = content.indexOf("{");
          const jsonEnd = content.lastIndexOf("}");
          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            const parsedJson = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
            profile = { ...profile, ...parsedJson };
          }
        }
      }
    } catch {
      // fallback to defaults
    }
  }

  res.json({ pages, profile, rawSample: raw.slice(0, 1200) });
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
