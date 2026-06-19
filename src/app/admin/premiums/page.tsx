import { getPremiumCharts } from "@/lib/data";
import { PremiumManager } from "@/components/PremiumManager";

export default async function PremiumsPage() {
  const charts = await getPremiumCharts();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Premium charts</h1>
        <p className="text-muted mt-1">
          Upload an age-wise premium chart PDF, or add rows manually. Agents use
          these to project future premium changes.
        </p>
      </div>
      <PremiumManager initialCharts={charts} />
    </div>
  );
}
