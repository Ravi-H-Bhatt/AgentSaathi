"use client";

import { useTransition } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import { setAgentStatus } from "@/app/admin/actions";
import type { AgentStatus } from "@/lib/types";

export function AgentRow({
  id,
  name,
  email,
  status,
  signedUp,
}: {
  id: string;
  name: string | null;
  email: string;
  status: AgentStatus;
  signedUp: string;
}) {
  const [pending, startTransition] = useTransition();

  function update(s: AgentStatus) {
    startTransition(() => setAgentStatus(id, s));
  }

  const badge =
    status === "approved"
      ? "bg-green-50 text-green-700"
      : status === "rejected"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  return (
    <div className="flex items-center justify-between px-5 py-4 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold shrink-0">
          {(name || email).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{name || "—"}</p>
          <p className="text-sm text-muted truncate">
            {email} · joined {signedUp}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge}`}>
          {status}
        </span>
        {status === "pending" && (
          <>
            <button
              onClick={() => update("approved")}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-foreground text-background hover:opacity-90 transition disabled:opacity-50"
            >
              <Check size={14} /> Approve
            </button>
            <button
              onClick={() => update("rejected")}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-border hover:bg-black/[.03] transition disabled:opacity-50"
            >
              <X size={14} /> Reject
            </button>
          </>
        )}
        {status === "approved" && (
          <button
            onClick={() => update("rejected")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-border hover:bg-black/[.03] transition disabled:opacity-50"
          >
            <X size={14} /> Revoke
          </button>
        )}
        {status === "rejected" && (
          <button
            onClick={() => update("approved")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-border hover:bg-black/[.03] transition disabled:opacity-50"
          >
            <RotateCcw size={14} /> Approve
          </button>
        )}
      </div>
    </div>
  );
}
