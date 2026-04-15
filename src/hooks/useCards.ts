import { useQuery } from "@tanstack/react-query";
import { fetchFuelCards } from "@/services/cardsApi";

export function useCards(monthlyFuelSpend: number = 5000) {
  return useQuery({
    queryKey: ["fuel-cards", monthlyFuelSpend],
    queryFn: () => fetchFuelCards(monthlyFuelSpend),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
