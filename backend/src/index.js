import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool, ensureSchema } from "./db.js";
import { requireAuth, requireSubAccount } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { agencyRouter } from "./routes/agency.js";
import { contactsRouter } from "./routes/contacts.js";
import { tagsRouter } from "./routes/tags.js";
import { customFieldsRouter } from "./routes/customFields.js";
import { smartListsRouter } from "./routes/smartLists.js";
import { pipelinesRouter } from "./routes/pipelines.js";
import { opportunitiesRouter } from "./routes/opportunities.js";
import { conversationsRouter } from "./routes/conversations.js";
import { calendarsRouter } from "./routes/calendars.js";
import { appointmentsRouter } from "./routes/appointments.js";
import { workflowsRouter } from "./routes/workflows.js";
import { customValuesRouter } from "./routes/customValues.js";
import { reportsRouter } from "./routes/reports.js";
import { scanRouter } from "./routes/scan.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { processDueEnrollments } from "./lib/workflowEngine.js";

if (!globalThis.File) {
  globalThis.File = class File {};
}
if (!globalThis.Blob) {
  globalThis.Blob = class Blob {};
}
if (!globalThis.FormData) {
  globalThis.FormData = class FormData {};
}

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

// Public --------------------------------------------------------------------
app.use("/api/auth", authRouter);
app.use("/api/webhooks", webhooksRouter);

// Agency-scoped (requires login) ---------------------------------------------
app.use("/api/agency", requireAuth, agencyRouter);

// Sub-account-scoped modules --------------------------------------------------
const subAccountRouter = express.Router({ mergeParams: true });
subAccountRouter.use("/contacts", contactsRouter);
subAccountRouter.use("/tags", tagsRouter);
subAccountRouter.use("/custom-fields", customFieldsRouter);
subAccountRouter.use("/smart-lists", smartListsRouter);
subAccountRouter.use("/pipelines", pipelinesRouter);
subAccountRouter.use("/opportunities", opportunitiesRouter);
subAccountRouter.use("/conversations", conversationsRouter);
subAccountRouter.use("/calendars", calendarsRouter);
subAccountRouter.use("/appointments", appointmentsRouter);
subAccountRouter.use("/workflows", workflowsRouter);
subAccountRouter.use("/custom-values", customValuesRouter);
subAccountRouter.use("/reports", reportsRouter);
subAccountRouter.use("/scan", scanRouter);

app.use("/api/sub-accounts/:subAccountId", requireAuth, requireSubAccount, subAccountRouter);

app.post("/api/workflows/tick", requireAuth, async (req, res) => {
  const processed = await processDueEnrollments();
  res.json({ processed });
});

const port = Number(process.env.PORT || 8080);

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Follow-Up AI platform backend running on :${port}`);
    });
    // Best-effort scheduler for "wait" workflow steps. In production this can
    // also be triggered externally via POST /api/workflows/tick on a cron.
    setInterval(() => {
      processDueEnrollments().catch((err) => console.error("tick failed:", err.message));
    }, 60_000);
  })
  .catch((err) => {
    console.error("Failed to start:", err.message);
    process.exit(1);
  });
