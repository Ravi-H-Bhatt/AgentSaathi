"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { User, Save, X } from "lucide-react";

export function ProfileEditor({
  currentName,
  onUpdate,
}: {
  currentName: string;
  onUpdate: (newName: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // Lock background scroll + close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

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

  const trigger = (
    <button
      onClick={() => {
        setName(currentName);
        setIsOpen(true);
      }}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-black/[.04] hover:text-foreground transition"
    >
      <User size={16} />
      Edit Profile
    </button>
  );

  const modal =
    isOpen && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2">
                  <User size={16} /> Edit Profile
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-black/[.06] rounded-lg transition"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {error && (
                  <div className="text-sm bg-red-50 text-red-600 px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground transition"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !saving) handleSave();
                    }}
                  />
                  <p className="text-xs text-muted mt-1.5">
                    This name will appear in email signatures.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving || !name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
                  >
                    <Save size={14} />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    disabled={saving}
                    className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-black/[.04] transition disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {trigger}
      {modal}
    </>
  );
}
