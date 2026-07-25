import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PremiumDataManager from "@/components/PremiumDataManager";

export default async function PremiumDataPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            Admin access required to manage premium data.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Premium Data Management
          </h1>
          <p className="text-gray-600 mt-2">
            Upload and manage New India Assurance premium chart data
          </p>
        </div>

        <PremiumDataManager />
      </div>
    </div>
  );
}
