import { Router } from "express";
import { z } from "zod";
import * as cheerio from "cheerio";
import { groqComplete } from "../lib/ai.js";

export const scanRouter = Router({ mergeParams: true });

scanRouter.post("/", async (req, res) => {
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
          // ignore malformed links
        }
      });
    } catch {
      // ignore fetch errors for individual pages
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

  if (raw.length > 50) {
    const content = await groqComplete(
      [
        { role: "system", content: "Extract a business profile from website text. Return JSON only." },
        {
          role: "user",
          content: `Website text:\n${raw}\n\nReturn JSON with keys: name, tone, bookingLink, hours, policies, faqs, instructionBlock, doList, dontList.`,
        },
      ],
      { temperature: 0.2 }
    );
    if (content) {
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        try {
          profile = { ...profile, ...JSON.parse(content.slice(jsonStart, jsonEnd + 1)) };
        } catch {
          // keep defaults if the model didn't return valid JSON
        }
      }
    }
  }

  res.json({ pages, profile, rawSample: raw.slice(0, 1200) });
});
