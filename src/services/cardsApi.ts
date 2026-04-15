import { supabase } from "@/integrations/supabase/client";
import type { CardApiResponse, EligibleCardsApiResponse, FuelCard, DeepLinkParams } from "@/types/card";

const UAT_API_KEY = import.meta.env.VITE_BANKKARO_API_KEY as string;
const IS_DEV = import.meta.env.DEV;

// ─── Local dev: call BankKaro API directly via Vite proxy ────────────────────

async function getPartnerToken(): Promise<string> {
  const res = await fetch("/api/partner/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "x-api-key": UAT_API_KEY }),
  });
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  const data = await res.json();
  const token = data?.data?.jwttoken;
  if (!token) throw new Error("No token in response");
  return token;
}

// bank_id → bank name fallback (API doesn't return bank_name; these IDs drift, so
// we prefer extractBankFromCardName() and only use this map as a last resort)
const BANK_MAP: Record<number, string> = {
  1: "Axis", 2: "IDFC First", 3: "SBI", 4: "ICICI",
  5: "Kotak", 6: "HDFC", 7: "IDFC First",
  8: "IndusInd Bank", 9: "RBL Bank", 10: "Standard Chartered",
  11: "American Express", 12: "HSBC", 13: "RBL Bank",
  14: "ICICI", 15: "Kotak", 16: "Yes Bank",
  17: "Federal Bank", 18: "SBM Bank", 19: "Bank of Baroda",
};

// Extract bank name directly from the card name — more reliable than bank_id
function extractBankFromCardName(name: string): string | null {
  const n = name.toUpperCase();
  if (n.includes("AXIS")) return "Axis Bank";
  if (n.includes("HDFC")) return "HDFC Bank";
  if (n.includes("ICICI")) return "ICICI Bank";
  if (n.includes("STATE BANK") || /\bSBI\b/.test(n)) return "SBI";
  if (n.includes("KOTAK")) return "Kotak";
  if (n.includes("IDFC")) return "IDFC First";
  if (n.includes("RBL")) return "RBL Bank";
  if (n.includes("INDUSIND")) return "IndusInd Bank";
  if (n.includes("HSBC")) return "HSBC";
  if (n.includes("AMEX") || n.includes("AMERICAN EXPRESS")) return "Amex";
  if (n.includes("STANDARD CHARTERED")) return "Standard Chartered";
  if (/\bYES\b/.test(n)) return "Yes Bank";
  if (n.includes("AU SMALL") || /\bAU\b/.test(n)) return "AU Small Finance";
  if (n.includes("FEDERAL")) return "Federal Bank";
  if (n.includes("SBM")) return "SBM Bank";
  if (n.includes("BANK OF BARODA") || /\bBOB\b/.test(n)) return "Bank of Baroda";
  return null;
}

