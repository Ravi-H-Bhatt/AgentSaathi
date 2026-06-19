import "server-only";

import nodemailer from "nodemailer";
import type { Client, Policy } from "@/lib/types";

function getTransport() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

function fmtMoney(n: number | null): string {
  if (n == null) return "—";
  return "₹" + n.toLocaleString("en-IN");
}

/** Professional, restrained black-and-white renewal email. */
export function renewalEmailHtml(
  client: Client,
  policy: Policy,
  agentName: string
): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#0a0a0a;padding:24px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">AgentSaathi</span>
          </td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;">Policy Renewal Reminder</h1>
            <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#52525b;">
              Dear ${client.full_name}, this is a reminder that the following policy is due for renewal.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
              ${row("Insurance Company", policy.company)}
              ${row("Policy Type", policy.policy_type)}
              ${row("Policy Number", policy.policy_number)}
              ${row("Sum Insured", fmtMoney(policy.sum_insured))}
              ${row("Premium", fmtMoney(policy.premium))}
              ${row("Renewal Date", fmtDate(policy.renewal_date))}
            </table>
            <p style="margin:24px 0 0;font-size:14px;line-height:22px;color:#52525b;">
              Please reach out to renew on time and keep your coverage active.
            </p>
            <p style="margin:24px 0 0;font-size:14px;">Regards,<br/><strong>${agentName}</strong></p>
          </td></tr>
          <tr><td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 32px;">
            <span style="font-size:12px;color:#a1a1aa;">Sent via AgentSaathi · This is an automated reminder.</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function row(label: string, value: string | null): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;width:45%;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-weight:600;">${value || "—"}</td>
  </tr>`;
}

export async function sendRenewalEmail(opts: {
  to: string;
  client: Client;
  policy: Policy;
  agentName: string;
}): Promise<void> {
  const transport = getTransport();
  const fromName = process.env.SMTP_FROM_NAME || "AgentSaathi";
  await transport.sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: `Renewal reminder: ${opts.policy.policy_type || "your policy"} (${
      opts.policy.company || ""
    })`.trim(),
    html: renewalEmailHtml(opts.client, opts.policy, opts.agentName),
  });
}
