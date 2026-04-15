import { AlertCircle, ExternalLink, Star, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildTrackingUrl, slugify } from "@/lib/tracking";
import CardSkeleton from "@/components/CardSkeleton";
import { useCountUp } from "@/hooks/useCountUp";
import type { RankedCard } from "@/types/card";

// ─── Animated savings ─────────────────────────────────────────────────────────
const SavingsValue = ({ value }: { value: number }) => {
  const animated = useCountUp(Math.abs(value));
  const isPositive = value >= 0;
  return (
    <span className={`text-[28px] leading-none font-extrabold tabular-nums ${isPositive ? "text-primary" : "text-destructive"}`}>
      {isPositive ? "+" : "-"}₹{animated.toLocaleString("en-IN")}
    </span>
  );
};

interface CardListProps {
  cards: RankedCard[];
  isLoading: boolean;
  error: Error | null;
  source: string;
  onRetry?: () => void;
  onChangeSpend?: () => void;
  personalized?: boolean;
}

// ─── Single card — one-fold mobile layout ─────────────────────────────────────
const FuelCardItem = ({
  card,
  index,
  source,
  personalized,
}: {
  card: RankedCard;
  index: number;
  source: string;
  personalized: boolean;
}) => {
  const isBestPick = index === 0;
  const applyHref = buildTrackingUrl(
    card.tracking_url,
    source,
    slugify(card.card_name) || String(card.card_id)
  );

  return (
    <div
      className={`rounded-2xl border bg-card overflow-hidden animate-slide-up ${
        isBestPick
          ? "border-primary shadow-lg ring-1 ring-primary/20"
          : "border-border shadow-sm"
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* ── Image hero — full width, card face centred on gradient bg ── */}
      <div className="relative w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden"
           style={{ height: "160px" }}>

        {/* Subtle radial glow behind card */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />

        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.card_name}
            className="h-[120px] max-w-[85%] object-contain drop-shadow-xl relative z-10"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const fallback = el.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}

        {/* Fallback placeholder — shown if image fails or absent */}
        <div
          className="h-[110px] w-[175px] rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex flex-col items-center justify-center relative z-10 shadow-lg"
          style={{ display: card.image_url ? "none" : "flex" }}
        >
          <span className="text-xs font-bold text-primary/60 tracking-widest uppercase">Credit Card</span>
        </div>

        {/* Badges — overlaid top-left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
          {isBestPick && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shadow-md">
              <Star className="w-2.5 h-2.5" />
              Best Pick
            </span>
          )}
          {personalized && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500 text-white text-[11px] font-semibold shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
              Eligible
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-3 pb-4 space-y-3">

        {/* ── Card name + bank ── */}
        <div>
          <h3 className="font-bold text-foreground text-[15px] leading-snug">{card.card_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{card.bank}</p>
        </div>

        {/* ── Fuel tags — scrollable, never truncated ── */}
        {card.fuel_tags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4">
            {card.fuel_tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/15 text-primary text-[11px] font-medium whitespace-nowrap shrink-0"
              >
                <Fuel className="w-2.5 h-2.5 shrink-0" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Divider ── */}
        <div className="h-px bg-border" />

        {/* ── Savings + cashback rate ── */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Net Annual Saving</p>
            <SavingsValue value={card.annual_saving_net} />
          </div>
          {card.cashback_rate > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground mb-1">Fuel Cashback</p>
              <span className="text-lg font-bold text-foreground">
                {(card.cashback_rate * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* ── Two key stats ── */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-secondary/70 px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">Monthly Saving</p>
            <p className="font-bold text-sm text-primary">
              ₹{card.monthly_saving.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl bg-secondary/70 px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">Annual Fee <span className="text-[9px]">(incl. GST)</span></p>
            <p className="font-bold text-sm text-foreground">
              {card.annual_fee === 0 ? "Free" : `₹${card.annual_fee.toLocaleString("en-IN")}`}
            </p>
          </div>
        </div>

        {/* ── Apply CTA — full width ── */}
        <Button
          asChild
          className="w-full gradient-park text-primary-foreground font-semibold rounded-xl h-12 text-[15px] hover:opacity-90 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 group"
        >
          <a href={applyHref} target="_blank" rel="noopener noreferrer">
            Apply Now
            <ExternalLink className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </Button>
      </div>
    </div>
  );
};

// ─── Card list ────────────────────────────────────────────────────────────────
const CardList = ({
  cards,
  isLoading,
  error,
  source,
  onRetry,
  onChangeSpend,
  personalized = false,
}: CardListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-slide-up" style={{ animationDelay: `${i * 150}ms` }}>
            <CardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-slide-up">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <p className="text-foreground font-medium">Failed to load cards</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">{error.message}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>Try Again</Button>
        )}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-slide-up text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">⛽</div>
        <p className="text-foreground font-medium">No cards found</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {personalized
            ? "We couldn't find eligible cards for your profile."
            : "No cards available at the moment."}
        </p>
        {onChangeSpend && (
          <Button variant="outline" onClick={onChangeSpend} className="mt-2">
            Try a Different Spend
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {cards.map((card, index) => (
          <FuelCardItem
            key={String(card.card_id) + card.card_name}
            card={card}
            index={index}
            source={source}
            personalized={personalized}
          />
        ))}
      </div>

      {onChangeSpend && !personalized && (
        <div className="mt-8 text-center animate-slide-up" style={{ animationDelay: "400ms" }}>
          <Button variant="outline" onClick={onChangeSpend} className="hover:scale-105 transition-transform">
            Change Fuel Spend
          </Button>
        </div>
      )}
    </>
  );
};

export default CardList;
