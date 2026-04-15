const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BANKKARO_API_KEY = Deno.env.get("BANKKARO_UAT_KEY");
const BASE_URL = "https://platform.bankkaro.com/partner";

// Bank ID → Bank name mapping
const BANK_MAP: Record<number, string> = {
  1: "Axis", 2: "HDFC", 3: "ICICI", 4: "SBI", 5: "Kotak",
  6: "Yes Bank", 7: "RBL", 8: "IndusInd", 9: "AU Small Finance",
  10: "IDFC First", 11: "Federal", 12: "BOB", 13: "Canara",
  14: "Union", 15: "PNB", 16: "Standard Chartered", 17: "HSBC",
  18: "Citibank", 19: "Amex", 20: "OneCard",
};

function parseFee(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

interface RawCard {
  id: number;
  name: string;
  bank_id: number;
  annual_fee_text: string | number;
  joining_fee_text?: string | number;
  card_type: string;
  network_url: string;
  image?: string;
  card_bg_image?: string;
  annual_saving?: number;
  tags?: { id: number; name: string; seo_alias: string }[];
  product_usps?: Array<string | { header?: string; description?: string }>;
  welcome_text?: string;
  rating?: number;
  income?: string;
  employment_type?: string;
}

interface NormalizedCard {
  card_id: number;
  card_name: string;
  bank: string;
  annual_fee: number;
  joining_fee: number;
  card_network: string;
  tracking_url: string;
  image_url: string;
  annual_saving: number;
  tags: string[];
  features: string[];
  rewards: { online_spend: string; offline_spend: string };
}

function normalizeCard(raw: RawCard): NormalizedCard {
  const tags = (raw.tags || []).map((t) => t.name);
  const hasFuelTag = (raw.tags || []).some(
    (t) => t.seo_alias === "best-fuel-credit-card"
  );

  // Build features list from tags + usps
  const features: string[] = [];
  if (raw.product_usps && Array.isArray(raw.product_usps)) {
    for (const usp of raw.product_usps) {
      if (typeof usp === "string") {
        features.push(usp);
      } else if (usp && typeof usp === "object") {
        features.push(usp.header || usp.description || "");
      }
    }
  }
  if (hasFuelTag) features.push("Fuel benefits available");
  if (tags.length > 0 && features.length === 0) {
    features.push(...tags.map((t) => `${t} benefits`));
  }

  return {
    card_id: raw.id,
    card_name: raw.name,
    bank: BANK_MAP[raw.bank_id] || `Bank ${raw.bank_id}`,
    annual_fee: parseFee(raw.annual_fee_text),
    joining_fee: parseFee(raw.joining_fee_text),
    card_network: raw.card_type || "Unknown",
    tracking_url: raw.network_url || "",
    image_url: raw.image || raw.card_bg_image || "",
    annual_saving: parseFee(raw.annual_saving),
    tags,
    features: features.length > 0 ? features : ["Credit card"],
    rewards: { online_spend: "0%", offline_spend: "0%" },
  };
}

async function getPartnerToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "x-api-key": BANKKARO_API_KEY }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Token fetch failed:", res.status, text);
    throw new Error(`Failed to get partner token: ${res.status}`);
  }

  const data = await res.json();
  return data?.data?.jwttoken;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!BANKKARO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const partnerToken = await getPartnerToken();
    if (!partnerToken) {
      return new Response(
        JSON.stringify({ error: "Failed to obtain partner token" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching cards catalogue...");
    const response = await fetch(`${BASE_URL}/cardgenius/cards`, {
      method: "GET",
      headers: { "partner-token": partnerToken },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("CardGenius error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Failed to fetch cards", details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = await response.json();
    const rawCards: RawCard[] = Array.isArray(raw) ? raw : raw?.data ?? [];

    // Filter to only fuel-tagged cards
    const fuelCards = rawCards.filter((c) =>
      (c.tags || []).some((t) => t.seo_alias === "best-fuel-credit-card")
    );

    const cards = fuelCards.map(normalizeCard);
    console.log(`Total: ${rawCards.length}, Fuel cards: ${fuelCards.length}`);

    return new Response(
      JSON.stringify({ status: "success", data: cards }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Edge function error:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
