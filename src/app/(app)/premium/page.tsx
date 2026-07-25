import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PremiumCalculator from "@/components/PremiumCalculator";

export const metadata = {
  title: "Premium Calculator - New India Assurance",
  description: "Calculate premium for New India Mediclaim policies",
};

export default async function PremiumPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Both agents and colleagues can calculate premium
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canCalculate = profile?.role === "agent" || profile?.role === "colleague";

  if (!canCalculate) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            You do not have permission to access the premium calculator.
          </div>
        </div>
      </div>
    );
  }

  return <PremiumCalculator />;
}
