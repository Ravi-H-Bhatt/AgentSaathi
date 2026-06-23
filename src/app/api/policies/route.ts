import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor } from "@/lib/team";
import { savePolicyForOwner, type SavePolicyInput } from "@/lib/policies";

export const runtime = "nodejs";

/** Create (or reuse) a client and attach a policy. */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!permissionsFor(agent).upload) {
    return NextResponse.json(
      { error: "You don't have permission to add policies." },
      { status: 403 }
    );
  }

  const body = (await request.json()) as SavePolicyInput;
  if (!body.client_name || !body.client_name.trim()) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  try {
    const result = await savePolicyForOwner(ownerIdFor(agent), body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 }
    );
  }
}
