import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Fuel, SlidersHorizontal, MapPin, Briefcase, IndianRupee, Sparkles } from "lucide-react";
import parkPlusLogoDark from "@/assets/park-plus-logo-dark.svg";
import greatCardsLogoDark from "@/assets/great-cards-logo-dark.svg";
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

// ─── Loading shimmer hero ─────────────────────────────────────────────────────
const LoadingHero = ({ fuelSpend }: { fuelSpend: number }) => (
  <div className="rounded-2xl border border-border bg-card p-5 mb-6 animate-slide-up overflow-hidden relative">
    {/* Shimmer sweep */}
    <div className="absolute inset-0 -translate-x-full animate-shimmer-loading bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl gradient-park flex items-center justify-center shrink-0">
        <Fuel className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Analysing cards for</p>
        <p className="font-bold text-foreground text-lg">
          ₹{fuelSpend.toLocaleString("en-IN")}/mo fuel spend
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <p className="text-sm text-muted-foreground">Finding the best cards for you…</p>
    </div>
  </div>
);

// ─── Personalisation banner ───────────────────────────────────────────────────
const PersonalisationBanner = ({
  fuelSpend,
  pincode,
  inhandIncome,
  empStatus,
  cardCount,
}: {
  fuelSpend: number;
  pincode?: string;
  inhandIncome?: number;
  empStatus?: string;
  cardCount: number;
}) => {
  const hasEligibility = pincode || inhandIncome || empStatus;

  return (
    <div
      className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 mb-5 animate-slide-up"
      style={{ animationDelay: "50ms" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-park flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">Personalised for you</p>
            <p className="text-xs text-muted-foreground">
              {cardCount} card{cardCount !== 1 ? "s" : ""} matched
            </p>
          </div>
        </div>
        {hasEligibility && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 shrink-0">
            Eligibility checked
          </span>
        )}
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-xs font-medium text-foreground">
          <Fuel className="w-3.5 h-3.5 text-primary" />
          ₹{fuelSpend.toLocaleString("en-IN")}/mo fuel
        </div>
        {inhandIncome && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-xs font-medium text-foreground">
            <IndianRupee className="w-3.5 h-3.5 text-primary" />
            {incomeLabel(inhandIncome)}
          </div>
        )}
        {empStatus && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-xs font-medium text-foreground">
            <Briefcase className="w-3.5 h-3.5 text-primary" />
            {empStatus === "salaried" ? "Salaried" : "Self-employed"}
          </div>
        )}
        {pincode && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-xs font-medium text-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            {pincode}
          </div>
        )}
      </div>
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

  // Parse deep-link params from URL
  const deepLinkParams = parseDeepLinkParams(searchParams);

  // If no valid fuel param, redirect to calculator
  useEffect(() => {
    if (!deepLinkParams) {
      navigate("/calculator", { replace: true });
    }
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

  // Don't render anything until we know params are valid
  if (!deepLinkParams) return null;

  const { fuel, pincode, inhandIncome, empStatus } = deepLinkParams;
  const trackingSource = `park_plus_fuel_${fuel}`;

  const filterPanel = (
    <FuelFilters filters={filters} onChange={setFilters} onClear={clearFilters} />
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header — Park Plus branding ─── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-md md:max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={parkPlusLogoDark} alt="Park+" className="h-6 w-auto object-contain" />
            {/* Divider */}
            <div className="w-px h-5 bg-border" />
            {/* powered by great.cards */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">powered by</span>
              <img src={greatCardsLogoDark} alt="great.cards" className="h-4 w-auto object-contain opacity-80" />
            </div>
          </div>

          {/* Filter button — mobile only, shown when cards loaded */}
          {isMobile && !isLoading && !error && rankedCards.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 hover:scale-105 transition-transform shrink-0"
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
        {/* Gradient accent line — identical to Results.tsx */}
        <div className="h-0.5 w-full gradient-park opacity-60" />
      </header>

      <main className="max-w-md md:max-w-5xl mx-auto px-4 pt-5 pb-20">
        {/* Loading hero — replaces the banner while fetching */}
        {isLoading && <LoadingHero fuelSpend={fuel} />}

        {/* Personalisation banner — shown once data loaded */}
        {!isLoading && !error && (
          <PersonalisationBanner
            fuelSpend={fuel}
            pincode={pincode}
            inhandIncome={inhandIncome}
            empStatus={empStatus}
            cardCount={filteredCards.length}
          />
        )}

        {/* Section title row */}
        {!isLoading && (
          <div
            className="flex items-center justify-between mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            <div>
              <h1 className="text-[22px] leading-tight font-extrabold text-foreground mb-0.5">Best Cards for You</h1>
              <p className="text-[13px] text-muted-foreground">
                Ranked by net annual savings on ₹{fuel.toLocaleString("en-IN")}/mo fuel
              </p>
            </div>

            {/* Desktop filter toggle */}
            {!isMobile && !error && rankedCards.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 hover:scale-105 transition-transform"
                onClick={() => setDrawerOpen(!drawerOpen)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Desktop: side-by-side filters + cards */}
        {!isMobile ? (
          <div className="flex gap-6">
            {!isLoading && !error && rankedCards.length > 0 && (
              <div
                className="w-[280px] shrink-0 animate-slide-up"
                style={{ animationDelay: "100ms" }}
              >
                <div className="sticky top-20">{filterPanel}</div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardList
                cards={filteredCards}
                isLoading={isLoading}
                error={error instanceof Error ? error : error ? new Error("Unknown error") : null}
                source={trackingSource}
                onRetry={refetch}
                onChangeSpend={() => navigate("/calculator")}
                personalized={Boolean(pincode && inhandIncome)}
              />
            </div>
          </div>
        ) : (
          <>
            <CardList
              cards={filteredCards}
              isLoading={isLoading}
              error={error instanceof Error ? error : error ? new Error("Unknown error") : null}
              source={trackingSource}
              onRetry={refetch}
              onChangeSpend={() => navigate("/calculator")}
              personalized={Boolean(pincode && inhandIncome)}
            />

            {/* Mobile filter drawer */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerContent>
                <DrawerHeader className="flex flex-row items-center justify-between">
                  <DrawerTitle>Filter Cards</DrawerTitle>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-primary hover:underline"
                    >
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
          </>
        )}

        {/* Active filters → no results nudge */}
        {!isLoading && !error && filteredCards.length === 0 && rankedCards.length > 0 && (
          <div className="text-center py-16 animate-slide-up">
            <p className="text-muted-foreground mb-3">No cards match your current filters.</p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Footer trust line */}
        {!isLoading && !error && filteredCards.length > 0 && (
          <div
            className="mt-10 text-center animate-slide-up"
            style={{ animationDelay: "500ms" }}
          >
            <p className="text-xs text-muted-foreground">
              Powered by{" "}
              <span className="text-gradient-park font-semibold">great.cards</span> •
              All card data is real-time and personalised
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default FuelResults;
