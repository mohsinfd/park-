import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Fuel, SlidersHorizontal, MapPin, Briefcase, IndianRupee, CheckCircle2 } from "lucide-react";
import parkPlusLogo from "@/assets/park-plus-logo.png";
import greatCardsLogo from "@/assets/great_card_logo.svg";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import FuelFilters from "@/components/FuelFilters";
import CardList from "@/components/CardList";
import { parseDeepLinkParams, incomeLabel } from "@/lib/parseDeepLinkParams";
import { rankCards, filterCards } from "@/lib/calculator";
import { useEligibleCards } from "@/hooks/useEligibleCards";
import { useIsMobile } from "@/hooks/use-mobile";
import type { RankedCard, FuelFiltersState } from "@/types/card";

// ─── Slim context strip ───────────────────────────────────────────────────────
const ContextStrip = ({
  fuelSpend,
  pincode,
  inhandIncome,
  empStatus,
  cardCount,
  isLoading,
}: {
  fuelSpend: number;
  pincode?: string;
  inhandIncome?: number;
  empStatus?: string;
  cardCount: number;
  isLoading: boolean;
}) => {
  const hasEligibility = Boolean(pincode && inhandIncome);
  const chips = [
    { icon: Fuel, label: `₹${fuelSpend.toLocaleString("en-IN")}/mo fuel` },
    inhandIncome ? { icon: IndianRupee, label: incomeLabel(inhandIncome) } : null,
    empStatus ? { icon: Briefcase, label: empStatus === "salaried" ? "Salaried" : "Self-employed" } : null,
    pincode ? { icon: MapPin, label: pincode } : null,
  ].filter(Boolean) as { icon: React.ElementType; label: string }[];

  return (
    <div className="mb-5 animate-slide-up" style={{ animationDelay: "30ms" }}>
      {/* Chips row */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {chips.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-[12px] font-medium text-foreground whitespace-nowrap shrink-0"
          >
            <Icon className="w-3 h-3 text-primary" />
            {label}
          </div>
        ))}
        {hasEligibility && (
          <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-[12px] font-semibold text-green-600 whitespace-nowrap shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            Eligibility checked
          </div>
        )}
      </div>
      {/* Result count */}
      {!isLoading && (
        <p className="text-[12px] text-muted-foreground mt-2 px-0.5">
          <span className="font-semibold text-foreground">{cardCount} card{cardCount !== 1 ? "s" : ""}</span> matched · ranked by net annual saving
        </p>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const FuelResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FuelFiltersState>({
    feeRanges: [],
    networks: [],
  });

  const deepLinkParams = parseDeepLinkParams(searchParams);

  useEffect(() => {
    if (!deepLinkParams) navigate("/calculator", { replace: true });
  }, [deepLinkParams, navigate]);

  const { data: cards, isLoading, error, refetch } = useEligibleCards(
    deepLinkParams ?? { fuel: 0 }
  );

  const rankedCards: RankedCard[] = cards
    ? rankCards(cards, deepLinkParams?.fuel ?? 0)
    : [];
  const filteredCards = filterCards(rankedCards, filters);
  const activeFilterCount = filters.feeRanges.length + filters.networks.length;
  const clearFilters = () => setFilters({ feeRanges: [], networks: [] });

  if (!deepLinkParams) return null;

  const { fuel, pincode, inhandIncome, empStatus } = deepLinkParams;
  const trackingSource = `park_plus_fuel_${fuel}`;
  const isPersonalized = Boolean(pincode && inhandIncome);

  const filterPanel = (
    <FuelFilters filters={filters} onChange={setFilters} onClear={clearFilters} />
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-md md:max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={parkPlusLogo} alt="Park+" className="h-6 w-auto object-contain" />
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">powered by</span>
              <img
                src={greatCardsLogo}
                alt="great.cards"
                className="h-4 w-auto object-contain"
              />
            </div>
          </div>

          {!isLoading && !error && rankedCards.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setDrawerOpen(true)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          )}
        </div>
        <div className="h-0.5 w-full gradient-park opacity-60" />
      </header>

      <main className="max-w-md md:max-w-2xl mx-auto px-4 pt-5 pb-24">
        {/* Context strip */}
        <ContextStrip
          fuelSpend={fuel}
          pincode={pincode}
          inhandIncome={inhandIncome}
          empStatus={empStatus}
          cardCount={filteredCards.length}
          isLoading={isLoading}
        />

        {/* Cards */}
        <CardList
          cards={filteredCards}
          isLoading={isLoading}
          error={error instanceof Error ? error : error ? new Error("Unknown error") : null}
          source={trackingSource}
          onRetry={refetch}
          onChangeSpend={() => navigate("/calculator")}
          personalized={isPersonalized}
          monthlyFuelSpend={fuel}
        />

        {/* Filter empty state */}
        {!isLoading && !error && filteredCards.length === 0 && rankedCards.length > 0 && (
          <div className="text-center py-16 animate-slide-up">
            <p className="text-muted-foreground mb-3">No cards match your filters.</p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Footer */}
        {!isLoading && !error && filteredCards.length > 0 && (
          <div className="mt-12 flex items-center justify-center gap-2 animate-slide-up" style={{ animationDelay: "500ms" }}>
            <span className="text-[11px] text-muted-foreground">Powered by</span>
            <img src={greatCardsLogo} alt="great.cards" className="h-4 w-auto object-contain opacity-70" />
          </div>
        )}
      </main>

      {/* Filter drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="flex flex-row items-center justify-between">
            <DrawerTitle>Filter Cards</DrawerTitle>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                Clear All
              </button>
            )}
          </DrawerHeader>
          <div className="px-4 pb-2">{filterPanel}</div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button className="w-full gradient-park text-primary-foreground font-semibold">
                Show {filteredCards.length} Card{filteredCards.length !== 1 ? "s" : ""}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default FuelResults;
