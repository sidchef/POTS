import { getTransporter } from "../config/email.js";

const FROM = process.env.SMTP_FROM || "POTS System <noreply@pots.com>";

// ─── Base HTML Template ────────────────────────────────────────────────────────
const htmlWrapper = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #4f46e5, #6366f1); border-radius: 12px 12px 0 0; padding: 28px 32px; text-align: center; }
    .header-logo { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .header-sub { color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 4px; }
    .body { background: #1e293b; border-radius: 0 0 12px 12px; padding: 32px; }
    .title { color: #f1f5f9; font-size: 20px; font-weight: 700; margin-bottom: 12px; }
    .text { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 12px; }
    .info-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 20px 0; width: 100%; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table tr { border-bottom: 1px solid #1e293b; }
    .info-table tr:last-child { border-bottom: none; }
    .info-table td { padding: 8px 4px; vertical-align: middle; }
    .info-label { color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; width: 38%; }
    .info-value { color: #e2e8f0; font-size: 13px; font-weight: 500; text-align: right; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .badge-submitted  { background: #1d4ed8; color: #bfdbfe; }
    .badge-approved   { background: #166534; color: #bbf7d0; }
    .badge-rejected   { background: #991b1b; color: #fecaca; }
    .badge-pending    { background: #92400e; color: #fde68a; }
    .btn { display: block; text-align: center; margin: 24px auto 0; padding: 12px 32px; background: #4f46e5; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; width: fit-content; }
    .footer { text-align: center; color: #475569; font-size: 11px; margin-top: 24px; line-height: 1.8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">🛡 POTS</div>
      <div class="header-sub">Project Oversight & Transparency System</div>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      This is an automated message from POTS. Do not reply to this email.<br>
      © ${new Date().getFullYear()} POTS — Internal Use Only
    </div>
  </div>
</body>
</html>`;

// ─── Send raw email (low-level) ────────────────────────────────────────────────
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[Email] SMTP credentials not configured. Skipping email to:", to);
    return false;
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: FROM,
      to,
      subject,
      text: text || subject,
      html,
    });
    return true;
  } catch (err) {
    // Never crash the main flow due to email failure
    console.error("[Email] Failed to send to", to, "—", err.message);
    return false;
  }
};

// ─── Generic notification email ───────────────────────────────────────────────
export const sendNotificationEmail = async ({ toEmail, toName, title, message }) => {
  const html = htmlWrapper(title, `
    <div class="title">${title}</div>
    <p class="text">Hello ${toName || "Team"},</p>
    <p class="text">${message}</p>
    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}" class="btn">Open POTS Dashboard</a>
  `);

  return sendEmail({ to: toEmail, subject: `[POTS] ${title}`, html });
};

// ─── BRM Submitted — notify approvers ────────────────────────────────────────
export const sendBrmSubmittedEmail = async ({ approvers, brmNumber, brmTitle, teamName, priority, dueDate, submittedByName }) => {
  for (const approver of approvers) {
    // Determine the correct dashboard link based on the user's role
    let dashboardRoute = "/dashboard";
    if (approver.role === "HEAD_FUNCTIONAL") dashboardRoute = "/hf";
    if (approver.role === "HEAD_TECHNOLOGY") dashboardRoute = "/ht";
    const html = htmlWrapper("BRM Pending Your Approval", `
      <div class="title">BRM Requires Your Review</div>
      <p class="text">A Business Requirement Model has been submitted and is awaiting your approval.</p>
      <div class="info-box">
        <table class="info-table">
          <tr><td class="info-label">BRM Number</td><td class="info-value">${brmNumber}</td></tr>
          <tr><td class="info-label">Title</td><td class="info-value">${brmTitle}</td></tr>
          <tr><td class="info-label">Team</td><td class="info-value">${teamName}</td></tr>
          <tr><td class="info-label">Priority</td><td class="info-value">${priority || "Not set"}</td></tr>
          <tr><td class="info-label">Submitted By</td><td class="info-value">${submittedByName}</td></tr>
          <tr><td class="info-label">SLA Due</td><td class="info-value">${new Date(dueDate).toLocaleString()}</td></tr>
          <tr><td class="info-label">Status</td><td class="info-value"><span class="badge badge-submitted">SUBMITTED</span></td></tr>
        </table>
      </div>
      <p class="text">Please log in to POTS and review this BRM within the SLA window.</p>
      <a href="${process.env.FRONTEND_URL} class="btn">Review BRM Now</a>
    `);
    await sendEmail({
      to: approver.email,
      subject: `[POTS] Action Required: BRM ${brmNumber} Pending Your Approval`,
      html,
    });
  }
};

// ─── BRM Rejected — notify PL ─────────────────────────────────────────────────
export const sendBrmRejectedEmail = async ({ plEmail, plName, brmNumber, brmTitle, rejectedBy, reason }) => {
  const html = htmlWrapper("BRM Rejected", `
    <div class="title">Your BRM Has Been Rejected</div>
    <p class="text">Hello ${plName},</p>
    <p class="text">Unfortunately, your Business Requirement Model has been rejected by the approval committee.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">BRM Number</span><span class="info-value">${brmNumber}</span></div>
      <div class="info-row"><span class="info-label">Title</span><span class="info-value">${brmTitle}</span></div>
      <div class="info-row"><span class="info-label">Rejected By</span><span class="info-value">${rejectedBy}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-rejected">REJECTED</span></span></div>
    </div>
    <p class="text"><strong>Reason:</strong> ${reason || "No reason provided."}</p>
    <p class="text">Please correct the BRM based on the feedback and resubmit.</p>
    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/pl" class="btn">Correct & Resubmit</a>
  `);

  return sendEmail({
    to: plEmail,
    subject: `[POTS] BRM ${brmNumber} Has Been Rejected`,
    html,
  });
};

// ─── BRM Approved — notify PL ─────────────────────────────────────────────────
export const sendBrmApprovedEmail = async ({ plEmail, plName, brmNumber, brmTitle, teamName }) => {
  const html = htmlWrapper("BRM Approved! 🎉", `
    <div class="title">Your BRM Has Been Fully Approved!</div>
    <p class="text">Hello ${plName},</p>
    <p class="text">Congratulations! Your Business Requirement Model has been approved by all committee members (HF + HT).</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">BRM Number</span><span class="info-value">${brmNumber}</span></div>
      <div class="info-row"><span class="info-label">Title</span><span class="info-value">${brmTitle}</span></div>
      <div class="info-row"><span class="info-label">Team</span><span class="info-value">${teamName}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-approved">APPROVED</span></span></div>
    </div>
    <p class="text">You can now proceed to assign team members and begin the development process.</p>
    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/pl" class="btn">Go to Dashboard</a>
  `);

  return sendEmail({
    to: plEmail,
    subject: `[POTS] 🎉 BRM ${brmNumber} Approved!`,
    html,
  });
};

// ─── Welcome email for new users ──────────────────────────────────────────────
export const sendWelcomeEmail = async ({ toEmail, firstName, employeeId, role, tempPassword }) => {
  const html = htmlWrapper("Welcome to POTS", `
    <div class="title">Welcome to POTS, ${firstName}!</div>
    <p class="text">Your account has been created. Here are your login credentials:</p>
    <div class="info-box">
      <table class="info-table">
    <tr><td class="info-label">Employee ID</td><td class="info-value">${employeeId}</td></tr>
    <tr><td class="info-label">Email</td><td class="info-value">${toEmail}</td></tr>
    <tr><td class="info-label">Password</td><td class="info-value">${tempPassword}</td></tr>
    <tr><td class="info-label">Role</td><td class="info-value">${role}</td></tr>
  </table>
    </div>
    <p class="text" style="color:#f59e0b;">⚠ Please change your password after your first login.</p>
    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login" class="btn">Login to POTS</a>
  `);

  return sendEmail({
    to: toEmail,
    subject: `[POTS] Welcome! Your account has been created`,
    html,
  });
};
