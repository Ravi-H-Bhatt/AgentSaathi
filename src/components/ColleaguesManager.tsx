"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Copy,
  Check,
  Trash2,
  Clock,
  Activity,
  Shield,
  Link2,
  X,
} from "lucide-react";
import {
  createInvitation,
  revokeInvitation,
  removeColleague,
  updateColleaguePermissions,
} from "@/app/(app)/colleagues/actions";
import type { Permissions } from "@/lib/types";

interface ColleagueRow {
  id: string;
  name: string | null;
  email: string;
  permissions: Permissions;
  joined: string;
}
interface InviteRow {
  id: string;
  token: string;
  email: string | null;
  status: "pending" | "accepted" | "revoked";
  permissions: Permissions;
  createdAt: string;
}
interface TimeRow {
  id: string;
  agentId: string;
  clockIn: string;
  clockOut: string | null;
}
interface ActivityRow {
  id: string;
  agentId: string;
  action: string;
  detail: string | null;
  workspace: string | null;
  createdAt: string;
}

const PERMISSION_LABELS: { key: keyof Permissions; label: string; desc: string }[] = [
  { key: "ai", label: "AI Assistant", desc: "Ask the AI about clients & the web" },
  { key: "clients", label: "Clients", desc: "View the client directory & details" },
  { key: "upload", label: "Upload policies", desc: "Add and parse new policy PDFs" },
  { key: "email", label: "Send reminders", desc: "Email renewal reminders to clients" },
  { key: "delete", label: "Delete", desc: "Delete clients and individual policies" },
];

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duration(a: string, b: string | null): string {
  const end = b ? new Date(b).getTime() : Date.now();
  const ms = end - new Date(a).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const ACTION_LABEL: Record<string, string> = {
  clock_in: "Clocked in",
  clock_out: "Clocked out",
  ai_search: "Asked the AI",
  view_client: "Viewed a client",
  view_document: "Viewed a document",
  download_document: "Downloaded a document",
  upload_policy: "Uploaded a policy",
  bundle_upload: "Uploaded policies (bundle)",
  bulk_import: "Imported a policy register",
  create_policy_manual: "Added a policy manually",
  send_email: "Sent a reminder",
  team_chat: "Sent a team message",
  direct_message: "Sent a direct message",
  delete_policy: "Deleted a policy",
  delete_client: "Deleted a client",
  delete_all_clients: "Deleted all clients",
};

export function ColleaguesManager({
  siteUrl,
  colleagues,
  invitations,
  timeEntries,
  activity,
}: {
  siteUrl: string;
  colleagues: ColleagueRow[];
  invitations: InviteRow[];
  timeEntries: TimeRow[];
  activity: ActivityRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [showInvite, setShowInvite] = useState(false);
  const [perms, setPerms] = useState<Permissions>({
    ai: true,
    clients: true,
    upload: true,
    email: true,
    delete: false,
  });
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<"team" | "time" | "activity">("team");

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of colleagues) m.set(c.id, c.name || c.email);
    return m;
  }, [colleagues]);

  const activeInvites = invitations.filter((i) => i.status === "pending");

  function inviteUrl(token: string) {
    return `${siteUrl}/invite/${token}`;
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  }

  function createInvite() {
    startTransition(async () => {
      const { token } = await createInvitation(perms);
      setNewLink(inviteUrl(token));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Colleagues</h1>
          <p className="text-muted mt-1">
            Invite teammates, set their access, and track their time & activity.
          </p>
        </div>
        <button
          onClick={() => {
            setShowInvite(true);
            setNewLink(null);
          }}
          className="group inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-foreground text-background hover:scale-105 active:scale-95 transition-all duration-200 sheen"
        >
          <UserPlus size={16} className="transition-transform group-hover:rotate-12" />
          Invite colleague
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { k: "team", label: "Team", icon: Shield },
          { k: "time", label: "Time logs", icon: Clock },
          { k: "activity", label: "Activity", icon: Activity },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              tab === t.k
                ? "bg-foreground text-background"
                : "border border-border hover:bg-black/[.03]"
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "team" && (
          <motion.div
            key="team"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Active invites */}
            {activeInvites.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Link2 size={16} /> Pending invites ({activeInvites.length})
                </h2>
                <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                  {activeInvites.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {inviteUrl(inv.token)}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {permsSummary(inv.permissions)} · created {fmt(inv.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => copy(inviteUrl(inv.token), inv.id)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-border hover:bg-black/[.03] transition"
                        >
                          {copied === inv.id ? (
                            <>
                              <Check size={14} /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={14} /> Copy link
                            </>
                          )}
                        </button>
                        <button
                          onClick={() =>
                            startTransition(() => revokeInvitation(inv.id))
                          }
                          disabled={pending}
                          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-border hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition disabled:opacity-50"
                        >
                          <X size={14} /> Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Colleagues */}
            <section>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Shield size={16} /> Colleagues ({colleagues.length})
              </h2>
              {colleagues.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card py-14 text-center text-muted text-sm">
                  No colleagues yet. Invite one to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {colleagues.map((c, i) => (
                    <ColleagueCard
                      key={c.id}
                      colleague={c}
                      index={i}
                      pending={pending}
                      onSave={(p) =>
                        startTransition(() =>
                          updateColleaguePermissions(c.id, p)
                        )
                      }
                      onRemove={() =>
                        startTransition(() => removeColleague(c.id))
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        )}

        {tab === "time" && (
          <motion.div
            key="time"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {timeEntries.length === 0 ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                  {colleagues.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-5 py-4 gap-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.name || c.email}</p>
                        <p className="text-sm text-muted">No time entries yet</p>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0 bg-black/[.04] text-muted">
                        Not clocked in
                      </span>
                    </div>
                  ))}
                </div>
                {colleagues.length === 0 && (
                  <div className="rounded-2xl border border-border bg-card py-14 text-center text-muted text-sm">
                    No colleagues yet. Invite teammates to track their time.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                {/* Colleagues with NO time entries — still listed so the team roster is complete. */}
                {colleagues
                  .filter((c) => !timeEntries.some((t) => t.agentId === c.id))
                  .map((c) => (
                    <div key={`none-${c.id}`} className="flex items-center justify-between px-5 py-4 gap-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.name || c.email}</p>
                        <p className="text-sm text-muted">No time entries yet</p>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0 bg-black/[.04] text-muted">
                        Not clocked in
                      </span>
                    </div>
                  ))}
                {timeEntries.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-5 py-4 gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {nameById.get(t.agentId) || "You"}
                      </p>
                      <p className="text-sm text-muted">
                        In {fmt(t.clockIn)} · Out {fmt(t.clockOut)}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                        t.clockOut
                          ? "bg-black/[.04] text-muted"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {t.clockOut ? duration(t.clockIn, t.clockOut) : "Active"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === "activity" && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activity.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-14 text-center text-muted text-sm">
                No activity recorded yet.
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="h-2 w-2 rounded-full bg-foreground mt-2 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">
                          {nameById.get(a.agentId) || "You"}
                        </span>{" "}
                        {ACTION_LABEL[a.action] || a.action}
                        {a.detail ? (
                          <span className="text-muted"> — {a.detail}</span>
                        ) : null}
                        {a.workspace === "lic" && (
                          <span className="ml-2 inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                            LIC
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{fmt(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite modal */}
      <AnimatePresence>
        {showInvite && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInvite(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92%] max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-semibold">Invite a colleague</h3>
                <button
                  onClick={() => setShowInvite(false)}
                  className="p-1.5 rounded-lg hover:bg-black/[.04]"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-muted mb-4">
                Choose what this colleague can access, then share the link.
              </p>

              {!newLink ? (
                <>
                  <div className="space-y-2">
                    {PERMISSION_LABELS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() =>
                          setPerms((s) => ({ ...s, [p.key]: !s[p.key] }))
                        }
                        className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                          perms[p.key]
                            ? "border-foreground bg-foreground/[.03]"
                            : "border-border hover:bg-black/[.02]"
                        }`}
                      >
                        <span>
                          <span className="text-sm font-medium block">
                            {p.label}
                          </span>
                          <span className="text-xs text-muted">{p.desc}</span>
                        </span>
                        <span
                          className={`h-5 w-9 rounded-full relative transition ${
                            perms[p.key] ? "bg-foreground" : "bg-black/15"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                              perms[p.key] ? "left-[18px]" : "left-0.5"
                            }`}
                          />
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={createInvite}
                    disabled={pending}
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full bg-foreground text-background hover:opacity-90 transition disabled:opacity-50"
                  >
                    <Link2 size={16} />
                    {pending ? "Generating…" : "Generate invite link"}
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl bg-green-50 text-green-800 px-4 py-3 text-sm flex items-center gap-2">
                    <Check size={16} /> Invite link ready — share it with your
                    colleague.
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={newLink}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
                    />
                    <button
                      onClick={() => copy(newLink, "modal")}
                      className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 transition"
                    >
                      {copied === "modal" ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowInvite(false);
                    }}
                    className="w-full text-sm font-medium px-4 py-2.5 rounded-full border border-border hover:bg-black/[.03] transition"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function permsSummary(p: Permissions): string {
  const on = PERMISSION_LABELS.filter((x) => p[x.key]).map((x) => x.label);
  return on.length === PERMISSION_LABELS.length
    ? "Full access"
    : on.length === 0
      ? "No access"
      : on.join(", ");
}

function ColleagueCard({
  colleague,
  index,
  pending,
  onSave,
  onRemove,
}: {
  colleague: ColleagueRow;
  index: number;
  pending: boolean;
  onSave: (p: Permissions) => void;
  onRemove: () => void;
}) {
  const [perms, setPerms] = useState<Permissions>(colleague.permissions);
  const dirty =
    JSON.stringify(perms) !== JSON.stringify(colleague.permissions);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
      className="rounded-2xl border border-border bg-card p-5 lift"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold shrink-0">
            {(colleague.name || colleague.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{colleague.name || "—"}</p>
            <p className="text-sm text-muted truncate">{colleague.email}</p>
          </div>
        </div>
        <button
          onClick={onRemove}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-border hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition disabled:opacity-50"
        >
          <Trash2 size={14} /> Remove
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PERMISSION_LABELS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPerms((s) => ({ ...s, [p.key]: !s[p.key] }))}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              perms[p.key]
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted hover:bg-black/[.03]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onSave(perms)}
                disabled={pending}
                className="text-sm font-medium px-4 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition disabled:opacity-50"
              >
                Save changes
              </button>
              <button
                onClick={() => setPerms(colleague.permissions)}
                className="text-sm font-medium px-4 py-2 rounded-full border border-border hover:bg-black/[.03] transition"
              >
                Reset
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
