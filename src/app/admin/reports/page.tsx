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
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Issue reports</h1>
        <p className="text-sm text-muted mt-1">
          Problems reported by agents and their colleagues.
        </p>
      </div>

      {open.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
            🔔 {open.length} open {open.length === 1 ? 'issue' : 'issues'} require{open.length === 1 ? 's' : ''} attention
          </p>
        </div>
      )}

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
    <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2 sm:gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm sm:text-base truncate">{report.reporter_name || "Unknown"}</p>
          <p className="text-xs text-muted break-words">
            {report.reporter_email}
            {report.page && (
              <>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline text-xs">{report.page}</span>
              </>
            )}
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">{shortDate(report.created_at)}</span>
          </p>
        </div>
        <form action={report.status === "open" ? resolve : reopen}>
          <button
            className={`text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-full border transition whitespace-nowrap ${
              report.status === "open"
                ? "border-border hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            }`}
          >
            {report.status === "open" ? "Mark resolved" : "Reopen"}
          </button>
        </form>
      </div>
      <p className="text-sm mt-3 whitespace-pre-wrap leading-relaxed break-words">{report.message}</p>
    </div>
  );
}
