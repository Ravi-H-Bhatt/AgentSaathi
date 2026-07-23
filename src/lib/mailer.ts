import "server-only";

import nodemailer from "nodemailer";
import { WELCOME_EMAIL } from "@/lib/welcomeEmail";

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

/** Wrap a plain-text body in the branded AgentSaathi HTML shell. */
function renderHtml(body: string, fromName: string): string {
  const safe = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#000000;padding:24px 40px;">
          <span style="color:#ffffff;font-size:20px;font-weight:600;letter-spacing:0.5px;">AgentSaathi</span>
        </td></tr>
        <tr><td style="padding:40px;">
          <div style="font-size:15px;line-height:26px;color:#333333;white-space:pre-wrap;">${safe}</div>
          <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e0e0e0;">
            <p style="margin:0;font-size:15px;color:#333333;">Best regards,</p>
            <p style="margin:8px 0 0;font-size:15px;font-weight:600;color:#000000;">${fromName}</p>
          </div>
        </td></tr>
        <tr><td style="background:#fafafa;border-top:1px solid #e0e0e0;padding:20px 40px;">
          <p style="margin:0;font-size:13px;color:#999999;">This email was sent via AgentSaathi</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send the onboarding email to a newly approved agent/colleague.
 * Best-effort: never throws, so it can't block the approval flow.
 * SMTP is not configured in some environments — in that case it no-ops.
 */
export async function sendWelcomeEmail(to: string): Promise<void> {
  const target = (to || "").trim();
  if (!target) return;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const fromName = "The AgentSaathi Team";
  const fromEmail = process.env.SMTP_USER;

  try {
    const transport = getTransport();
    await transport.sendMail({
      from: `"AgentSaathi" <${fromEmail}>`,
      to: target,
      subject: WELCOME_EMAIL.subject,
      text: `${WELCOME_EMAIL.body}\n\nBest regards,\n${fromName}`,
      html: renderHtml(WELCOME_EMAIL.body, fromName),
      replyTo: fromEmail,
      headers: {
        "X-Mailer": "AgentSaathi",
        "List-Unsubscribe": `<mailto:${fromEmail}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } catch (e) {
    console.error("[sendWelcomeEmail] failed:", e);
  }
}
