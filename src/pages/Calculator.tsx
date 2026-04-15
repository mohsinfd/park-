import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Fuel, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "parkplus_user_data";

interface UserData {
  salary: number;
  pincode: string;
  fuelSpend: number;
}

const quickSpends = [
  { label: "Best for ₹3,000 fuel", amount: 3000 },
  { label: "Best for ₹5,000 fuel", amount: 5000 },
  { label: "Best for ₹8,000 fuel", amount: 8000 },
];

const Calculator = () => {
  const navigate = useNavigate();
  const fuelInputRef = useRef<HTMLInputElement>(null);

  const [salary, setSalary] = useState("");
  const [pincode, setPincode] = useState("");
  const [fuelSpend, setFuelSpend] = useState("");
  const [isExisting, setIsExisting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: UserData = JSON.parse(saved);
        if (data.salary) setSalary(String(data.salary));
        if (data.pincode) setPincode(data.pincode);
        if (data.fuelSpend) setFuelSpend(String(data.fuelSpend));
        setIsExisting(true);
      }
    } catch {}
    setTimeout(() => fuelInputRef.current?.focus(), 300);
  }, []);

  const handleSubmit = () => {
    const spend = Number(fuelSpend) || 0;
    if (spend < 500) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ salary: Number(salary) || 0, pincode, fuelSpend: spend })
    );

    setLoading(true);
    setTimeout(() => {
      navigate(`/results?spend=${spend}&salary=${Number(salary) || 0}&pincode=${pincode}&source=fuel_calculator`);
    }, 1500);
  };

  const handleQuickSpend = (amount: number) => {
    setLoading(true);
    setTimeout(() => {
      navigate(`/results?spend=${amount}&source=fuel_${amount}`);
    }, 1500);
  };

  const isValid = (Number(fuelSpend) || 0) >= 500;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Fuel className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground animate-slide-up">
            Analyzing best fuel rewards for you ⛽
          </p>
          {/* Progress bar */}
          <div className="w-48 h-1.5 rounded-full bg-muted overflow-hidden mt-2">
            <div className="h-full rounded-full gradient-park animate-progress-fill" />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors hover:scale-110 active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-park flex items-center justify-center">
              <Fuel className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Park+</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-8 pb-32">
        {/* Header text */}
        <div className="mb-6 animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {isExisting ? "Welcome back!" : "Find Your Best Fuel Card"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isExisting
              ? "We've pre-filled your details. You can edit them."
              : "Enter your details to get the most rewarding fuel cards"}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div
            className="bg-card rounded-xl border border-border p-4 space-y-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            {/* Fuel Spend */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Monthly Fuel Spend (₹) *
              </label>
              <Input
                ref={fuelInputRef}
                type="number"
                value={fuelSpend}
                onChange={(e) => setFuelSpend(e.target.value)}
                placeholder="e.g. 5000"
                className="h-12 text-lg font-semibold bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                min={0}
              />
              {fuelSpend && Number(fuelSpend) < 500 && (
                <p className="text-xs text-destructive mt-1 animate-slide-up">Minimum ₹500</p>
              )}
            </div>

            {/* Salary */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Monthly Salary (₹)
              </label>
              <Input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. 50000"
                className="h-12 bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                min={0}
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Pincode
              </label>
              <Input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="e.g. 110001"
                className="h-12 bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                maxLength={6}
              />
            </div>
          </div>

          {/* Cross-sell Section */}
          <div className="pt-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Not sure? Explore popular spending ranges</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {quickSpends.map((qs, i) => (
                <button
                  key={qs.amount}
                  onClick={() => handleQuickSpend(qs.amount)}
                  className="flex-shrink-0 snap-start px-5 py-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 text-sm font-medium text-foreground whitespace-nowrap animate-slide-up"
                  style={{ animationDelay: `${300 + i * 80}ms` }}
                >
                  {qs.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto">
          <Button
            size="lg"
            className="w-full gradient-park text-primary-foreground font-semibold py-6 text-base rounded-xl shadow-lg hover:opacity-90 hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98] transition-all duration-300"
            onClick={handleSubmit}
            disabled={!isValid || loading}
          >
            {isExisting ? "Calculate Best Cards" : "Find My Cards"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
