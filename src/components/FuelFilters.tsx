import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FuelFiltersState, FeeRange } from "@/types/card";

interface FuelFiltersProps {
  filters: FuelFiltersState;
  onChange: (filters: FuelFiltersState) => void;
  onClear?: () => void;
}

const NETWORKS = ["Visa", "Mastercard", "RuPay"];

const FEE_RANGES: { value: FeeRange; label: string }[] = [
  { value: "ltf", label: "Lifetime Free (₹0)" },
  { value: "1-1000", label: "₹1 – ₹1,000" },
  { value: "1001-2000", label: "₹1,001 – ₹2,000" },
  { value: "2000+", label: "₹2,000+" },
];

const FuelFilters = ({ filters, onChange, onClear }: FuelFiltersProps) => {
  const toggleFeeRange = (range: FeeRange) => {
    const current = filters.feeRanges;
    const next = current.includes(range)
      ? current.filter((r) => r !== range)
      : [...current, range];
    onChange({ ...filters, feeRanges: next });
  };

  const hasActiveFilters = filters.feeRanges.length > 0 || filters.networks.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4 animate-slide-up">
      {onClear && hasActiveFilters && (
        <div className="flex justify-end">
          <button onClick={onClear} className="text-xs text-primary hover:underline">Clear All</button>
        </div>
      )}
      {/* Annual Fee */}
      <div>
        <span className="text-sm font-medium text-foreground block mb-2">Annual Fee</span>
        <div className="flex flex-wrap gap-2">
          {FEE_RANGES.map(({ value, label }) => {
            const checked = filters.feeRanges.includes(value);
            return (
              <label
                key={value}
                className={`inline-flex items-center gap-1.5 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  checked
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleFeeRange(value)}
                  className="h-3.5 w-3.5"
                />
                {label}
              </label>
            );
          })}
        </div>
      </div>

      {/* Card Network */}
      <div>
        <span className="text-sm font-medium text-foreground block mb-2">Card Network</span>
        <ToggleGroup
          type="multiple"
          value={filters.networks}
          onValueChange={(networks) => onChange({ ...filters, networks })}
          className="justify-start gap-2"
        >
          {NETWORKS.map((n) => (
            <ToggleGroupItem
              key={n}
              value={n}
              variant="outline"
              size="sm"
              className="rounded-full px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {n}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
};

export default FuelFilters;
