"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { shortDate, companyLabel } from "@/lib/format";
import type { ClientWithPolicies } from "@/lib/types";

/** Money formatter for PDFs. jsPDF's built-in Helvetica has no Rupee glyph (₹),
 *  which renders as garbled spacing, so we use "Rs." with Indian grouping. */
function pdfMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "Rs. " + Number(n).toLocaleString("en-IN");
}

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

  // Policies table. Insurer may be stored in company OR product_name
  // (bulk-imported register rows keep the insurer in product_name).
  const body = client.policies.map((p) => [
    companyLabel(p.company, p.product_name) || p.product_name || "—",
    p.policy_type || "—",
    p.policy_number || "—",
    pdfMoney(p.sum_insured),
    pdfMoney(p.premium),
    shortDate(p.renewal_date),
  ]);

  autoTable(doc, {
    startY: 168,
    head: [["Company", "Type", "Policy No.", "Sum Insured", "Premium", "Renewal"]],
    body: body.length ? body : [["—", "—", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: [10, 10, 10], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: 30, cellPadding: 4 },
    alternateRowStyles: { fillColor: [248, 248, 249] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 70 },
      2: { cellWidth: 80 },
      3: { cellWidth: 95, halign: "right" },
      4: { cellWidth: 80, halign: "right" },
      5: { cellWidth: 70 },
    },
    margin: { left: 40, right: 40 },
  });

  const totalSI = client.policies.reduce((s, p) => s + (p.sum_insured || 0), 0);
  const totalPrem = client.policies.reduce((s, p) => s + (p.premium || 0), 0);

  // @ts-expect-error lastAutoTable is added by the plugin at runtime
  const endY = (doc.lastAutoTable?.finalY ?? 200) + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(10, 10, 10);
  doc.text(`Total sum insured: ${pdfMoney(totalSI)}`, 40, endY);
  doc.text(`Total annual premium: ${pdfMoney(totalPrem)}`, 40, endY + 16);

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
          companyLabel(p.company, p.product_name) || p.product_name || "—",
          p.policy_type || "—",
          p.policy_number || "—",
          pdfMoney(p.sum_insured),
          pdfMoney(p.premium),
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
    bodyStyles: { fontSize: 8, textColor: 30, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 248, 249] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 90 },
      4: { halign: "right", cellWidth: 75 },
      5: { halign: "right", cellWidth: 65 },
    },
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
  doc.text(`Total sum insured: ${pdfMoney(totalSI)}`, 40, endY);
  doc.text(`Total annual premium: ${pdfMoney(totalPrem)}`, 40, endY + 16);

  doc.save(`AgentSaathi_book_of_business.pdf`);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Download a PDF of all policies whose renewal falls in a given month
 * (0 = January … 11 = December). Recurs annually — matches the month of the
 * stored renewal date regardless of year. One row per policy.
 */
export function downloadRenewalsByMonthPdf(
  clients: ClientWithPolicies[],
  agentName: string,
  month: number
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const monthName = MONTH_NAMES[month] || "All";

  // Header bar
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, W, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AgentSaathi", 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Renewals Report", W - 40, 40, { align: "right" });

  doc.setTextColor(10, 10, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Renewals in ${monthName}`, 40, 100);

  // Collect matching policies (by renewal month), with client info.
  const rows: {
    client: string;
    phone: string;
    company: string;
    type: string;
    number: string;
    sum: number | null;
    premium: number | null;
    renewal: string | null;
  }[] = [];

  for (const c of clients) {
    for (const p of c.policies) {
      if (!p.renewal_date) continue;
      const d = new Date(p.renewal_date);
      if (isNaN(d.getTime()) || d.getMonth() !== month) continue;
      rows.push({
        client: c.full_name,
        phone: c.phone || "—",
        company: companyLabel(p.company, p.product_name) || p.product_name || "—",
        type: p.policy_type || "—",
        number: p.policy_number || "—",
        sum: p.sum_insured,
        premium: p.premium,
        renewal: p.renewal_date,
      });
    }
  }

  // Sort by day of month (soonest first within the month).
  rows.sort((a, b) => {
    const da = a.renewal ? new Date(a.renewal).getDate() : 0;
    const db = b.renewal ? new Date(b.renewal).getDate() : 0;
    return da - db;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `${rows.length} policies renewing in ${monthName} · prepared by ${agentName} on ${shortDate(
      new Date().toISOString()
    )}`,
    40,
    118
  );

  const body = rows.map((r) => [
    r.client,
    r.phone,
    r.company,
    r.type,
    r.number,
    pdfMoney(r.sum),
    pdfMoney(r.premium),
    shortDate(r.renewal),
  ]);

  autoTable(doc, {
    startY: 140,
    head: [
      ["Client", "Phone", "Company", "Type", "Policy No.", "Sum Insured", "Premium", "Renewal"],
    ],
    body: body.length ? body : [["No renewals in " + monthName, "—", "—", "—", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: [10, 10, 10], textColor: 255, fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: 30, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 248, 249] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 85 },
      1: { cellWidth: 60 },
      5: { halign: "right", cellWidth: 65 },
      6: { halign: "right", cellWidth: 55 },
      7: { cellWidth: 55 },
    },
    margin: { left: 40, right: 40 },
  });

  const totalPrem = rows.reduce((s, r) => s + (r.premium || 0), 0);
  const totalSI = rows.reduce((s, r) => s + (r.sum || 0), 0);

  // @ts-expect-error lastAutoTable is added by the plugin at runtime
  const endY = (doc.lastAutoTable?.finalY ?? 200) + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(10, 10, 10);
  doc.text(`Total sum insured: ${pdfMoney(totalSI)}`, 40, endY);
  doc.text(`Total premium: ${pdfMoney(totalPrem)}`, 40, endY + 16);

  doc.save(`AgentSaathi_renewals_${monthName}.pdf`);
}
