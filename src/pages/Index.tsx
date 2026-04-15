import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Car,
  FileText,
  Landmark,
  ShoppingCart,
  ShieldCheck,
  Grid2X2,
  Search,
  User,
  Home,
  Heart,
  IndianRupee,
  Users,
  Plus,
  Fuel,
  X,
  ChevronRight,
  CheckCircle2,
  CircleDashed,
  FlaskConical,
} from "lucide-react";
import challanBanner from "@/assets/challan-banner.svg";
import greatCardsLogoWhite from "@/assets/great-cards-logo-white.svg";

// ─── Test Scenarios ───────────────────────────────────────────────────────────

interface Scenario {
  id: string;
  label: string;
  description: string;
  badge: string;
  badgeColor: string;
  params: Record<string, string | number> | null; // null = no-param fallback flow
}

const SCENARIOS: Scenario[] = [
  {
    id: "micro",
    label: "Micro Spender — ₹2K/mo",
    description: "₹2,000/mo fuel · ₹20K income · salaried",
    badge: "₹2K",
    badgeColor: "bg-green-500/10 text-green-600",
    params: { fuel: 2000, pincode: "302001", inhandIncome: 20000, empStatus: "salaried" },
  },
  {
    id: "light",
    label: "Light Spender — ₹4K/mo",
    description: "₹4,000/mo fuel · ₹30K income · salaried",
    badge: "₹4K",
    badgeColor: "bg-teal-500/10 text-teal-600",
    params: { fuel: 4000, pincode: "400001", inhandIncome: 30000, empStatus: "salaried" },
  },
  {
    id: "full",
    label: "Standard — ₹8K/mo Salaried",
    description: "₹8,000/mo fuel · ₹50K income · 110001 pincode",
    badge: "₹8K",
    badgeColor: "bg-primary/10 text-primary",
    params: { fuel: 8000, pincode: "110001", inhandIncome: 50000, empStatus: "salaried" },
  },
  {
    id: "self-employed",
    label: "Self-Employed — ₹12K/mo",
    description: "₹12,000/mo fuel · ₹80K income · 400001 pincode",
    badge: "₹12K",
    badgeColor: "bg-primary/10 text-primary",
    params: { fuel: 12000, pincode: "400001", inhandIncome: 80000, empStatus: "self-employed" },
  },
  {
    id: "high-spender",
    label: "High Spender — ₹20K/mo",
    description: "₹20,000/mo fuel · ₹1.5L income · Bengaluru",
    badge: "₹20K",
    badgeColor: "bg-purple-500/10 text-purple-600",
    params: { fuel: 20000, pincode: "560001", inhandIncome: 150000, empStatus: "salaried" },
  },
  {
    id: "fuel-only-5k",
    label: "Fuel Only — ₹5K (no eligibility)",
    description: "₹5,000/mo fuel · no income or pincode data",
    badge: "No eligibility",
    badgeColor: "bg-amber-500/10 text-amber-600",
    params: { fuel: 5000 },
  },
  {
    id: "no-params",
    label: "No Params — Fallback Flow",
    description: "No URL params → redirects to calculator form",
    badge: "Fallback",
    badgeColor: "bg-destructive/10 text-destructive",
    params: null,
  },
];

function buildFuelUrl(params: Record<string, string | number> | null): string {
  if (!params) return "/calculator";
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  return `/fuel?${qs}`;
}

// ─── Fuel Gauge Splash ───────────────────────────────────────────────────────
// Arc: M 22 100 A 78 78 0 0 0 178 100  (CCW, top semicircle, centre 100,100 r=78)
// Arc length ≈ π × 78 = 245

const GAUGE_TICKS = Array.from({ length: 11 }, (_, i) => ({
  angle: -75 + i * 15,
  major: i % 5 === 0,
}));

