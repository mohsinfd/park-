const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BANKKARO_API_KEY = Deno.env.get("BANKKARO_UAT_KEY");
const BASE_URL = "https://platform.bankkaro.com/partner";

// Fuel tag_id from the init-bundle (tag for "best-fuel-credit-card")
const FUEL_TAG_ID = "1";

const BANK_MAP: Record<number, string> = {
  1: "Axis", 2: "IDFC First", 3: "SBI", 4: "ICICI",
  5: "Kotak", 6: "HDFC", 7: "AU Small Finance Bank",
  8: "IndusInd Bank", 9: "RBL Bank", 10: "Standard Chartered",
  11: "American Express", 12: "HSBC", 13: "Kotak",
  14: "ICICI", 15: "RBL Bank", 16: "Yes Bank",
  17: "Federal Bank", 18: "SBM Bank", 19: "Bank of Baroda",
};

function parseFee(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

interface RawCardsCard {
  id: number;
  name: string;
  card_name?: string;
  bank_id: number;
  card_type?: string;
  image?: string;
  card_bg_image?: string;
  annual_fee_text?: string | number;
  joining_fees?: string | number;
  joining_fee_text?: string | number;
  network_url?: string;
  cg_network_url?: string;
  seo_card_alias?: string;
  card_alias?: string;
  tags?: Array<{ id: number; name: string; seo_alias: string } | string>;
  product_usps?: Array<{ header?: string; description?: string } | string>;
  brand_options?: Array<{ brand: string; spend_key: string }>;
  total_savings?: number;
  total_savings_yearly?: number;
  roi?: number;
  rating?: number;
  lounges?: number;
  spending_breakdown?: Record<string, { savings: number; spend: number }> | Array<{ on: string; savings: number; spend: number }>;
  annual_saving?: number;
}

function normalizeCard(raw: RawCardsCard) {
  // Extract features from product_usps
  const features: string[] = [];
  if (raw.product_usps && Array.isArray(raw.product_usps)) {
    for (const usp of raw.product_usps) {
      if (typeof usp === "string") features.push(usp);
      else if (usp && typeof usp === "object") {
        const text = [usp.header, usp.description].filter(Boolean).join(" — ").trim();
        if (text) features.push(text);
      }
    }
  }

  // Extract tags
  const tags: string[] = [];
  if (raw.tags && Array.isArray(raw.tags)) {
    for (const t of raw.tags) {
      if (typeof t === "string") tags.push(t);
      else if (t && typeof t === "object" && "name" in t) tags.push(t.name);
    }
  }

  if (features.length === 0 && tags.length > 0) {
    features.push(...tags.map((t) => `${t} benefits`));
  }
  if (features.length === 0) features.push("Credit card");

  // Fuel savings from spending_breakdown
  let fuelSavingsMonthly = 0;
  if (raw.spending_breakdown) {
    if (Array.isArray(raw.spending_breakdown)) {
      const entry = raw.spending_breakdown.find((e) => e.on === "fuel");
      if (entry) fuelSavingsMonthly = entry.savings || 0;
    } else if (typeof raw.spending_breakdown === "object") {
      const entry = raw.spending_breakdown["fuel"];
      if (entry) fuelSavingsMonthly = entry.savings || 0;
    }
  }

  const annualFee = parseFee(raw.annual_fee_text ?? raw.joining_fees ?? raw.joining_fee_text);
  const annualSaving = raw.total_savings_yearly ?? raw.annual_saving ?? 0;
  const monthlySaving = raw.total_savings ?? Math.round(annualSaving / 12);

  return {
    card_id: raw.id,
    card_name: raw.name || raw.card_name || "",
    bank: BANK_MAP[raw.bank_id] || `Bank ${raw.bank_id}`,
    annual_fee: annualFee,
    joining_fee: annualFee,
    card_network: raw.card_type || "Unknown",
    tracking_url: raw.network_url || raw.cg_network_url || "",
    image_url: raw.image || raw.card_bg_image || "",
    annual_saving: annualSaving,
    monthly_saving: monthlySaving,
    fuel_savings_monthly: fuelSavingsMonthly,
    tags,
    features,
    rewards: { online_spend: "0%", offline_spend: "0%" },
    brand_options: (raw.brand_options || [])
      .filter((b) => b.spend_key === "fuel")
      .map((b) => b.brand),
    roi: raw.roi || 0,
    rating: raw.rating || 0,
    lounges: raw.lounges || 0,
  };
}

async function getPartnerToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "x-api-key": BANKKARO_API_KEY }),
  });
  if (!res.ok) throw new Error(`Token failed: ${res.status}`);
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

    const body = await req.json().catch(() => ({}));
    const fuelSpend = Number(body.fuel) || 0;
    const pincode = body.pincode ? String(body.pincode) : "";
    const inhandIncome = body.inhandIncome ? String(body.inhandIncome) : "";
    const empStatus = body.empStatus || "";

    const partnerToken = await getPartnerToken();
    if (!partnerToken) {
      return new Response(
        JSON.stringify({ error: "Failed to obtain partner token" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the /cardgenius/cards POST payload
    // eligiblityPayload is only included if we have at least pincode + income
    const hasEligibility = pincode && inhandIncome;

    const payload: Record<string, unknown> = {
      slug: "best-fuel-credit-card",
      banks_ids: [],
      card_networks: [],
      annualFees: "",
      credit_score: "",
      sort_by: "annual_savings",
      free_cards: "",
      cardGeniusPayload: {
        tag_id: FUEL_TAG_ID,
        fuel: String(fuelSpend),
      },
    };

    if (hasEligibility) {
      payload.eligiblityPayload = {
        pincode,
        inhandIncome,
        ...(empStatus ? { empStatus } : {}),
      };
    }

    console.log(`Calling /cardgenius/cards — fuel=${fuelSpend}, eligibility=${hasEligibility ? "yes" : "no"}`);

    const response = await fetch(`${BASE_URL}/cardgenius/cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "partner-token": partnerToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Cards API error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Cards API failed", details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    // The /cards endpoint returns data in different shapes — handle both
    const rawCards: RawCardsCard[] = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
      ? result.data
      : [];

    const cards = rawCards
      .map(normalizeCard)
      .sort((a, b) => b.annual_saving - a.annual_saving);

    console.log(`Cards API returned ${rawCards.length} cards, top: ${cards[0]?.card_name} (₹${cards[0]?.annual_saving}/yr)`);

    return new Response(
      JSON.stringify({
        status: "success",
        data: cards,
        meta: {
          fuel_spend: fuelSpend,
          has_eligibility: Boolean(hasEligibility),
          total_cards: cards.length,
        },
      }),
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
