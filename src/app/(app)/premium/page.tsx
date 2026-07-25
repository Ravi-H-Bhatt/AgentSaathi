import { getCurrentAgent } from "@/lib/auth";
import { redirect } from "next/navigation";
import PremiumCalculator from "@/components/PremiumCalculator";

export const metadata = {
  title: "Premium Calculator - New India Assurance",
  description: "Calculate premium for New India Mediclaim policies",
};

export default async function PremiumPage() {
  const agent = await getCurrentAgent();

  if (!agent) {
    redirect("/login");
  }

  // Both agents (owners) and colleagues can access premium calculator
  // No permission check needed - all authenticated users can calculate premium

  return <PremiumCalculator />;
}
