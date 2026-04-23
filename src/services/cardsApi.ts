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

// ─── Normalise a raw /cards card ─────────────────────────────────────────────
// /cards is the sole data source. Fields:
//   annual_saving (string)  — API's pre-computed annual saving for the fuel slug
//   joining_fee_text (string) — one-time year-1 fee
//   annual_fee_text (string)  — recurring fee from year 2
//   card_type (string)        — real network e.g. "VISA,Mastercard" (take first)
//   network_url / cg_ek_url   — tracking / affiliate URL
//   image / card_bg_image / card_bg_gradient — visuals
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
  // joining_fee_text = one-time year-1 fee; annual_fee_text = recurring from year 2
  const joiningFee = parseFee(raw.joining_fee_text ?? raw.joining_fees ?? raw.joining_fee ?? 0);
  const annualFee  = parseFee(raw.annual_fee_text ?? raw.annual_fee ?? joiningFee);

  // ── Savings ──────────────────────────────────────────────────────────────
  // annual_saving is the slug-specific pre-computed saving from /cards
  const annualSaving = parseFee(raw.annual_saving ?? raw.total_savings_yearly ?? 0);
  const monthlySaving = Math.round(annualSaving / 12);

  // roi = net benefit after subtracting joining fee (no GST, matches BankKaro convention)
  const roi = annualSaving > joiningFee ? annualSaving - joiningFee : 0;

  // ── Network ──────────────────────────────────────────────────────────────
  // card_type from /cards = real payment network "VISA,Mastercard" — take first
  const rawNetwork: string = raw.card_type || "";
  const cardNetwork = rawNetwork.split(",")[0].trim();

  // ── Alias ─────────────────────────────────────────────────────────────────
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
    tracking_url: raw.network_url || raw.cg_network_url || raw.cg_ek_url || "",
    image_url: raw.image || raw.card_image_url || "",
    bg_image_url: raw.card_bg_image || "",
    bg_gradient: raw.card_bg_gradient || "",
    seo_card_alias: alias,
    annual_saving: annualSaving,
    monthly_saving: monthlySaving,
    fuel_savings_monthly: Math.round(monthlySaving), // best proxy without /calculate breakdown
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

// ─── /cards — single source of truth for fuel card listings ─────────────────
// Always uses slug "best-fuel-credit-card".
// Eligibility (pincode + inhandIncome + empStatus) is included when present.
// Without empStatus the API returns "incomplete eligiblity data" — so we only
// send eligiblityPayload when all three fields are present.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchFromCardsEndpoint(token: string, params: DeepLinkParams): Promise<FuelCard[]> {
  const { fuel, pincode, inhandIncome, empStatus } = params;
  const hasEligibility = Boolean(pincode && inhandIncome && empStatus);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    slug: "best-fuel-credit-card",
    banks_ids: [], card_networks: [], annualFees: "",
    credit_score: "", sort_by: "annual_savings", free_cards: "",
    cardGeniusPayload: { tag_id: "1", fuel: String(fuel) },
    eligiblityPayload: hasEligibility
      ? { pincode, inhandIncome: String(inhandIncome), empStatus }
      : {},
  };

  const res = await fetch("/api/partner/cardgenius/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json", "partner-token": token },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`/cards failed: ${res.status}`);

  const result = await res.json();

  if (result?.status === "error") {
    throw new Error(result?.error?.message ?? result?.message ?? "/cards API error");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = Array.isArray(result?.data?.cards)
    ? result.data.cards
    : Array.isArray(result?.data) ? result.data
    : [];

  console.log(`/cards → ${raw.length} fuel cards (eligibility=${hasEligibility})`);
  return raw.map(normalizeCard);
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
  return fetchFromCardsEndpoint(token, { fuel: monthlyFuelSpend });
}

export async function fetchEligibleFuelCards(params: DeepLinkParams): Promise<FuelCard[]> {
  const token = await getPartnerToken();
  return fetchFromCardsEndpoint(token, params);
}

export async function fetchCardDetail(alias: string): Promise<FuelCard> {
  return fetchCardDetailDirectly(alias);
}
