import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ExternalLink,
  Fuel,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Gift,
  Zap,
  Sparkles,
} from "lucide-react";
import parkPlusLogo from "@/assets/park-plus-logo.png";
import greatCardsLogo from "@/assets/great_card_logo.svg";
import { useCardDetail } from "@/hooks/useCardDetail";
import { buildTrackingUrl, slugify } from "@/lib/tracking";
import { feeWithGst } from "@/lib/calculator";
import type { FuelCard } from "@/types/card";

// ─── Feature classification ───────────────────────────────────────────────────
// A feature is a FUEL benefit only if it's about fuel-as-spend-category,
// not just because it mentions "fuel points" as a reward currency.
//
// FUEL_SPEND_RE  — the feature is about purchasing fuel / at a fuel station
// NON_FUEL_CTX_RE — the feature is about a different spend category (dining,
//                   other spends, shopping, etc.) — overrides fuel detection
// WELCOME_RE     — first-use / joining bonus

const FUEL_SPEND_RE = /fuel\s*(station|spend|purchase|pump|point.*station|saving)|petrol|diesel|indian.?oil|iocl|bpcl|hpcl|shell|surcharge|valueback.*fuel|fuel.*valueback|\bat\s+(indian|iocl|bpcl|hpcl|hp\s*pay|shell)/i;
const NON_FUEL_CTX_RE = /\b(other\s*spend|non.?fuel|dining|restaurant|shopping|grocery|online\s*spend|offline\s*spend|everyday\s*spend|utility|telecom|bill\s*payment|all\s*(other|non|card)\s*(spend|purchase))/i;
const WELCOME_RE = /welcome|joining\s*(bonus|benefit|gift|reward)|first\s*(use|transact|spend)|sign.?up|activation\s*(bonus|benefit)|bonus\s*(point|reward).*activat|on\s*(card\s*)?activat|on\s*annual\s*fee\s*payment/i;
const SURCHARGE_RE = /surcharge/i;

interface ParsedFeature { header: string; description: string; }

function parseFeature(feat: string): ParsedFeature {
  const sep = feat.indexOf(" — ");
  if (sep !== -1) return { header: feat.slice(0, sep).trim(), description: feat.slice(sep + 3).trim() };
  return { header: feat.trim(), description: "" };
}

function classifyFeatures(features: string[]): {
  welcome: string[];
  fuel: string[];
  other: string[];
} {
  const welcome: string[] = [];
  const fuel: string[] = [];
  const other: string[] = [];
  for (const f of features) {
    if (WELCOME_RE.test(f)) {
      welcome.push(f);
    } else if (FUEL_SPEND_RE.test(f) && !NON_FUEL_CTX_RE.test(f)) {
      // Only fuel if it's about fuel spend, not about earning fuel points on dining/other
      fuel.push(f);
    } else {
      other.push(f);
    }
  }
  return { welcome, fuel, other };
}

// ─── Pump brands from brand_options ──────────────────────────────────────────
const BRAND_LABELS: Record<string, string> = {
  Indian: "Indian Oil", IndianOil: "Indian Oil", IOCL: "Indian Oil",
  BPCL: "BPCL", HP: "HPCL", HPCL: "HPCL", Shell: "Shell",
};

// ─── Loading state ────────────────────────────────────────────────────────────
const DetailLoader = () => (
  <div
    className="fixed inset-0 flex flex-col items-center justify-center gap-4"
    style={{ background: "linear-gradient(160deg, #07070f 0%, #0d0c22 60%, #0f0e28 100%)" }}
  >
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-primary"
            style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
        ))}
      </div>
      <p className="text-white/50 text-[11px] tracking-widest uppercase">Loading card details</p>
    </div>
  </div>
);

// ─── Hero visual ──────────────────────────────────────────────────────────────
const CardHero = ({ card, personalized }: { card: FuelCard; personalized: boolean }) => (
  <div
    className="relative rounded-3xl overflow-hidden mx-4 mb-5"
    style={{ background: card.bg_gradient || "linear-gradient(150deg, #0c0b1e 0%, #14103a 45%, #0d1628 100%)" }}
  >
    <div className="absolute inset-0 pointer-events-none"
      style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.68) 100%)" }} />
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-48 pointer-events-none"
      style={{ background: "radial-gradient(ellipse at center, hsl(243 75% 55% / 0.18) 0%, transparent 70%)" }} />

    <div className="flex items-start justify-between px-5 pt-5 pb-2 relative z-10">
      <div>
        {personalized && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Eligible
          </span>
        )}
      </div>
      {card.card_network && (
        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/70 text-[11px] font-semibold">
          {card.card_network}
        </span>
      )}
    </div>

    <div className="flex justify-center py-5 relative z-10">
      {card.image_url ? (
        <img src={card.image_url} alt={card.card_name}
          className="h-[120px] w-auto object-contain"
          style={{ filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.7))" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <div className="h-[100px] w-[160px] rounded-2xl flex items-center justify-center border border-white/10 bg-white/5">
          <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">Credit Card</span>
        </div>
      )}
    </div>

    <div className="text-center px-5 pb-6 relative z-10">
      <h1 className="text-white font-bold text-[18px] leading-snug">{card.card_name}</h1>
      <p className="text-white/45 text-[13px] mt-0.5">{card.bank}</p>
    </div>
  </div>
);

