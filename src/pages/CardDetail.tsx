import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ExternalLink,
  Star,
  Fuel,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sofa,
} from "lucide-react";
import parkPlusLogo from "@/assets/park-plus-logo.png";
import greatCardsLogo from "@/assets/great_card_logo.svg";
import { useCardDetail } from "@/hooks/useCardDetail";
import { buildTrackingUrl, slugify } from "@/lib/tracking";
import { extractFuelTags, feeWithGst } from "@/lib/calculator";
import type { FuelCard } from "@/types/card";

// ─── Loading state ────────────────────────────────────────────────────────────
const DetailLoader = () => (
  <div
    className="fixed inset-0 flex flex-col items-center justify-center gap-4"
    style={{ background: "linear-gradient(160deg, #07070f 0%, #0d0c22 60%, #0f0e28 100%)" }}
  >
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }}
          />
        ))}
      </div>
      <p className="text-white/50 text-[11px] tracking-widest uppercase">Loading card details</p>
    </div>
  </div>
);

// ─── Hero visual (matches CardList HeroCard treatment) ────────────────────────
const CardHero = ({
  card,
  personalized,
}: {
  card: FuelCard;
  personalized: boolean;
}) => {
  const network = card.card_network || "Visa";

  return (
    <div
      className="relative rounded-3xl overflow-hidden mx-4 mb-5"
      style={{
        background: card.bg_gradient
          ? card.bg_gradient
          : "linear-gradient(150deg, #0c0b1e 0%, #14103a 45%, #0d1628 100%)",
      }}
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.70) 100%)" }}
      />
      {/* Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-48 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, hsl(243 75% 55% / 0.18) 0%, transparent 70%)" }}
      />

      {/* Top badges */}
      <div className="flex items-start justify-between px-5 pt-5 pb-2 relative z-10">
        <div className="flex flex-col gap-1.5">
          {personalized && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-[11px] font-semibold w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Eligible
            </span>
          )}
        </div>
        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/70 text-[11px] font-semibold">
          {network}
        </span>
      </div>

      {/* Card image */}
      <div className="flex justify-center py-5 relative z-10">
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.card_name}
            className="h-[120px] w-auto object-contain"
            style={{ filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.7))" }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="h-[100px] w-[160px] rounded-2xl flex items-center justify-center border border-white/10 bg-white/5">
            <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">Credit Card</span>
          </div>
        )}
      </div>

      {/* Name + bank */}
      <div className="text-center px-5 pb-6 relative z-10">
        <h1 className="text-white font-bold text-[18px] leading-snug">{card.card_name}</h1>
        <p className="text-white/45 text-[13px] mt-0.5">{card.bank}</p>
      </div>
    </div>
  );
};

// ─── Savings strip ────────────────────────────────────────────────────────────
const SavingsStrip = ({
  card,
  monthlyFuelSpend,
}: {
  card: FuelCard;
  monthlyFuelSpend: number;
}) => {
  const cashbackRate = monthlyFuelSpend > 0 && card.fuel_savings_monthly > 0
    ? (card.fuel_savings_monthly / monthlyFuelSpend) * 100
    : 0;
  const netSaving = card.roi > 0 ? card.roi : card.annual_saving - feeWithGst(card.annual_fee);

  const tiles = [
    { label: "Net Annual Saving", value: `+₹${netSaving.toLocaleString("en-IN")}`, highlight: true },
    { label: "Monthly Saving", value: `₹${card.monthly_saving.toLocaleString("en-IN")}`, highlight: false },
    ...(cashbackRate > 0
      ? [{ label: "Fuel Cashback", value: `${cashbackRate.toFixed(1)}%`, highlight: false }]
      : []),
  ];

  return (
    <div className="mx-4 mb-5 grid grid-cols-3 gap-2">
      {tiles.map(({ label, value, highlight }) => (
        <div
          key={label}
          className={`rounded-2xl p-3 text-center border ${
            highlight
              ? "bg-primary/10 border-primary/20"
              : "bg-secondary border-border"
          }`}
        >
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          <p className={`font-extrabold text-[15px] leading-tight tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mx-4 mb-5">
    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{title}</p>
    {children}
  </div>
);

// ─── Fee section ──────────────────────────────────────────────────────────────
const FeeSection = ({ card }: { card: FuelCard }) => {
  const joiningFeeGst = feeWithGst(card.joining_fee);
  const annualFeeGst = feeWithGst(card.annual_fee);
  const isLtf = joiningFeeGst === 0 && annualFeeGst === 0;

  if (isLtf) {
    return (
      <Section title="Fees">
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          <span className="text-green-600 font-semibold text-sm">Lifetime Free — No joining or annual fee</span>
        </div>
      </Section>
    );
  }

  const FeeRow = ({ label, amount, sub }: { label: string; amount: number; sub: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
      {amount === 0 ? (
        <span className="text-green-500 font-bold text-sm">Free</span>
      ) : (
        <div className="text-right">
          <p className="font-bold text-foreground text-sm">₹{amount.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-muted-foreground">incl. 18% GST</p>
        </div>
      )}
    </div>
  );

  return (
    <Section title="Fees">
      <div className="rounded-2xl border border-border bg-card px-4">
        <FeeRow label="Joining Fee" amount={joiningFeeGst} sub="One-time, year 1 only" />
        <FeeRow label="Annual Fee" amount={annualFeeGst} sub="Recurring from year 2" />
      </div>
    </Section>
  );
};

// ─── Fuel benefits ────────────────────────────────────────────────────────────
const FuelBenefits = ({ card }: { card: FuelCard }) => {
  const fuelTags = extractFuelTags(card);
  if (fuelTags.length === 0 && (!card.brand_options || card.brand_options.length === 0)) return null;

  return (
    <Section title="Fuel Benefits">
      <div className="flex flex-wrap gap-2">
        {card.brand_options?.map((brand) => (
          <span
            key={brand}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[12px] font-semibold"
          >
            <Fuel className="w-3 h-3" />
            {brand}
          </span>
        ))}
        {fuelTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-foreground text-[12px] font-medium"
          >
            {tag}
          </span>
        ))}
      </div>
    </Section>
  );
};

// ─── Key features ─────────────────────────────────────────────────────────────
const KeyFeatures = ({ features }: { features: string[] }) => {
  const [expanded, setExpanded] = useState(false);
  if (features.length === 0) return null;
  const shown = expanded ? features : features.slice(0, 6);

  return (
    <Section title="Key Features">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {shown.map((feat, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 px-4 py-3 ${i < shown.length - 1 ? "border-b border-border" : ""}`}
          >
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-snug">{feat}</p>
          </div>
        ))}
        {features.length > 6 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-3 text-[12px] font-semibold text-primary border-t border-border hover:bg-primary/5 transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> Show {features.length - 6} more</>
            )}
          </button>
        )}
      </div>
    </Section>
  );
};