const FuelGaugeSplash = ({ targetUrl }: { targetUrl: string }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
       style={{ background: "linear-gradient(160deg, #07070f 0%, #0d0c22 60%, #0f0e28 100%)" }}>

    {/* Background radial glow */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-72 h-72 rounded-full blur-[90px]"
           style={{ background: "radial-gradient(circle, hsl(243 75% 45% / 0.18) 0%, transparent 70%)" }} />
    </div>

    {/* Subtle speed lines — perspective road feel */}
    <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none overflow-hidden">
      {[12, 28, 50, 72, 88].map((pct, i) => (
        <div key={i} className="absolute bottom-0 w-px"
             style={{
               left: `${pct}%`,
               height: `${55 + i * 6}%`,
               background: `linear-gradient(to top, rgba(255,255,255,0.06), transparent)`,
               animation: `speed-line 2.2s ${i * 0.18}s ease-out infinite`,
             }} />
      ))}
    </div>


    {/* ── Gauge ── */}
    <div className="relative z-10">
      <svg viewBox="0 0 200 115" width="288" height="166" className="overflow-visible">

        {/* Outer decorative ring */}
        <path d="M 14 100 A 86 86 0 0 0 186 100"
              fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />

        {/* Tick marks — rotated around pivot (100,100) */}
        {GAUGE_TICKS.map(({ angle, major }) => (
          <g key={angle} transform={`rotate(${angle}, 100, 100)`}>
            <line x1="100" y1={major ? 26 : 30} x2="100" y2="37"
                  stroke={major ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)"}
                  strokeWidth={major ? 2 : 1} strokeLinecap="round" />
          </g>
        ))}

        {/* E / F labels */}
        <text x="12" y="114" fill="rgba(255,255,255,0.4)" fontSize="11"
              fontFamily="system-ui" fontWeight="700" letterSpacing="1">E</text>
        <text x="183" y="114" fill="rgba(255,255,255,0.4)" fontSize="11"
              fontFamily="system-ui" fontWeight="700" letterSpacing="1">F</text>

        {/* Track arc */}
        <path d="M 22 100 A 78 78 0 0 0 178 100"
              fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="11" strokeLinecap="round" />

        {/* Colour zones — red near E, amber mid, primary near F */}
        <path d="M 22 100 A 78 78 0 0 0 178 100"
              fill="none"
              stroke="url(#gaugeGrad)" strokeWidth="11" strokeLinecap="round"
              strokeDasharray="245" strokeDashoffset="245"
              style={{ animation: "arc-fill 2.8s cubic-bezier(0.25,0.46,0.45,0.94) 0.35s forwards" }} />

        <defs>
          <linearGradient id="gaugeGrad" gradientUnits="userSpaceOnUse" x1="22" y1="100" x2="178" y2="100">
            <stop offset="0%"   stopColor="#ef4444" />
            <stop offset="35%"  stopColor="#f59e0b" />
            <stop offset="100%" stopColor="hsl(243,75%,60%)" />
          </linearGradient>
        </defs>

        {/* Needle (SVG-native animation for mobile WebViews) */}
        <g transform="rotate(-75 100 100)">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="-75 100 100"
            to="75 100 100"
            begin="0.35s"
            dur="2.8s"
            fill="freeze"
            calcMode="spline"
            keySplines="0.25 0.46 0.45 0.94"
          />
          {/* Tail */}
          <line x1="100" y1="100" x2="100" y2="110"
                stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
          {/* Shaft — tapers toward tip */}
          <line x1="100" y1="100" x2="100" y2="36"
                stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="100" y1="60" x2="100" y2="36"
                stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" />
        </g>

        {/* Centre cap */}
        <circle cx="100" cy="100" r="9" fill="#0e0e22" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="4.5" fill="hsl(243,75%,55%)" />
      </svg>

      {/* Fuel icon centred under gauge */}
      <div className="flex justify-center -mt-1">
        <span className="text-xl opacity-60">⛽</span>
      </div>
    </div>

    {/* Powered by — bottom */}
    <div
      className="absolute bottom-10 z-10 flex items-center gap-2"
      style={{ animation: "text-reveal 0.5s 1.9s ease-out both" }}
    >
      <span className="text-[10px] text-white/50 tracking-widest uppercase">Powered by</span>
      <img src={greatCardsLogoWhite} alt="great.cards" className="h-4 w-auto object-contain opacity-80" />
    </div>

    {/* Text sequence */}
    <div className="text-center mt-24 space-y-2 z-10 px-6">
      <p
        className="text-white/80 text-xs tracking-[0.25em] uppercase font-semibold"
        style={{ animation: "text-reveal 0.5s 0.7s ease-out both" }}
      >
        Scanning 93+ cards for
      </p>
      <h2
        className="text-3xl font-extrabold text-white tracking-tight"
        style={{
          animation: "text-reveal 0.5s 1.1s ease-out both",
          textShadow: "0 2px 20px rgba(0,0,0,0.8)",
        }}
      >
        YOUR FUEL SPEND
      </h2>
      <div
        className="flex items-center justify-center gap-2 pt-1"
        style={{ animation: "text-reveal 0.5s 1.5s ease-out both" }}
      >
        <div className="h-px w-6 bg-white/25" />
        <span className="text-[10px] tracking-widest text-white/55 uppercase font-medium">
          {targetUrl.split("?")[0]}
        </span>
        <div className="h-px w-6 bg-white/25" />
      </div>
    </div>

  </div>
);

// ─── Scenario Picker Sheet ────────────────────────────────────────────────────

const ScenarioPicker = ({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (scenario: Scenario) => void;
}) => {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet — full height */}
      <div className="fixed inset-x-0 bottom-0 top-0 flex flex-col justify-end z-[90] pointer-events-none">
      <div className="w-full max-w-md mx-auto pointer-events-auto animate-slide-up-sheet" style={{ height: "92vh" }}>
        <div className="bg-background rounded-t-[28px] shadow-2xl overflow-hidden h-full flex flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="px-5 pt-3 pb-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground text-[15px]">Test Scenarios</p>
                <p className="text-[11px] text-muted-foreground">Pick a user profile to preview</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* URL preview label */}
          <div className="px-5 pt-3 pb-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
              Select a scenario
            </p>
          </div>

          {/* Scenarios list */}
          <div className="px-4 pb-8 space-y-2.5 flex-1 overflow-y-auto pt-2">
            {SCENARIOS.map((scenario) => {
              const url = buildFuelUrl(scenario.params);
              const hasFuelParam = scenario.params !== null;

              return (
                <button
                  key={scenario.id}
                  onClick={() => onSelect(scenario)}
                  className="w-full text-left rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all duration-200 p-4 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 transition-colors">
                        {hasFuelParam
                          ? <CheckCircle2 className="w-4 h-4 text-primary" />
                          : <CircleDashed className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-semibold text-foreground text-sm">{scenario.label}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${scenario.badgeColor}`}>
                            {scenario.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{scenario.description}</p>
                        {/* URL pill */}
                        <div className="inline-flex items-center gap-1 bg-muted rounded-md px-2 py-1 max-w-full overflow-hidden">
                          <Fuel className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                          <span className="text-[10px] font-mono text-muted-foreground truncate">
                            {url.length > 48 ? `${url.slice(0, 48)}…` : url}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

// ─── Bento grid ───────────────────────────────────────────────────────────────

const bentoItems = [
  { icon: CreditCard, label: "FASTag", color: "text-primary", bg: "bg-primary/10" },
  { icon: Car, label: "Test Drive", color: "text-foreground", bg: "bg-[#f0f0f8]" },
  { icon: FileText, label: "Challan", color: "text-sky-500", bg: "bg-sky-50" },
  { icon: Landmark, label: "Car Loan", color: "text-foreground", bg: "bg-[#f0f0f8]" },
  { icon: ShoppingCart, label: "Store", color: "text-foreground", bg: "bg-[#f0f0f8]" },
  { icon: ShieldCheck, label: "Insurance", color: "text-foreground", bg: "bg-[#f0f0f8]" },
  { icon: Fuel, label: "Ultimate Fuel Card", color: "text-white", bg: "bg-primary", isScenario: true },
  { icon: Grid2X2, label: "More", color: "text-foreground", bg: "bg-[#f0f0f8]" },
];

const bottomNav = [
  { icon: Home, label: "Home", active: true },
  { icon: Heart, label: "Insurance", active: false, badge: true },
  { icon: IndianRupee, label: "Money", active: false },
  { icon: Users, label: "Community", active: false },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const Index = () => {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(false);
  const [splashTarget, setSplashTarget] = useState<string>("/calculator");
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleScenarioSelect = (scenario: Scenario) => {
    const url = buildFuelUrl(scenario.params);
    setSheetOpen(false);

    // No-param fallback goes directly, no splash needed
    if (!scenario.params) {
      navigate(url);
      return;
    }

    setSplashTarget(url);
    setShowSplash(true);
    setTimeout(() => {
      navigate(url);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col max-w-md mx-auto relative overflow-hidden">

      {/* ─── Fuel Gauge Splash ─── */}
      {showSplash && <FuelGaugeSplash targetUrl={splashTarget} />}

      {/* ─── Scenario Picker ─── */}
      <ScenarioPicker
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={handleScenarioSelect}
      />

      {/* ─── Hero / Banner area ─── */}
      <div className="relative w-full">
        <div className="absolute top-3 left-3 z-20">
          <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center shadow-lg">
            <User className="w-5 h-5 text-background" />
          </div>
        </div>
        <div className="absolute top-3 right-3 z-20">
          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-lg">
            <Search className="w-5 h-5 text-foreground" />
          </div>
        </div>
        <img src={challanBanner} alt="Challan Day Live" className="w-full h-52 object-cover object-top" />
        <div className="mx-4 -mt-8 relative z-10 rounded-2xl bg-gradient-to-b from-[#1a1a1a] to-[#111] p-4 shadow-xl border border-white/5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gray-400">Add Your Car</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          </div>
          <p className="text-center text-sm text-white mb-3">
            Unlock <span className="text-amber-400 font-bold">50% OFF on Challan payments</span>
          </p>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-foreground font-semibold text-sm active:scale-[0.98] transition-transform">
            <Plus className="w-4 h-4" />
            Add Car
          </button>
        </div>
      </div>

      {/* ─── Bottom sheet section ─── */}
      <div className="flex-1 bg-background mt-4 rounded-t-[28px] pt-3 px-5 pb-24 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] animate-slide-up">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-primary text-sm">✦</span>
          <div className="h-px flex-1 bg-primary/20" />
          <h3 className="font-bold text-foreground text-[15px] tracking-tight">Your Car Needs</h3>
          <div className="h-px flex-1 bg-primary/20" />
          <span className="text-primary text-sm">✦</span>
        </div>
        <div className="grid grid-cols-4 gap-y-5 gap-x-3">
          {bentoItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => {
                if ("isScenario" in item && item.isScenario) {
                  setSheetOpen(true);
                }
              }}
              className="flex flex-col items-center gap-1.5 group animate-slide-up"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div
                className={`w-[60px] h-[60px] rounded-2xl ${item.bg} flex items-center justify-center transition-all duration-200 group-active:scale-90 group-hover:scale-105 ${
                  "isScenario" in item && item.isScenario
                    ? "animate-fuel-float"
                    : ""
                }`}
              >
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <span
                className={`text-[10px] font-medium leading-tight text-center ${
                  "isScenario" in item && item.isScenario ? "text-primary font-semibold" : "text-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Bottom Navigation ─── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background border-t border-border px-2 py-2 flex items-center justify-around z-50">
        {bottomNav.map((item) => (
          <button key={item.label} className="flex flex-col items-center gap-0.5 relative min-w-[60px]">
            {item.active && <div className="absolute -top-2 w-8 h-[3px] rounded-full bg-primary" />}
            <div className="relative">
              <item.icon className={`w-5 h-5 ${item.active ? "text-primary" : "text-muted-foreground"}`} />
              {item.badge && <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-destructive" />}
            </div>
            <span className={`text-[10px] ${item.active ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Index;