// ─── Savings strip ────────────────────────────────────────────────────────────
const SavingsStrip = ({ card, monthlyFuelSpend, annualSavingNet }: { card: FuelCard; monthlyFuelSpend: number; annualSavingNet?: number }) => {
  const cashbackPct = monthlyFuelSpend > 0 && card.fuel_savings_monthly > 0
    ? (card.fuel_savings_monthly / monthlyFuelSpend) * 100 : 0;
  const netSaving = annualSavingNet;

  const tiles = [
    ...(netSaving !== undefined ? [{ label: "Net Annual Saving", value: `+₹${Math.round(netSaving).toLocaleString("en-IN")}`, highlight: true }] : []),
    { label: "Monthly Saving", value: `₹${card.monthly_saving.toLocaleString("en-IN")}`, highlight: false },
    ...(cashbackPct > 0 ? [{ label: "% Back on Fuel", value: `${cashbackPct.toFixed(1)}%`, highlight: false }] : []),
  ];

  return (
    <div className={`mx-4 mb-5 grid gap-2 ${tiles.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {tiles.map(({ label, value, highlight }) => (
        <div key={label} className={`rounded-2xl p-3 text-center border ${highlight ? "bg-primary/10 border-primary/20" : "bg-secondary border-border"}`}>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          <p className={`font-extrabold text-[15px] leading-tight tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
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

// ─── Benefit row ──────────────────────────────────────────────────────────────
const BenefitRow = ({
  feat, index, total, iconEl,
}: {
  feat: string; index: number; total: number; iconEl: React.ReactNode;
}) => {
  const { header, description } = parseFeature(feat);
  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 ${index < total - 1 ? "border-b border-border" : ""}`}>
      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        {iconEl}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">{header}</p>
        {description && <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{description}</p>}
      </div>
    </div>
  );
};

// ─── Welcome offer ────────────────────────────────────────────────────────────
const WelcomeOffer = ({ features }: { features: string[] }) => {
  if (features.length === 0) return null;
  return (
    <Section title="Welcome Offer">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
        {features.map((feat, i) => {
          const { header, description } = parseFeature(feat);
          return (
            <div key={i} className={`flex items-start gap-3 px-4 py-3.5 ${i < features.length - 1 ? "border-b border-amber-500/10" : ""}`}>
              <Gift className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground leading-snug">{header}</p>
                {description && <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};

// ─── Fuel Benefits ────────────────────────────────────────────────────────────
// Shows fuel-specific USPs + pump brands + surcharge waiver with its condition
const FuelBenefitsSection = ({
  fuelFeatures,
  brandOptions,
}: {
  fuelFeatures: string[];
  brandOptions: string[];
}) => {
  const [expanded, setExpanded] = useState(false);
  const brands = brandOptions.map((b) => BRAND_LABELS[b] ?? b).filter(Boolean);

  // Separate surcharge waiver features so we can show them distinctly
  const surchargeFeats = fuelFeatures.filter((f) => SURCHARGE_RE.test(f));
  const nonSurchargeFeats = fuelFeatures.filter((f) => !SURCHARGE_RE.test(f));

  if (fuelFeatures.length === 0 && brands.length === 0) return null;

  const LIMIT = 4;
  const shownNonSurcharge = expanded ? nonSurchargeFeats : nonSurchargeFeats.slice(0, LIMIT);
  const hiddenCount = nonSurchargeFeats.length - LIMIT;

  return (
    <Section title="Fuel Benefits">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Pump brands row — only if we have brand data */}
        {brands.length > 0 && (
          <div className={`flex items-center gap-3 px-4 py-3.5 ${(fuelFeatures.length > 0) ? "border-b border-border" : ""}`}>
            <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Fuel className="w-2.5 h-2.5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Accepted at</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{brands.join(" · ")}</p>
            </div>
          </div>
        )}

        {/* Non-surcharge fuel USPs */}
        {shownNonSurcharge.map((feat, i) => (
          <BenefitRow
            key={i}
            feat={feat}
            index={i}
            total={shownNonSurcharge.length + surchargeFeats.length + (brands.length > 0 ? 0 : 0)}
            iconEl={<Fuel className="w-2.5 h-2.5 text-primary" />}
          />
        ))}

        {/* Show more toggle for non-surcharge */}
        {!expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full flex items-center justify-center gap-1 py-3 text-[12px] font-semibold text-primary border-t border-border hover:bg-primary/5 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" /> {hiddenCount} more
          </button>
        )}
        {expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(false)}
            className="w-full flex items-center justify-center gap-1 py-3 text-[12px] font-semibold text-primary border-t border-border hover:bg-primary/5 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" /> Show less
          </button>
        )}

        {/* Surcharge waiver — always shown, green tint, condition text visible */}
        {surchargeFeats.map((feat, i) => {
          const { header, description } = parseFeature(feat);
          return (
            <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-t border-green-500/15 bg-green-500/5">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400 leading-snug">{header}</p>
                {description && <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};

// ─── Other Benefits (non-fuel, non-welcome) ───────────────────────────────────
const OtherBenefits = ({ features }: { features: string[] }) => {
  const [expanded, setExpanded] = useState(false);
  if (features.length === 0) return null;

  const LIMIT = 4;
  const shown = expanded ? features : features.slice(0, LIMIT);

  return (
    <Section title="Other Benefits">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {shown.map((feat, i) => (
          <BenefitRow
            key={i}
            feat={feat}
            index={i}
            total={shown.length}
            iconEl={<Zap className="w-2.5 h-2.5 text-primary" />}
          />
        ))}
        {features.length > LIMIT && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-3 text-[12px] font-semibold text-primary border-t border-border hover:bg-primary/5 transition-colors"
          >
            {expanded
              ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
              : <><ChevronDown className="w-3.5 h-3.5" /> {features.length - LIMIT} more</>}
          </button>
        )}
      </div>
    </Section>
  );
};

// ─── Fee section ──────────────────────────────────────────────────────────────
const FeeSection = ({ card }: { card: FuelCard }) => {
  const joiningFeeGst = feeWithGst(card.joining_fee);
  const annualFeeGst = feeWithGst(card.annual_fee);
  const isLtf = joiningFeeGst === 0 && annualFeeGst === 0;

  // Fee waiver condition from features
  const waiverFeat = card.features.find((f) =>
    /annual\s*fee.*waiv|waiv.*annual\s*fee|fee\s*reversal|spend.*waiv/i.test(f)
  );

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

  return (
    <Section title="Fees">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Joining Fee</p>
            <p className="text-[11px] text-muted-foreground">One-time · year 1 only</p>
          </div>
          {joiningFeeGst === 0 ? (
            <span className="text-green-500 font-bold text-sm">Free</span>
          ) : (
            <div className="text-right">
              <p className="font-bold text-foreground text-sm">₹{joiningFeeGst.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-muted-foreground">incl. 18% GST</p>
            </div>
          )}
        </div>
        <div className={`flex items-center justify-between px-4 py-3.5 ${waiverFeat ? "border-b border-border" : ""}`}>
          <div>
            <p className="text-sm font-medium text-foreground">Annual Fee</p>
            <p className="text-[11px] text-muted-foreground">Recurring from year 2</p>
          </div>
          {annualFeeGst === 0 ? (
            <span className="text-green-500 font-bold text-sm">Free</span>
          ) : (
            <div className="text-right">
              <p className="font-bold text-foreground text-sm">₹{annualFeeGst.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-muted-foreground">incl. 18% GST</p>
            </div>
          )}
        </div>
        {waiverFeat && (
          <div className="flex items-start gap-2 px-4 py-3 bg-green-500/5">
            <Sparkles className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-green-600 dark:text-green-400 leading-snug">
              {parseFeature(waiverFeat).header}
            </p>
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
  annualSavingNet?: number; // carried from /calculate results on the list page
}

const CardDetail = () => {
  const { alias = "" } = useParams<{ alias: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const source = state.source ?? "park_plus_fuel";
  const monthlyFuelSpend = state.monthlyFuelSpend ?? 0;
  const personalized = state.personalized ?? false;
  const annualSavingNet = state.annualSavingNet; // undefined when navigated to directly

  const { data: card, isLoading, error } = useCardDetail(alias);

  if (isLoading) return <DetailLoader />;

  if (error || !card) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-4xl">⛽</div>
        <p className="text-foreground font-semibold text-center">Could not load card details</p>
        <p className="text-muted-foreground text-sm text-center">{error?.message}</p>
        <button onClick={() => navigate(-1)}
          className="mt-2 px-5 py-2.5 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  const applyHref = buildTrackingUrl(card.tracking_url, source, slugify(card.card_name) || alias);
  const joiningFeeGst = feeWithGst(card.joining_fee);
  const annualFeeGst = feeWithGst(card.annual_fee);
  const { welcome, fuel, other } = classifyFeatures(card.features);

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors shrink-0">
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
      <main className="max-w-md mx-auto pt-5 pb-36">
        <CardHero card={card} personalized={personalized} />
        <SavingsStrip card={card} monthlyFuelSpend={monthlyFuelSpend} annualSavingNet={annualSavingNet} />
        <WelcomeOffer features={welcome} />
        <FuelBenefitsSection fuelFeatures={fuel} brandOptions={card.brand_options || []} />
        <OtherBenefits features={other} />
        <FeeSection card={card} />
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
              {joiningFeeGst === 0 ? "No joining fee" : `Joining fee ₹${joiningFeeGst.toLocaleString("en-IN")}`}
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
