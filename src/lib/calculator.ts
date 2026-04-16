import type { FuelCard, RankedCard, FuelFiltersState } from "@/types/card";

// Canonical brand display names
const BRAND_LABELS: Record<string, string> = {
  Indian: "Indian Oil",
  IndianOil: "Indian Oil",
  IOCL: "Indian Oil",
  BPCL: "BPCL",
  HP: "HPCL",
  HPCL: "HPCL",
  Shell: "Shell",
};

/**
 * Returns a small set of clean, factual pills for a fuel card.
 * Sources only real API data — no synthetic labels from keyword matching.
 *
 * Pill types:
 *  • Pump brand(s) from brand_options  e.g. "Indian Oil", "BPCL"
 *  • "Surcharge waiver" if explicitly mentioned in features/tags
 */
export function extractFuelTags(card: FuelCard): string[] {
  const tags: string[] = [];

  // 1. Pump brands — clean names, no "Benefits" suffix
  for (const brand of card.brand_options || []) {
    if (brand) tags.push(BRAND_LABELS[brand] ?? brand);
  }

  // 2. Surcharge waiver — only if the API explicitly says so
  const hasSurchargeWaiver = [...card.features, ...card.tags].some((s) =>
    /surcharge\s*waiver/i.test(s)
  );
  if (hasSurchargeWaiver) tags.push("Surcharge waiver");

  return [...new Set(tags)]; // deduplicate
}

const GST_RATE = 0.18; // 18% GST on credit card joining/annual fee

/** Annual fee inclusive of 18% GST — what the user actually pays */
export function feeWithGst(fee: number): number {
  return Math.round(fee * (1 + GST_RATE));
}

/** Rankings use API-provided savings from /cardgenius/calculate */
export function rankCards(cards: FuelCard[], monthlyFuelSpend: number): RankedCard[] {
  const ranked: RankedCard[] = cards
    .map((card) => {
      const feeIncGst = feeWithGst(card.annual_fee);
      // Use roi from API when available — this equals total_savings_yearly - joining_fees
      // (no GST added), which matches great.cards ranking. Fall back to manual calc only
      // if roi is missing/zero and card has savings.
      const annualSavingNet = card.roi > 0
        ? card.roi
        : card.annual_saving - feeIncGst;
      const fuelTags = extractFuelTags(card);
      const cashbackRate = monthlyFuelSpend > 0
        ? card.fuel_savings_monthly / monthlyFuelSpend
        : 0;

      return {
        ...card,
        annual_fee: feeIncGst,          // replace stored fee with GST-inclusive figure
        joining_fee: feeWithGst(card.joining_fee),
        cashback_rate: cashbackRate,
        annual_saving_net: annualSavingNet,
        fuel_tags: fuelTags,
      };
    })
    // Drop cards that cost more than they save — not worth showing
    .filter((card) => card.annual_saving_net > 0);

  return ranked.sort((a, b) => b.annual_saving_net - a.annual_saving_net);
}

export function detectNetwork(card: FuelCard): string {
  if (card.card_network) {
    const net = card.card_network.toLowerCase();
    if (net.includes("visa")) return "Visa";
    if (net.includes("mastercard")) return "Mastercard";
    if (net.includes("rupay")) return "RuPay";
    if (net.includes("amex") || net.includes("american")) return "Amex";
  }
  return "Other";
}

function matchesFeeRange(fee: number, range: import("@/types/card").FeeRange): boolean {
  switch (range) {
    case "ltf": return fee === 0;
    case "1-1000": return fee >= 1 && fee <= 1000;
    case "1001-2000": return fee >= 1001 && fee <= 2000;
    case "2000+": return fee > 2000;
  }
}

export function filterCards(cards: RankedCard[], filters: FuelFiltersState): RankedCard[] {
  return cards.filter((card) => {
    if (filters.feeRanges.length > 0) {
      if (!filters.feeRanges.some((range) => matchesFeeRange(card.annual_fee, range))) return false;
    }
    if (filters.networks.length > 0) {
      const cardNetwork = detectNetwork(card);
      if (!filters.networks.includes(cardNetwork)) return false;
    }
    return true;
  });
}