function parseFee(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") { const n = parseInt(val, 10); return isNaN(n) ? 0 : n; }
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCard(raw: any): FuelCard {
  const features: string[] = [];
  if (Array.isArray(raw.product_usps)) {
    for (const usp of raw.product_usps) {
      if (typeof usp === "string") features.push(usp);
      else if (usp?.header || usp?.description)
        features.push([usp.header, usp.description].filter(Boolean).join(" — "));
    }
  }
  const tags: string[] = Array.isArray(raw.tags)
    ? raw.tags.map((t: { name?: string } | string) => (typeof t === "string" ? t : t?.name ?? "")).filter(Boolean)
    : typeof raw.tags === "string" ? raw.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

  if (features.length === 0) features.push(...(tags.length ? tags.map((t) => `${t} benefits`) : ["Credit card"]));

  let fuelSavingsMonthly = 0;
  if (raw.spending_breakdown) {
    if (Array.isArray(raw.spending_breakdown)) {
      const e = raw.spending_breakdown.find((x: { on: string }) => x.on === "fuel");
      if (e) fuelSavingsMonthly = e.savings || 0;
    } else if (raw.spending_breakdown?.fuel) {
      fuelSavingsMonthly = raw.spending_breakdown.fuel.savings || 0;
    }
  }

  const annualFee = parseFee(raw.annual_fee_text ?? raw.annual_fee ?? raw.joining_fees ?? raw.joining_fee_text ?? 0);
  const annualSaving = raw.total_savings_yearly ?? raw.annual_saving ?? 0;

  return {
    card_id: raw.id ?? raw.card_id ?? raw.seo_card_alias ?? raw.card_name,
    card_name: raw.name || raw.card_name || "",
    bank: extractBankFromCardName(raw.name || raw.card_name || "")
      ?? BANK_MAP[raw.bank_id]
      ?? (raw.bank_id ? `Bank ${raw.bank_id}` : raw.bank || ""),
    annual_fee: annualFee,
    joining_fee: annualFee,
    card_network: raw.card_type || raw.card_network || "Unknown",
    tracking_url: raw.cg_network_url || raw.network_url || "",
    // Prefer `image` (card face) — card_bg_image is unreliable, sometimes points to wrong card
    image_url: raw.card_image_url || raw.image || "",
    annual_saving: annualSaving,
    monthly_saving: raw.total_savings ?? Math.round(annualSaving / 12),
    fuel_savings_monthly: fuelSavingsMonthly,
    tags,
    features,
    rewards: { online_spend: "0%", offline_spend: "0%" },
    brand_options: (raw.brand_options || []).filter((b: { spend_key: string }) => b.spend_key === "fuel").map((b: { brand: string }) => b.brand),
    roi: raw.roi || 0,
    rating: raw.rating || 0,
    lounges: raw.lounges || 0,
  };
}

async function fetchCardsDirectly(fuelSpend: number): Promise<FuelCard[]> {
  const token = await getPartnerToken();
  const CALCULATE_FIELDS = [
    "amazon_spends", "flipkart_spends", "other_online_spends", "other_offline_spends",
    "grocery_spends_online", "offline_grocery", "online_food_ordering", "fuel",
    "dining_or_going_out", "flights_annual", "hotels_annual", "rent", "school_fees",
    "domestic_lounge_usage_quarterly", "international_lounge_usage_quarterly",
    "mobile_phone_bills", "electricity_bills", "water_bills",
    "insurance_health_annual", "insurance_car_or_bike_annual", "life_insurance",
  ];
  const payload: Record<string, number> = {};
  for (const f of CALCULATE_FIELDS) payload[f] = f === "fuel" ? fuelSpend : 0;

  const res = await fetch("/api/partner/cardgenius/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "partner-token": token },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Calculate API failed: ${res.status}`);
  const result = await res.json();
  console.log("Calculate API raw response keys:", Object.keys(result));
  const savings = result?.data?.savings ?? result?.savings ?? [];
  console.log(`/cardgenius/calculate returned ${savings.length} cards, first:`, savings[0]?.card_name ?? savings[0]?.name);
  return savings.map(normalizeCard).sort((a: FuelCard, b: FuelCard) => b.annual_saving - a.annual_saving);
}

async function fetchEligibleCardsDirectly(params: DeepLinkParams): Promise<FuelCard[]> {
  const token = await getPartnerToken();
  const { fuel, pincode, inhandIncome, empStatus } = params;
  const hasEligibility = pincode && inhandIncome;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    slug: "best-fuel-credit-card",
    banks_ids: [], card_networks: [], annualFees: "",
    credit_score: "", sort_by: "annual_savings", free_cards: "",
    cardGeniusPayload: { tag_id: "1", fuel: String(fuel) },
  };
  if (hasEligibility) {
    payload.eligiblityPayload = { pincode, inhandIncome: String(inhandIncome), ...(empStatus ? { empStatus } : {}) };
  }

  const res = await fetch("/api/partner/cardgenius/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json", "partner-token": token },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.warn(`/cardgenius/cards failed (${res.status}), falling back to /cardgenius/calculate`);
    return fetchCardsDirectly(params.fuel);
  }

  const result = await res.json();
  console.log("Cards API raw response keys:", Object.keys(result));

  // Handle various response shapes
  const raw = Array.isArray(result)
    ? result
    : Array.isArray(result?.data)
    ? result.data
    : Array.isArray(result?.data?.savings)
    ? result.data.savings
    : [];

  console.log(`/cardgenius/cards returned ${raw.length} cards`);

  if (raw.length === 0) {
    console.warn("No cards from /cardgenius/cards, falling back to /cardgenius/calculate");
    return fetchCardsDirectly(params.fuel);
  }

  return raw.map(normalizeCard).sort((a: FuelCard, b: FuelCard) => b.annual_saving - a.annual_saving);
}

// ─── Production: call via Supabase edge functions ────────────────────────────

async function fetchCardsViaSupabase(fuelSpend: number): Promise<FuelCard[]> {
  const { data, error } = await supabase.functions.invoke<CardApiResponse>("fuel-calculate", {
    body: { fuel: fuelSpend },
  });
  if (error) throw new Error("Failed to fetch fuel cards. Please try again.");
  if (!data || data.status !== "success") throw new Error("Invalid response from cards API");
  return data.data;
}

async function fetchEligibleCardsViaSupabase(params: DeepLinkParams): Promise<FuelCard[]> {
  const { data, error } = await supabase.functions.invoke<EligibleCardsApiResponse>("fuel-cards-eligible", {
    body: params,
  });
  if (!error && data?.status === "success") return data.data;
  // Fallback to fuel-calculate if fuel-cards-eligible not yet deployed
  console.warn("fuel-cards-eligible unavailable, falling back to fuel-calculate");
  return fetchCardsViaSupabase(params.fuel);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchFuelCards(monthlyFuelSpend: number = 5000): Promise<FuelCard[]> {
  if (IS_DEV) return fetchCardsDirectly(monthlyFuelSpend);
  return fetchCardsViaSupabase(monthlyFuelSpend);
}

export async function fetchEligibleFuelCards(params: DeepLinkParams): Promise<FuelCard[]> {
  if (IS_DEV) return fetchEligibleCardsDirectly(params);
  return fetchEligibleCardsViaSupabase(params);
}
