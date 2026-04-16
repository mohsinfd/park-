import type { FuelCard, DeepLinkParams } from "@/types/card";

// Proxy BankKaro via Vercel serverless routes under `/api/partner/*`
// so keys never ship to the browser.

// ─── Token ───────────────────────────────────────────────────────────────────

async function getPartnerToken(): Promise<string> {
  const res = await fetch("/api/partner/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  const data = await res.json();
  const token = data?.data?.jwttoken;
  if (!token) throw new Error("No token in response");
  return token;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BANK_MAP: Record<number, string> = {
  1: "Axis", 2: "IDFC First", 3: "SBI", 4: "ICICI",
  5: "Kotak", 6: "HDFC", 7: "IDFC First",
  8: "IndusInd Bank", 9: "RBL Bank", 10: "Standard Chartered",
  11: "American Express", 12: "HSBC", 13: "RBL Bank",
  14: "ICICI", 15: "Kotak", 16: "Yes Bank",
  17: "Federal Bank", 18: "SBM Bank", 19: "Bank of Baroda",
};

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

// ─── Normalise a raw /calculate card ─────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCalcCard(raw: any): FuelCard {
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

  // joining_fee = one-time year-1 fee; annual_fee = recurring from year 2 onwards
  // Keep them separate — the API provides both as distinct fields
  const joiningFee = parseFee(raw.joining_fees ?? raw.joining_fee_text ?? raw.joining_fee ?? 0);
  const annualFee  = parseFee(raw.annual_fee ?? raw.annual_fee_text ?? joiningFee);
  const annualSaving = raw.total_savings_yearly ?? raw.annual_saving ?? 0;
  const alias = raw.seo_card_alias ?? raw.card_alias ?? "";

  return {
    card_id: raw.id ?? raw.card_id ?? alias ?? raw.card_name,
    card_name: raw.name || raw.card_name || "",
    bank: extractBankFromCardName(raw.name || raw.card_name || "")
      ?? BANK_MAP[raw.bank_id]
      ?? (raw.bank_id ? `Bank ${raw.bank_id}` : raw.bank || ""),
    annual_fee: annualFee,
    joining_fee: joiningFee,
    // /calculate card_type = "rewards" (category, useless for network) — leave blank
    card_network: "",
    tracking_url: raw.cg_network_url || raw.network_url || "",
    image_url: raw.card_image_url || raw.image || "",
    bg_image_url: raw.card_bg_image || "",
    bg_gradient: raw.card_bg_gradient || "",
    seo_card_alias: alias,
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

// Visual details from a /cards entry (has gradient, real network, better image)
interface CardVisuals {
  bg_gradient: string;
  bg_image_url: string;
  image_url: string;
  card_network: string; // "VISA,Mastercard" etc — real payment network
  tracking_url: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractVisuals(raw: any): CardVisuals {
  // card_type from /cards is the real network e.g. "VISA,Mastercard" — take first value
  const rawNetwork: string = raw.card_type || "";
  const card_network = rawNetwork.split(",")[0].trim(); // "VISA"
  return {
    bg_gradient: raw.card_bg_gradient || "",
    bg_image_url: raw.card_bg_image || "",
    image_url: raw.image || raw.card_image_url || "",
    card_network,
    tracking_url: raw.cg_network_url || raw.network_url || "",
  };
}

// ─── /calculate — source of truth for savings numbers ────────────────────────

async function fetchCalcCards(token: string, fuelSpend: number): Promise<FuelCard[]> {
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
  if (!res.ok) throw new Error(`/calculate failed: ${res.status}`);
  const result = await res.json();
  const savings = result?.data?.savings ?? result?.savings ?? [];
  console.log(`/calculate → ${savings.length} cards`);
  return savings.map(normalizeCalcCard);
}

// ─── /cards — eligibility filter + visual details ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchCardsVisuals(token: string, params: DeepLinkParams): Promise<Map<string, CardVisuals>> {
  const { fuel, pincode, inhandIncome, empStatus } = params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    slug: "best-fuel-credit-card",
    banks_ids: [], card_networks: [], annualFees: "",
    credit_score: "", sort_by: "annual_savings", free_cards: "",
    cardGeniusPayload: { tag_id: "1", fuel: String(fuel) },
    eligiblityPayload: { pincode, inhandIncome: String(inhandIncome), ...(empStatus ? { empStatus } : {}) },
  };

  const res = await fetch("/api/partner/cardgenius/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json", "partner-token": token },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.warn(`/cards failed (${res.status})`);
    return new Map();
  }

  const result = await res.json();
  // /cards returns data.cards[]
  const raw: unknown[] = Array.isArray(result?.data?.cards)
    ? result.data.cards
    : Array.isArray(result?.data) ? result.data
    : [];

  console.log(`/cards → ${raw.length} eligible cards`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, CardVisuals>();
  for (const card of raw as any[]) {
    const alias = card.seo_card_alias || card.card_alias || "";
    if (alias) map.set(alias, extractVisuals(card));
  }
  return map;
}

// ─── Main fetch functions ─────────────────────────────────────────────────────

async function fetchCardsDirectly(fuelSpend: number): Promise<FuelCard[]> {
  const token = await getPartnerToken();
  return fetchCalcCards(token, fuelSpend);
}

async function fetchEligibleCardsDirectly(params: DeepLinkParams): Promise<FuelCard[]> {
  const token = await getPartnerToken();
  const { fuel, pincode, inhandIncome } = params;
  const hasEligibility = Boolean(pincode && inhandIncome);

  // Run /calculate and (if eligibility) /cards in parallel
  const [calcCards, visualsMap] = await Promise.all([
    fetchCalcCards(token, fuel),
    hasEligibility ? fetchCardsVisuals(token, params) : Promise.resolve(new Map<string, CardVisuals>()),
  ]);

  if (!hasEligibility || visualsMap.size === 0) {
    // No eligibility filtering — return all calc cards as-is
    return calcCards;
  }

  // Filter to eligible cards only, then enrich with visuals from /cards
  const eligible = calcCards
    .filter(card => card.seo_card_alias && visualsMap.has(card.seo_card_alias))
    .map(card => {
      const v = visualsMap.get(card.seo_card_alias!)!;
      return {
        ...card,
        bg_gradient: v.bg_gradient || card.bg_gradient,
        bg_image_url: v.bg_image_url || card.bg_image_url,
        image_url: v.image_url || card.image_url,
        card_network: v.card_network || card.card_network,
        tracking_url: v.tracking_url || card.tracking_url,
      };
    });

  console.log(`Merged: ${eligible.length} eligible cards (from ${calcCards.length} calc cards)`);
  return eligible;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchFuelCards(monthlyFuelSpend: number = 5000): Promise<FuelCard[]> {
  return fetchCardsDirectly(monthlyFuelSpend);
}

export async function fetchEligibleFuelCards(params: DeepLinkParams): Promise<FuelCard[]> {
  return fetchEligibleCardsDirectly(params);
}
