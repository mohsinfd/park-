import type { DeepLinkParams } from "@/types/card";

/**
 * Parses URL search params from a Park Plus deep-link redirect into DeepLinkParams.
 *
 * Expected URL shape:
 *   /fuel?fuel=8000&pincode=110001&inhandIncome=50000&empStatus=salaried
 *
 * Returns null if `fuel` is missing or invalid (triggers fallback flow).
 */
export function parseDeepLinkParams(params: URLSearchParams): DeepLinkParams | null {
  const rawFuel = params.get("fuel");
  const fuel = rawFuel !== null ? Number(rawFuel) : NaN;

  // fuel is required and must be a positive number
  if (isNaN(fuel) || fuel <= 0) return null;

  const rawPincode = params.get("pincode") ?? "";
  const pincode = /^\d{6}$/.test(rawPincode) ? rawPincode : undefined;

  const rawIncome = params.get("inhandIncome");
  const inhandIncome =
    rawIncome !== null && !isNaN(Number(rawIncome)) && Number(rawIncome) > 0
      ? Number(rawIncome)
      : undefined;

  const rawEmpStatus = params.get("empStatus");
  const empStatus =
    rawEmpStatus === "salaried" || rawEmpStatus === "self-employed"
      ? rawEmpStatus
      : undefined;

  return { fuel, pincode, inhandIncome, empStatus };
}

/** Returns a human-readable income range label for display */
export function incomeLabel(inhandIncome?: number): string {
  if (!inhandIncome) return "";
  if (inhandIncome >= 100000) return "₹1L+/mo";
  if (inhandIncome >= 50000) return "₹50K+/mo";
  if (inhandIncome >= 25000) return "₹25K+/mo";
  return `₹${Math.round(inhandIncome / 1000)}K/mo`;
}
