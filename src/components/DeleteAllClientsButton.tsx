"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteAllClientsButton() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        "⚠️ DELETE ALL CLIENTS AND POLICIES?\n\nThis will permanently remove EVERY client, policy, and stored document. This CANNOT be undone.\n\nAre you absolutely sure?"
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch("/api/clients?all=1", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert("Error: " + (data.error || "Delete failed"));
        setDeleting(false);
        return;
      }
      router.refresh();
    } catch {
      alert("Delete failed");
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
    >
      {deleting ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Trash2 size={16} />
      )}
      Delete all
    </button>
  );
}
