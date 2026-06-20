"use client";

import { useState } from "react";
import { User, Save, X } from "lucide-react";

export function ProfileEditor({
  currentName,
  onUpdate,
}: {
  currentName: string;
  onUpdate: (newName: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");

      onUpdate(trimmed);
      setIsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-black/[.04] hover:text-foreground transition"
      >
        <User size={16} />
        Edit Profile
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-lg w-full max-w-md border border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <User size={16} /> Edit Profile
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-black/[.04] rounded"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !saving) {
                  handleSave();
                }
              }}
            />
            <p className="text-xs text-muted mt-1.5">
              This name will appear in email signatures
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              disabled={saving}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-black/[.04] transition disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
