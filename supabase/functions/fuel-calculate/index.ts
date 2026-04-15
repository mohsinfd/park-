const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BANKKARO_API_KEY = Deno.env.get("BANKKARO_UAT_KEY");
const BASE_URL = "https://platform.bankkaro.com/partner";

const BANK_MAP: Record<number, string> = {
  1: "Axis", 2: "IDFC First", 3: "SBI", 4: "ICICI",
  5: "Kotak", 6: "HDFC", 7: "AU Small Finance Bank",
  8: "IndusInd Bank", 9: "RBL Bank", 10: "Standard Chartered",
  11: "American Express", 12: "HSBC", 13: "Kotak",
  14: "ICICI", 15: "RBL Bank", 16: "Yes Bank",
  17: "Federal Bank", 18: "SBM Bank", 19: "Bank of Baroda",
};

// All required fields for /cardgenius/calculate
const CALCULATE_FIELDS = [
  "amazon_spends", "flipkart_spends", "other_online_spends",
  "other_offline_spends", "grocery_spends_online", "offline_grocery",
  "online_food_ordering", "fuel", "dining_or_going_out", "flights_annual",
  "hotels_annual", "rent", "school_fees", "domestic_lounge_usage_quarterly",
  "international_lounge_usage_quarterly", "mobile_phone_bills",
  "electricity_bills", "water_bills", "insurance_health_annual",
  "insurance_car_or_bike_annual", "life_insurance",
] as const;

function parseFee(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

interface CalcCard {
  id: number;
  name: string;
  card_name: string;
  bank_id: number;
  card_type: string;
  image?: string;
  card_bg_image?: string;
  joining_fees?: string | number;
  network_url?: string;
  cg_network_url?: string;
  seo_card_alias?: string;
  tags?: string;
  total_savings: number;
  total_savings_yearly: number;
  max_potential_savings: number;
  total_spends: number;
  total_beneficial_spends: number;
  roi?: number;
  rating?: number;
  lounges?: number;
  product_usps?: Array<{ header?: string; description?: string }>;
  brand_options?: Array<{ brand: string; spend_key: string }>;
  spending_breakdown?: Record<string, { savings: number; spend: number }> | Array<{ on: string; savings: number; spend: number }>;
  category_breakdown?: Record<string, { savings: number; spend: number }>;
}

function normalizeCalcCard(raw: CalcCard) {
  // Extract features from product_usps
  const features: string[] = [];
  if (raw.product_usps && Array.isArray(raw.product_usps)) {
    for (const usp of raw.product_usps) {
      if (typeof usp === "string") features.push(usp);
      else if (usp && typeof usp === "object") {
        const text = [usp.header, usp.description].filter(Boolean).join(" ").trim();
        if (text) features.push(text);
      }
    }
  }

  // Extract tags
  const tags: string[] = raw.tags
    ? raw.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
    : [];

  if (features.length === 0 && tags.length > 0) {
    features.push(...tags.map((t) => `${t} benefits`));
  }
  if (features.length === 0) features.push("Credit card");

  // Get fuel-specific savings from spending_breakdown
  let fuelSavingsMonthly = 0;
  if (raw.spending_breakdown) {
    if (Array.isArray(raw.spending_breakdown)) {
      const fuelEntry = raw.spending_breakdown.find((e) => e.on === "fuel");
      if (fuelEntry) fuelSavingsMonthly = fuelEntry.savings || 0;
    } else if (typeof raw.spending_breakdown === "object") {
      const fuelEntry = raw.spending_breakdown["fuel"];
      if (fuelEntry) fuelSavingsMonthly = fuelEntry.savings || 0;
    }
  }

  const joiningFee = parseFee(raw.joining_fees);

  return {
    card_id: raw.id,
    card_name: raw.name || raw.card_name,
    bank: BANK_MAP[raw.bank_id] || `Bank ${raw.bank_id}`,
    annual_fee: joiningFee, // joining_fees is the annual recurring fee in this API
    joining_fee: joiningFee,
    card_network: raw.card_type || "Unknown",
    tracking_url: raw.network_url || raw.cg_network_url || "",
    image_url: raw.image || raw.card_bg_image || "",
    annual_saving: raw.total_savings_yearly,
    monthly_saving: raw.total_savings,
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

    const partnerToken = await getPartnerToken();
    if (!partnerToken) {
      return new Response(
        JSON.stringify({ error: "Failed to obtain partner token" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build payload with all required fields, setting fuel to user's spend
    const payload: Record<string, number> = {};
    for (const field of CALCULATE_FIELDS) {
      payload[field] = field === "fuel" ? fuelSpend : 0;
    }

    console.log(`Calling /cardgenius/calculate with fuel=${fuelSpend}`);

    const response = await fetch(`${BASE_URL}/cardgenius/calculate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "partner-token": partnerToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Calculate API error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Calculate API failed", details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const savings: CalcCard[] = result?.data?.savings || [];

    // Normalize and sort by yearly savings
    const cards = savings
      .map(normalizeCalcCard)
      .sort((a, b) => b.annual_saving - a.annual_saving);

    console.log(`Calculate returned ${savings.length} cards, top: ${cards[0]?.card_name} (₹${cards[0]?.annual_saving}/yr)`);

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
