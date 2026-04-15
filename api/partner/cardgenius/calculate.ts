import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const partnerToken = req.headers["partner-token"];
  if (typeof partnerToken !== "string" || !partnerToken) {
    return res.status(400).json({ error: "Missing partner-token header" });
  }

  try {
    const upstream = await fetch("https://platform.bankkaro.com/partner/cardgenius/calculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "partner-token": partnerToken,
      },
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    return res.send(text);
  } catch {
    return res.status(502).json({ error: "Upstream request failed" });
  }
}

