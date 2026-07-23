"use client";

import { useTransition } from "react";
import { X, RotateCcw } from "lucide-react";
import { setColleagueStatus } from "@/app/admin/actions";

export function ColleagueRow({
  id,
  name,
  email,
  ownerName,
  status,
  joined,
}: {
  id: string;
  name: string | null;
  email: string;
  ownerName: string | null;
  status: "approved" | "rejected" | "pending";
  joined: string;
}) {
  const [pending, startTransition] = useTransition();

  function update(s: "approved" | "rejected") {
    startTransition(() => setColleagueStatus(id, s));
  }

  const badge =
    status === "approved"
      ? "bg-green-50 text-green-700"
      : status === "rejected"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  return (
    <div className="flex items-center justify-between px-5 py-4 gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold shrink-0">
          {(name || email).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{name || "—"}</p>
          <p className="text-sm text-muted truncate">
            {email}
            {ownerName ? ` · under ${ownerName}` : ""} · joined {joined}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge}`}>
          {status}
        </span>
        {status === "rejected" ? (
          <button
            onClick={() => update("approved")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-border hover:bg-black/[.03] transition disabled:opacity-50"
          >
            <RotateCcw size={14} /> Restore
          </button>
        ) : (
          <button
            onClick={() => update("rejected")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-border hover:bg-black/[.03] transition disabled:opacity-50"
          >
            <X size={14} /> Revoke
          </button>
        )}
      </div>
    </div>
  );
}
