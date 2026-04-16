import { useQuery } from "@tanstack/react-query";
import { fetchCardDetail } from "@/services/cardsApi";
import type { FuelCard } from "@/types/card";

export function useCardDetail(alias: string) {
  return useQuery<FuelCard, Error>({
    queryKey: ["card-detail", alias],
    queryFn: () => fetchCardDetail(alias),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: Boolean(alias),
  });
}
