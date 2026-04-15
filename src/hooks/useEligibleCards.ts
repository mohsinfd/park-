import { useQuery } from "@tanstack/react-query";
import { fetchEligibleFuelCards } from "@/services/cardsApi";
import type { DeepLinkParams } from "@/types/card";

export function useEligibleCards(params: DeepLinkParams) {
  return useQuery({
    queryKey: [
      "eligible-fuel-cards",
      params.fuel,
      params.pincode ?? "",
      params.inhandIncome ?? 0,
      params.empStatus ?? "",
    ],
    queryFn: () => fetchEligibleFuelCards(params),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: params.fuel > 0,
  });
}
