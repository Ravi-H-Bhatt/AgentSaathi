"use client";

import { Download } from "lucide-react";
import { downloadAllClientsPdf } from "@/lib/clientPdf";
import type { ClientWithPolicies } from "@/lib/types";

export function DownloadAllButton({
  clients,
  agentName,
}: {
  clients: ClientWithPolicies[];
  agentName: string;
}) {
  return (
    <button
      onClick={() => downloadAllClientsPdf(clients, agentName)}
      disabled={clients.length === 0}
      className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-border hover:bg-black/[.03] transition disabled:opacity-50"
    >
      <Download size={16} /> Download all (PDF)
    </button>
  );
}
