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

// ─── Normalise a raw card from /calculate or /cards/:alias ───────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCard(raw: any): FuelCard {
  // ── Features / USPs ──────────────────────────────────────────────────────
  const seen = new Set<string>();
  const features: string[] = [];
  if (Array.isArray(raw.product_usps)) {
    for (const usp of raw.product_usps) {
      const str = typeof usp === "string"
        ? usp
        : (usp?.header || usp?.description)
          ? [usp.header, usp.description].filter(Boolean).join(" — ")
          : null;
      if (str) {
        const key = str.toLowerCase().replace(/[\s\t]+/g, " ").replace(/[^\w\s₹%]/g, "").trim();
        if (!seen.has(key)) { seen.add(key); features.push(str); }
      }
    }
  }

  const tags: string[] = Array.isArray(raw.tags)
    ? raw.tags.map((t: { name?: string } | string) => (typeof t === "string" ? t : t?.name ?? "")).filter(Boolean)
    : typeof raw.tags === "string" ? raw.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

  if (features.length === 0) features.push(...(tags.length ? tags.map((t) => `${t} benefits`) : ["Credit card"]));

  // ── Fees ─────────────────────────────────────────────────────────────────
  // joining_fee_text / joining_fees = one-time year-1 fee
  // annual_fee_text / annual_fee    = recurring fee from year 2
  const joiningFee = parseFee(raw.joining_fees ?? raw.joining_fee_text ?? raw.joining_fee ?? 0);
  const annualFee  = parseFee(raw.annual_fee ?? raw.annual_fee_text ?? joiningFee);

  // ── Savings ──────────────────────────────────────────────────────────────
  // /calculate returns total_savings (monthly) and total_savings_yearly
  const monthlySavings  = parseFee(raw.total_savings ?? 0);
  const annualSaving    = parseFee(raw.total_savings_yearly ?? (monthlySavings * 12));
  const roi             = parseFee(raw.roi ?? 0);

  // ── Fuel savings breakdown ────────────────────────────────────────────────
  let fuelSavingsMonthly = 0;
  if (Array.isArray(raw.spending_breakdown_array)) {
    const e = raw.spending_breakdown_array.find((x: { on: string }) => x.on === "fuel");
    if (e) fuelSavingsMonthly = e.savings || 0;
  } else if (raw.spending_breakdown?.fuel) {
    fuelSavingsMonthly = raw.spending_breakdown.fuel.savings || 0;
  }

  // ── Network ──────────────────────────────────────────────────────────────
  // card_type from /cards = real payment network "VISA,Mastercard" — take first
  const rawNetwork: string = raw.card_type || "";
  const cardNetwork = rawNetwork.split(",")[0].trim();

  const alias = raw.seo_card_alias ?? raw.card_alias ?? "";

  return {
    card_id: raw.id ?? raw.card_id ?? alias ?? raw.card_name ?? raw.name,
    card_name: raw.name || raw.card_name || "",
    bank: extractBankFromCardName(raw.name || raw.card_name || "")
      ?? BANK_MAP[raw.bank_id]
      ?? (raw.bank_id ? `Bank ${raw.bank_id}` : raw.bank || ""),
    annual_fee: annualFee,
    joining_fee: joiningFee,
    card_network: cardNetwork,
    tracking_url: raw.cg_network_url || raw.network_url || raw.cg_ek_url || "",
    image_url: raw.image || raw.card_image_url || "",
    bg_image_url: raw.card_bg_image || "",
    bg_gradient: raw.card_bg_gradient || "",
    seo_card_alias: alias,
    annual_saving: annualSaving,
    monthly_saving: monthlySavings || Math.round(annualSaving / 12),
    fuel_savings_monthly: fuelSavingsMonthly,
    tags,
    features,
    rewards: { online_spend: "0%", offline_spend: "0%" },
    brand_options: (raw.brand_options || [])
      .filter((b: { spend_key: string }) => b.spend_key === "fuel")
      .map((b: { brand: string }) => b.brand),
    roi,
    rating: raw.rating || 0,
    lounges: raw.lounges || 0,
  };
}

// ─── /calculate — source of truth for savings & ranking ──────────────────────
// Payload: just {"fuel": fuelSpend}. The API calculates savings for all cards.

