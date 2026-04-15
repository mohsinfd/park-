import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Fuel, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCards } from "@/hooks/useCards";
import { rankCards, filterCards } from "@/lib/calculator";
import FuelFilters from "@/components/FuelFilters";
import CardList from "@/components/CardList";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { RankedCard, FuelFiltersState } from "@/types/card";

const Results = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const monthlySpend = Number(searchParams.get("spend")) || 5000;
  const source = searchParams.get("source") || "fuel_calculator";
  const { data: cards, isLoading, error, refetch } = useCards(monthlySpend);
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [filters, setFilters] = useState<FuelFiltersState>({
    feeRanges: [],
    networks: [],
  });

  const clearFilters = () => setFilters({ feeRanges: [], networks: [] });

  const rankedCards: RankedCard[] = cards ? rankCards(cards, monthlySpend) : [];
  const filteredCards = filterCards(rankedCards, filters);
  const activeFilterCount = filters.feeRanges.length + filters.networks.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/calculator")}
            className="text-muted-foreground hover:text-foreground transition-colors hover:scale-110 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-park flex items-center justify-center">
              <Fuel className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Park+ Fuel Finder</span>
          </div>
        </div>
        {/* Gradient accent line */}
        <div className="h-0.5 w-full gradient-park opacity-60" />
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-8 pb-20">
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Best Cards for You</h1>
            <p className="text-muted-foreground">
              Based on ₹{monthlySpend.toLocaleString("en-IN")}/month fuel spend
            </p>
          </div>

          {isMobile && !isLoading && !error && rankedCards.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 hover:scale-105 transition-transform"
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

        {!isMobile ? (
          <div className="flex gap-6">
            {!isLoading && !error && rankedCards.length > 0 && (
              <div
                className="w-[280px] shrink-0 animate-slide-up"
                style={{ animationDelay: "100ms" }}
              >
                <div className="sticky top-20">
                  <FuelFilters filters={filters} onChange={setFilters} onClear={clearFilters} />
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardList
                cards={filteredCards}
                isLoading={isLoading}
                error={error instanceof Error ? error : error ? new Error("Unknown error") : null}
                source={source}
                onRetry={refetch}
                onChangeSpend={() => navigate("/calculator")}
              />
            </div>
          </div>
        ) : (
          <>
            <CardList
              cards={filteredCards}
              isLoading={isLoading}
              error={error instanceof Error ? error : error ? new Error("Unknown error") : null}
              source={source}
              onRetry={refetch}
              onChangeSpend={() => navigate("/calculator")}
            />

            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerContent>
                <DrawerHeader className="flex flex-row items-center justify-between">
                  <DrawerTitle>Filters</DrawerTitle>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </DrawerHeader>
                <div className="px-4 pb-2">
                  <FuelFilters filters={filters} onChange={setFilters} />
                </div>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button className="w-full gradient-park text-primary-foreground font-semibold">
                      Apply Filters
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </>
        )}

        {!isLoading && !error && filteredCards.length === 0 && rankedCards.length > 0 && (
          <div className="text-center py-20 text-muted-foreground animate-slide-up">
            No cards match your filters. Try adjusting the fee range or network.
          </div>
        )}
      </main>
    </div>
  );
};

export default Results;
