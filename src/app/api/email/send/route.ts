import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

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

/** POST /api/email/send - Send a custom email */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!permissionsFor(agent).email) {
    return NextResponse.json(
      { error: "You don't have permission to send emails." },
      { status: 403 }
    );
  }

  const { to, cc, subject, body, agentName } = await request.json();

  if (!to?.trim() || !subject?.trim() || !body?.trim()) {
    return NextResponse.json(
      { error: "To, Subject, and Body are required" },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  const fromName = process.env.SMTP_FROM_NAME || "AgentSaathi";
  const senderName = agentName?.trim() || agent.full_name || agent.email;

  try {
    const transport = getTransport();
    
    // Build email with professional template
    const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#0a0a0a;padding:24px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">AgentSaathi</span>
          </td></tr>
          <tr><td style="padding:32px;">
            <div style="font-size:14px;line-height:24px;white-space:pre-wrap;">${body
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/\n/g, "<br/>")}</div>
            <p style="margin:24px 0 0;font-size:14px;">Regards,<br/><strong>${senderName}</strong></p>
          </td></tr>
          <tr><td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 32px;">
            <span style="font-size:12px;color:#a1a1aa;">Sent via AgentSaathi</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

    const mailOptions: any = {
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      to: to.trim(),
      subject: subject.trim(),
      text: body.trim(),
      html,
    };

    if (cc?.trim()) {
      mailOptions.cc = cc.trim();
    }

    await transport.sendMail(mailOptions);

    // Log the email
    await db.from("email_log").insert({
      agent_id: ownerId,
      to_email: to.trim(),
      subject: subject.trim(),
      status: "sent",
    });

    await logActivity(agent, "send_email", `Custom email to ${to.trim()}`);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    
    // Log the failure
    await db.from("email_log").insert({
      agent_id: ownerId,
      to_email: to.trim(),
      subject: subject.trim(),
      status: "failed",
      error: msg,
    });

    return NextResponse.json(
      { error: "Failed to send email: " + msg },
      { status: 500 }
    );
  }
}