async function fetchCalcCards(token: string, fuelSpend: number): Promise<FuelCard[]> {
  const res = await fetch("/api/partner/cardgenius/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "partner-token": token },
    body: JSON.stringify({
      amazon_spends: 0, flipkart_spends: 0, other_online_spends: 0, other_offline_spends: 0,
      grocery_spends_online: 0, online_food_ordering: 0, fuel: fuelSpend,
      dining_or_going_out: 0, flights_annual: 0, hotels_annual: 0,
      domestic_lounge_usage_quarterly: 0, international_lounge_usage_quarterly: 0,
      mobile_phone_bills: 0, electricity_bills: 0, water_bills: 0,
      insurance_health_annual: 0, insurance_car_or_bike_annual: 0,
      life_insurance: 0, offline_grocery: 0, rent: 0, school_fees: 0,
    }),
  });
  if (!res.ok) throw new Error(`/calculate failed: ${res.status}`);
  const result = await res.json();
  const savings = result?.data?.savings ?? result?.savings ?? [];
  console.log(`/calculate → ${savings.length} cards`);
  // Drop cards with zero or negative roi — not worth showing
  return savings.map(normalizeCard).filter((c: FuelCard) => c.roi > 0);
}

// ─── /cards — eligibility filter ─────────────────────────────────────────────
// Returns a Set of eligible seo_card_alias values. Used to filter calc results.
// Requires pincode + inhandIncome + empStatus — if any missing, skip filtering.

async function fetchEligibleAliases(token: string, params: DeepLinkParams): Promise<Set<string> | null> {
  const { fuel, pincode, inhandIncome, empStatus } = params;
  if (!pincode || !inhandIncome || !empStatus) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    slug: "best-fuel-credit-card",
    banks_ids: [], card_networks: [], annualFees: "",
    credit_score: "", sort_by: "annual_savings", free_cards: "",
    cardGeniusPayload: { tag_id: "1", fuel: String(fuel) },
    eligiblityPayload: { pincode, inhandIncome: String(inhandIncome), empStatus },
  };

  const res = await fetch("/api/partner/cardgenius/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json", "partner-token": token },
    body: JSON.stringify(payload),
  });

  if (!res.ok) { console.warn(`/cards failed (${res.status})`); return null; }

  const result = await res.json();
  if (result?.status === "error") { console.warn("/cards error:", result?.error?.message); return null; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = Array.isArray(result?.data?.cards) ? result.data.cards
    : Array.isArray(result?.data) ? result.data : [];

  const aliases = new Set(raw.map((c) => c.seo_card_alias || c.card_alias || "").filter(Boolean));
  console.log(`/cards → ${aliases.size} eligible aliases`);
  return aliases.size > 0 ? aliases : null;
}

// ─── Single card detail ───────────────────────────────────────────────────────

async function fetchCardDetailDirectly(alias: string): Promise<FuelCard> {
  const token = await getPartnerToken();

  const res = await fetch(`/api/partner/cardgenius/card-detail?alias=${encodeURIComponent(alias)}`, {
    method: "GET",
    headers: { "partner-token": token },
  });
  if (!res.ok) throw new Error(`Card detail fetch failed: ${res.status}`);

  const result = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = Array.isArray(result?.data) ? result.data[0] : result?.data ?? result;
  if (!raw) throw new Error("No card data in response");

  return normalizeCard(raw);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchFuelCards(monthlyFuelSpend: number = 5000): Promise<FuelCard[]> {
  const token = await getPartnerToken();
  return fetchCalcCards(token, monthlyFuelSpend);
}

export async function fetchEligibleFuelCards(params: DeepLinkParams): Promise<FuelCard[]> {
  const token = await getPartnerToken();
  const [calcCards, eligibleAliases] = await Promise.all([
    fetchCalcCards(token, params.fuel),
    fetchEligibleAliases(token, params),
  ]);

  if (!eligibleAliases) return calcCards;

  const filtered = calcCards.filter(c => c.seo_card_alias && eligibleAliases.has(c.seo_card_alias));
  console.log(`Eligible: ${filtered.length} of ${calcCards.length} calc cards`);
  return filtered.length > 0 ? filtered : calcCards;
}

export async function fetchCardDetail(alias: string): Promise<FuelCard> {
  return fetchCardDetailDirectly(alias);
}
