import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const maxDuration = 60;

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

/** POST /api/email/send - Send a custom email with attachments */
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

  const formData = await request.formData();
  const to = formData.get("to") as string;
  const cc = formData.get("cc") as string | null;
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;
  const attachmentFiles = formData.getAll("attachments") as File[];

  if (!to?.trim() || !subject?.trim() || !body?.trim()) {
    return NextResponse.json(
      { error: "To, Subject, and Body are required" },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  const fromName = agent.full_name || "AgentSaathi";
  const fromEmail = process.env.SMTP_USER;

  try {
    const transport = getTransport();

    // Process attachments
    const attachments = [];
    for (const file of attachmentFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        filename: file.name,
        content: buffer,
        contentType: file.type,
      });
    }

    // Build professional HTML email
    const html = `<!doctype html>
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
          <div style="font-size:15px;line-height:26px;color:#333333;white-space:pre-wrap;">${body
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br/>")}</div>
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

    const mailOptions: any = {
      from: `"${fromName}" <${fromEmail}>`,
      to: to.trim(),
      subject: subject.trim(),
      text: body.trim(),
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
      // Anti-spam headers
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "high",
        "X-Mailer": "AgentSaathi",
        "List-Unsubscribe": `<mailto:${fromEmail}?subject=unsubscribe>`,
        "Reply-To": fromEmail,
      },
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
