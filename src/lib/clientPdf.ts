"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { money, shortDate } from "@/lib/format";
import type { ClientWithPolicies } from "@/lib/types";

/** Generate and download a clean B/W PDF report for a client. */
export function downloadClientPdf(
  client: ClientWithPolicies,
  agentName: string
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, W, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AgentSaathi", 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Client Policy Report", W - 40, 40, { align: "right" });

  // Client block
  doc.setTextColor(10, 10, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(client.full_name, 40, 110);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  const info: string[] = [];
  if (client.email) info.push(`Email: ${client.email}`);
  if (client.phone) info.push(`Phone: ${client.phone}`);
  if (client.age != null) info.push(`Age: ${client.age}`);
  if (client.date_of_birth) info.push(`DOB: ${shortDate(client.date_of_birth)}`);
  doc.text(info.join("   |   "), 40, 128);
  doc.text(
    `Prepared by ${agentName} on ${shortDate(new Date().toISOString())}`,
    40,
    144
  );

  // Policies table
  const body = client.policies.map((p) => [
    p.company || "—",
    p.policy_type || "—",
    p.policy_number || "—",
    money(p.sum_insured),
    money(p.premium),
    shortDate(p.renewal_date),
  ]);

  autoTable(doc, {
    startY: 168,
    head: [["Company", "Type", "Policy No.", "Sum Insured", "Premium", "Renewal"]],
    body: body.length ? body : [["—", "—", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: [10, 10, 10], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: 30 },
    alternateRowStyles: { fillColor: [248, 248, 249] },
    margin: { left: 40, right: 40 },
  });

  const totalSI = client.policies.reduce((s, p) => s + (p.sum_insured || 0), 0);
  const totalPrem = client.policies.reduce((s, p) => s + (p.premium || 0), 0);

  // @ts-expect-error lastAutoTable is added by the plugin at runtime
  const endY = (doc.lastAutoTable?.finalY ?? 200) + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(10, 10, 10);
  doc.text(`Total sum insured: ${money(totalSI)}`, 40, endY);
  doc.text(`Total annual premium: ${money(totalPrem)}`, 40, endY + 16);

  doc.save(`${client.full_name.replace(/\s+/g, "_")}_report.pdf`);
}

/** Generate and download a full book-of-business PDF: every client + policies. */
export function downloadAllClientsPdf(
  clients: ClientWithPolicies[],
  agentName: string
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, W, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AgentSaathi", 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Book of Business", W - 40, 40, { align: "right" });

  doc.setTextColor(10, 10, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("All clients & policies", 40, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  const totalPolicies = clients.reduce((s, c) => s + c.policies.length, 0);
  doc.text(
    `${clients.length} clients · ${totalPolicies} policies · prepared by ${agentName} on ${shortDate(
      new Date().toISOString()
    )}`,
    40,
    118
  );

  // Flat table: one row per policy, grouped by client name.
  const body: string[][] = [];
  for (const c of clients) {
    if (c.policies.length === 0) {
      body.push([c.full_name, "—", "—", "—", "—", "—", "—"]);
    } else {
      c.policies.forEach((p, i) => {
        body.push([
          i === 0 ? c.full_name : "",
          p.company || "—",
          p.policy_type || "—",
          p.policy_number || "—",
          money(p.sum_insured),
          money(p.premium),
          shortDate(p.renewal_date),
        ]);
      });
    }
  }

  autoTable(doc, {
    startY: 140,
    head: [
      ["Client", "Company", "Type", "Policy No.", "Sum Insured", "Premium", "Renewal"],
    ],
    body: body.length ? body : [["—", "—", "—", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: [10, 10, 10], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: 30 },
    alternateRowStyles: { fillColor: [248, 248, 249] },
    columnStyles: { 0: { fontStyle: "bold" } },
    margin: { left: 40, right: 40 },
  });

  const totalSI = clients.reduce(
    (s, c) => s + c.policies.reduce((a, p) => a + (p.sum_insured || 0), 0),
    0
  );
  const totalPrem = clients.reduce(
    (s, c) => s + c.policies.reduce((a, p) => a + (p.premium || 0), 0),
    0
  );

  // @ts-expect-error lastAutoTable is added by the plugin at runtime
  const endY = (doc.lastAutoTable?.finalY ?? 200) + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(10, 10, 10);
  doc.text(`Total sum insured: ${money(totalSI)}`, 40, endY);
  doc.text(`Total annual premium: ${money(totalPrem)}`, 40, endY + 16);

  doc.save(`AgentSaathi_book_of_business.pdf`);
}
