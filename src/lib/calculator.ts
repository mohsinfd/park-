import type { FuelCard, RankedCard, FuelFiltersState } from "@/types/card";

const FUEL_KEYWORDS = [
  { pattern: /fuel/i, tag: "Fuel Cashback" },
  { pattern: /surcharge\s*waiver/i, tag: "Fuel Surcharge Waiver" },
  { pattern: /\b(BPCL|IndianOil|IOCL|HP|HPCL)\b/i, tag: "Petrol Benefits" },
  { pattern: /\bpetrol\b/i, tag: "Petrol Benefits" },
  { pattern: /\bdiesel\b/i, tag: "Diesel Benefits" },
];

export function extractFuelTags(card: FuelCard): string[] {
  const tags = new Set<string>();
  for (const feature of card.features) {
    for (const { pattern, tag } of FUEL_KEYWORDS) {
      if (pattern.test(feature)) tags.add(tag);
    }
  }
  for (const t of card.tags) {
    if (/fuel/i.test(t)) tags.add("Fuel Cashback");
  }
  // Add brand-specific tags — normalise short API brand names to full names
  const BRAND_LABELS: Record<string, string> = {
    Indian: "Indian Oil",
    BPCL: "BPCL",
    HP: "HPCL",
    HPCL: "HPCL",
    Shell: "Shell",
  };
  for (const brand of card.brand_options || []) {
    if (brand) {
      const label = BRAND_LABELS[brand] ?? brand;
      tags.add(`${label} Benefits`);
    }
  }
  return Array.from(tags);
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
      const annualSavingNet = card.annual_saving - feeIncGst;
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
