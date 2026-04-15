import React from "react";
import { AlertCircle, ExternalLink, Star, Fuel, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildTrackingUrl, slugify } from "@/lib/tracking";
import { useCountUp } from "@/hooks/useCountUp";
import type { RankedCard } from "@/types/card";

// ─── Animated count-up ────────────────────────────────────────────────────────
const CountUp = ({
  value,
  className,
  style,
}: {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const animated = useCountUp(Math.abs(value));
  return (
    <span className={className} style={style}>
      {value >= 0 ? "+" : "-"}₹{animated.toLocaleString("en-IN")}
    </span>
  );
};

// ─── #1 Hero card — cinematic dark treatment ──────────────────────────────────
const HeroCard = ({
  card,
  source,
  personalized,
}: {
  card: RankedCard;
  source: string;
  personalized: boolean;
}) => {
  const applyHref = buildTrackingUrl(
    card.tracking_url,
    source,
    slugify(card.card_name) || String(card.card_id)
  );

  return (
    <div
      className="relative rounded-3xl overflow-hidden mb-5 animate-slide-up"
      style={{
        background: "linear-gradient(150deg, #0c0b1e 0%, #14103a 45%, #0d1628 100%)",
        animationDelay: "0ms",
      }}
    >
      {/* Glow behind card image */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-56 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(243 75% 55% / 0.22) 0%, transparent 70%)",
        }}
      />

      {/* Top row: badges + cashback */}
      <div className="flex items-start justify-between px-5 pt-5 pb-2 relative z-10">
        <div className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/25 text-amber-300 text-[11px] font-bold tracking-wide w-fit">
            <Star className="w-3 h-3 fill-amber-300" />
            #1 BEST PICK
          </span>
          {personalized && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-[11px] font-semibold w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Eligible
            </span>
          )}
        </div>
        {card.cashback_rate > 0 && (
          <div className="text-right">
            <p className="text-white/35 text-[9px] uppercase tracking-widest mb-0.5">
              Fuel cashback
            </p>
            <p className="text-white font-extrabold text-2xl leading-none">
              {(card.cashback_rate * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Card image — floating */}
      <div className="flex justify-center py-4 relative z-10">
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.card_name}
            className="h-[116px] w-auto object-contain"
            style={{ filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.7))" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="h-[100px] w-[160px] rounded-2xl flex items-center justify-center border border-white/10 bg-white/5">
            <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">
              Credit Card
            </span>
          </div>
        )}
      </div>

      {/* Card name + bank */}
      <div className="text-center px-5 pb-4 relative z-10">
        <h2 className="text-white font-bold text-[17px] leading-snug">{card.card_name}</h2>
        <p className="text-white/45 text-[12px] mt-0.5">{card.bank}</p>
      </div>

      {/* Fuel tags — horizontal scroll */}
      {card.fuel_tags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-5 pb-4 relative z-10">
          {card.fuel_tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-white/55 text-[11px] whitespace-nowrap shrink-0"
            >
              <Fuel className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Separator */}
      <div className="mx-5 h-px bg-white/8 mb-5" />

      {/* Savings + fee */}
      <div className="flex items-end justify-between px-5 mb-4 relative z-10">
        <div>
          <p className="text-white/35 text-[10px] uppercase tracking-widest mb-1">
            Net Annual Saving
          </p>
          <CountUp
            value={card.annual_saving_net}
            className="text-[38px] leading-none font-extrabold tabular-nums"
            style={{ color: "hsl(243,75%,70%)" } as React.CSSProperties}
          />
        </div>
        <div className="text-right">
          <p className="text-white/35 text-[10px] uppercase tracking-widest mb-1">Annual Fee</p>
          <p className="font-bold text-[15px] text-white">
            {card.annual_fee === 0 ? (
              <span className="text-green-400">Free</span>
            ) : (
              `₹${card.annual_fee.toLocaleString("en-IN")}`
            )}
          </p>
          {card.annual_fee > 0 && (
            <p className="text-white/25 text-[9px]">incl. GST</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 px-5 mb-5 relative z-10">
        <div className="rounded-2xl bg-white/6 border border-white/8 px-3 py-2.5 text-center">
          <p className="text-white/35 text-[9px] uppercase tracking-wider mb-0.5">Monthly Saving</p>
          <p className="text-white font-bold text-[14px]">
            ₹{card.monthly_saving.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-2xl bg-white/6 border border-white/8 px-3 py-2.5 text-center">
          <p className="text-white/35 text-[9px] uppercase tracking-wider mb-0.5">Network</p>
          <p className="text-white font-bold text-[14px]">{card.card_network || "—"}</p>
        </div>
      </div>

      {/* Apply CTA */}
      <div className="px-5 pb-6 relative z-10">
        <a
          href={applyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-2xl font-bold text-[16px] text-white transition-all duration-200 active:scale-[0.97] group"
          style={{
            height: "54px",
            background: "linear-gradient(135deg, hsl(243,75%,58%) 0%, hsl(243,75%,46%) 100%)",
            boxShadow: "0 8px 32px hsl(243 75% 45% / 0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          Apply Now
          <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
};

// ─── Savings context bar ──────────────────────────────────────────────────────
const SavingsBar = ({
  annualSaving,
  monthlyFuelSpend,
}: {
  annualSaving: number;
  monthlyFuelSpend: number;
}) => {
  const annualFuel = monthlyFuelSpend * 12;
  const pct = annualFuel > 0 ? Math.min(100, Math.round((annualSaving / annualFuel) * 100)) : 0;
  if (pct <= 0 || monthlyFuelSpend <= 0) return null;

  return (
    <div className="mb-7 animate-slide-up" style={{ animationDelay: "60ms" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="text-[12px] font-semibold text-foreground">Your savings potential</span>
        </div>
        <span className="text-[12px] font-bold text-primary">{pct}% of fuel spend</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full gradient-park"
          style={{ width: `${pct}%`, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s" }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">
        Best card saves{" "}
        <span className="font-semibold text-foreground">
          ₹{annualSaving.toLocaleString("en-IN")}/yr
        </span>{" "}
        on ₹{annualFuel.toLocaleString("en-IN")}/yr fuel
      </p>
    </div>
  );
};

// ─── Runner-up card (horizontal strip, cards #2–4) ────────────────────────────
const RunnerUpCard = ({
  card,
  rank,
  source,
  delay,
}: {
  card: RankedCard;
  rank: number;
  source: string;
  delay: number;
}) => {
  const applyHref = buildTrackingUrl(
    card.tracking_url,
    source,
    slugify(card.card_name) || String(card.card_id)
  );

  return (
    <div
      className="shrink-0 w-[168px] rounded-2xl border border-border bg-card overflow-hidden flex flex-col animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Image */}
      <div className="h-[86px] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.card_name}
            className="h-[64px] w-auto object-contain relative z-10"
            style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">Card</span>
        )}
        <span className="absolute top-2 left-2 text-[10px] font-bold text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center z-20">
          #{rank}
        </span>
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="text-foreground font-bold text-[12px] leading-snug line-clamp-2 mb-0.5">
          {card.card_name}
        </p>
        <p className="text-muted-foreground text-[10px] mb-3">{card.bank}</p>

        <div className="mt-auto space-y-2">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Annual Saving</p>
            <p className="text-primary font-extrabold text-[16px] leading-tight">
              +₹{card.annual_saving_net.toLocaleString("en-IN")}
            </p>
          </div>
          {card.cashback_rate > 0 && (
            <p className="text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">
                {(card.cashback_rate * 100).toFixed(1)}%
              </span>{" "}
              fuel cashback
            </p>
          )}
          <a
            href={applyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 w-full py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 active:scale-95 transition-all"
          >
            Apply <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

// ─── Compact row (cards #5+) ──────────────────────────────────────────────────
const CompactRow = ({
  card,
  rank,
  source,
  delay,
  isLast,
}: {
  card: RankedCard;
  rank: number;
  source: string;
  delay: number;
  isLast: boolean;
}) => {
  const applyHref = buildTrackingUrl(
    card.tracking_url,
    source,
    slugify(card.card_name) || String(card.card_id)
  );

  return (
    <a
      href={applyHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 py-3.5 group animate-slide-up ${!isLast ? "border-b border-border" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Rank */}
      <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-[12px] font-bold text-muted-foreground">
        {rank}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-[13px] font-semibold leading-tight truncate">
          {card.card_name}
        </p>
        <p className="text-muted-foreground text-[11px]">{card.bank}</p>
      </div>

      {/* Saving + arrow */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="text-right">
          <p className="text-primary font-bold text-[13px]">
            +₹{card.annual_saving_net >= 1000
              ? `${(card.annual_saving_net / 1000).toFixed(1)}k`
              : card.annual_saving_net.toLocaleString("en-IN")}
          </p>
          <p className="text-muted-foreground text-[9px] uppercase tracking-wide">per year</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </a>
  );
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-5">
    {/* Hero skeleton */}
    <div className="rounded-3xl bg-secondary h-[460px]" />
    {/* Bar skeleton */}
    <div className="space-y-2">
      <div className="h-3 bg-secondary rounded-full w-3/4" />
      <div className="h-2 bg-secondary rounded-full" />
    </div>
    {/* Runner-up skeletons */}
    <div>
      <div className="h-3 bg-secondary rounded w-20 mb-3" />
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shrink-0 w-[168px] h-[220px] rounded-2xl bg-secondary" />
        ))}
      </div>
    </div>
    {/* Compact row skeletons */}
    <div className="rounded-2xl bg-secondary h-32" />
  </div>
);

// ─── Main CardList ────────────────────────────────────────────────────────────
interface CardListProps {
  cards: RankedCard[];
  isLoading: boolean;
  error: Error | null;
  source: string;
  onRetry?: () => void;
  onChangeSpend?: () => void;
  personalized?: boolean;
  monthlyFuelSpend?: number;
}

const CardList = ({
  cards,
  isLoading,
  error,
  source,
  onRetry,
  onChangeSpend,
  personalized = false,
  monthlyFuelSpend = 0,
}: CardListProps) => {
  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-slide-up">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <p className="text-foreground font-medium">Failed to load cards</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">{error.message}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-slide-up text-center">
        <div className="text-4xl">⛽</div>
        <p className="text-foreground font-medium">No cards found</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {personalized
            ? "No eligible cards matched your profile."
            : "No cards available right now."}
        </p>
        {onChangeSpend && (
          <Button variant="outline" onClick={onChangeSpend} className="mt-2">
            Try a Different Spend
          </Button>
        )}
      </div>
    );
  }

  const [hero, ...rest] = cards;
  const runnerUps = rest.slice(0, 3);
  const remaining = rest.slice(3);

  return (
    <div>
      {/* #1 — Cinematic hero card */}
      <HeroCard card={hero} source={source} personalized={personalized} />

      {/* Savings context bar */}
      <SavingsBar annualSaving={hero.annual_saving_net} monthlyFuelSpend={monthlyFuelSpend} />

      {/* #2–4 — Runner-ups horizontal scroll */}
      {runnerUps.length > 0 && (
        <div className="mb-7 animate-slide-up" style={{ animationDelay: "120ms" }}>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-0.5">
            Runner-ups
          </p>
          <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
            {runnerUps.map((card, i) => (
              <RunnerUpCard
                key={String(card.card_id) + card.card_name}
                card={card}
                rank={i + 2}
                source={source}
                delay={140 + i * 60}
              />
            ))}
          </div>
        </div>
      )}

      {/* #5+ — Compact list rows */}
      {remaining.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: "280ms" }}>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-0.5">
            More options
          </p>
          <div className="rounded-2xl border border-border bg-card px-4">
            {remaining.map((card, i) => (
              <CompactRow
                key={String(card.card_id) + card.card_name}
                card={card}
                rank={i + 5}
                source={source}
                delay={300 + i * 40}
                isLast={i === remaining.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {onChangeSpend && !personalized && (
        <div className="mt-8 text-center animate-slide-up" style={{ animationDelay: "400ms" }}>
          <Button
            variant="outline"
            onClick={onChangeSpend}
            className="hover:scale-105 transition-transform"
          >
            Change Fuel Spend
          </Button>
        </div>
      )}
    </div>
  );
};

export default CardList;
