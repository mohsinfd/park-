import type { VercelRequest, VercelResponse } from "@vercel/node";

const BANKKARO_API_KEY = process.env.BANKKARO_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!BANKKARO_API_KEY) return res.status(500).json({ error: "Missing BANKKARO_API_KEY env var" });

  try {
    const upstream = await fetch("https://platform.bankkaro.com/partner/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "x-api-key": BANKKARO_API_KEY }),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: "Upstream request failed" });
  }
}