// ─── Other perks ──────────────────────────────────────────────────────────────
const OtherPerks = ({ card }: { card: FuelCard }) => {
  const hasLounges = card.lounges > 0;
  const hasRating = card.rating > 0;
  if (!hasLounges && !hasRating) return null;

  return (
    <Section title="Other Perks">
      <div className="grid grid-cols-2 gap-2">
        {hasLounges && (
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <Sofa className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="font-bold text-foreground text-[18px] leading-none">{card.lounges}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Lounge visits / quarter</p>
          </div>
        )}
        {hasRating && (
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <Star className="w-5 h-5 text-amber-400 mx-auto mb-1 fill-amber-400" />
            <p className="font-bold text-foreground text-[18px] leading-none">{card.rating.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Card rating</p>
          </div>
        )}
      </div>
    </Section>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
interface LocationState {
  source?: string;
  monthlyFuelSpend?: number;
  personalized?: boolean;
}

const CardDetail = () => {
  const { alias = "" } = useParams<{ alias: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const source = state.source ?? "park_plus_fuel";
  const monthlyFuelSpend = state.monthlyFuelSpend ?? 0;
  const personalized = state.personalized ?? false;

  const { data: card, isLoading, error } = useCardDetail(alias);

  if (isLoading) return <DetailLoader />;

  if (error || !card) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-4xl">⛽</div>
        <p className="text-foreground font-semibold text-center">Could not load card details</p>
        <p className="text-muted-foreground text-sm text-center">{error?.message}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 px-5 py-2.5 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const applyHref = buildTrackingUrl(card.tracking_url, source, slugify(card.card_name) || alias);
  const joiningFeeGst = feeWithGst(card.joining_fee);
  const annualFeeGst = feeWithGst(card.annual_fee);

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <img src={parkPlusLogo} alt="Park+" className="h-6 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">powered by</span>
            <img src={greatCardsLogo} alt="great.cards" className="h-4 w-auto object-contain" />
          </div>
        </div>
        <div className="h-0.5 w-full gradient-park opacity-60" />
      </header>

      {/* ─── Content ─── */}
      <main className="max-w-md mx-auto pt-5 pb-32">
        <CardHero card={card} personalized={personalized} />
        <SavingsStrip card={card} monthlyFuelSpend={monthlyFuelSpend} />
        <FeeSection card={card} />
        <FuelBenefits card={card} />
        <KeyFeatures features={card.features} />
        <OtherPerks card={card} />
      </main>

      {/* ─── Sticky Apply Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-md mx-auto px-4 pt-3 pb-5">
          <a
            href={applyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-2xl font-bold text-[16px] text-white transition-all duration-200 active:scale-[0.97]"
            style={{
              height: "54px",
              background: "linear-gradient(135deg, hsl(243,75%,58%) 0%, hsl(243,75%,46%) 100%)",
              boxShadow: "0 8px 32px hsl(243 75% 45% / 0.40), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            Apply Now
            <ExternalLink className="w-4 h-4" />
          </a>
          {(joiningFeeGst > 0 || annualFeeGst > 0) && (
            <p className="text-center text-[11px] text-muted-foreground mt-2">
              {joiningFeeGst === 0
                ? "No joining fee"
                : `Joining fee ₹${joiningFeeGst.toLocaleString("en-IN")}`}
              {annualFeeGst > 0 && joiningFeeGst > 0 && " · "}
              {annualFeeGst > 0 && `₹${annualFeeGst.toLocaleString("en-IN")}/yr from year 2`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardDetail;
