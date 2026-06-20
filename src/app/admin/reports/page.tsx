import { createAdminClient } from "@/lib/supabase/admin";
import { shortDate } from "@/lib/format";
import { setReportStatus } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

interface ErrorReport {
  id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  message: string;
  page: string | null;
  status: "open" | "resolved";
  created_at: string;
}

export default async function AdminReportsPage() {
  const db = createAdminClient();
  const { data } = await db
    .from("error_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const reports = (data as ErrorReport[]) || [];
  const open = reports.filter((r) => r.status === "open");
  const resolved = reports.filter((r) => r.status === "resolved");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Issue reports</h1>
        <p className="text-muted mt-1">
          Problems reported by agents and their colleagues.
        </p>
      </div>

      <Section title="Open" count={open.length} empty="No open issues.">
        {open.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </Section>

      <Section title="Resolved" count={resolved.length} empty="No resolved issues yet.">
        {resolved.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-semibold mb-3">
        {title} <span className="text-muted font-normal">({count})</span>
      </h2>
      {count === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-10 text-center text-muted text-sm">
          {empty}
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}

function ReportCard({ report }: { report: ErrorReport }) {
  const resolve = setReportStatus.bind(null, report.id, "resolved");
  const reopen = setReportStatus.bind(null, report.id, "open");
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-medium">{report.reporter_name || "Unknown"}</p>
          <p className="text-xs text-muted">
            {report.reporter_email}
            {report.page ? ` · ${report.page}` : ""} · {shortDate(report.created_at)}
          </p>
        </div>
        <form action={report.status === "open" ? resolve : reopen}>
          <button
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              report.status === "open"
                ? "border-border hover:bg-black/[.04]"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {report.status === "open" ? "Mark resolved" : "Resolved · reopen"}
          </button>
        </form>
      </div>
      <p className="text-sm mt-3 whitespace-pre-wrap leading-relaxed">{report.message}</p>
    </div>
  );
}
