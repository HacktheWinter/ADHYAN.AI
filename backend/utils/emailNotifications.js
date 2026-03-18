import nodemailer from "nodemailer";

const APP_NAME = "ADHYAN.AI";
const SMTP_HOST = process.env.SMTP_HOST || "smtp-relay.brevo.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const BRAND_ACCENT = "#0ea5e9";
const BRAND_DARK = "#0f172a";
const BRAND_SOFT = "#e0f2fe";

const hasEmailConfig = () =>
  Boolean(process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SENDER_EMAIL);

let transporter;

const getTransporter = () => {
  if (!hasEmailConfig()) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
};

const formatDateTime = (value) => {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const normalizeRecipients = (students = []) =>
  students
    .filter((student) => student?.email)
    .map((student) => ({
      name: student.name || "Student",
      email: student.email,
    }));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildAbsoluteUrl = (baseUrl, path = "") => {
  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
};

const renderFactRows = (items = []) => {
  const validItems = items.filter((item) => item?.label && item?.value);
  if (validItems.length === 0) return "";

  return validItems
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding: 12px 0; color: #64748b; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">
            ${escapeHtml(label)}
          </td>
          <td style="padding: 12px 0; color: ${BRAND_DARK}; font-size: 15px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `
    )
    .join("");
};

const renderParagraphs = (paragraphs = []) =>
  paragraphs
    .filter(Boolean)
    .map(
      (paragraph) => `
        <p style="margin: 0 0 14px; color: #334155; font-size: 15px; line-height: 1.7;">
          ${escapeHtml(paragraph)}
        </p>
      `
    )
    .join("");

const buildEmailShell = ({
  preheader,
  eyebrow,
  title,
  intro,
  paragraphs = [],
  facts = [],
  ctaLabel,
  ctaUrl,
  secondaryLinkLabel,
  secondaryLinkUrl,
  footer,
  accent = BRAND_ACCENT,
  accentSoft = BRAND_SOFT,
}) => {
  const factRows = renderFactRows(facts);
  const buttonMarkup =
    ctaLabel && ctaUrl
      ? `
        <div style="margin-top: 28px;">
          <a
            href="${escapeHtml(ctaUrl)}"
            style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: ${accent}; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; letter-spacing: 0.01em;"
          >
            ${escapeHtml(ctaLabel)}
          </a>
        </div>
      `
      : "";

  const factsMarkup = factRows
    ? `
      <div style="margin-top: 28px; border-radius: 24px; background: #f8fafc; padding: 22px 24px; border: 1px solid #e2e8f0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
          ${factRows}
        </table>
      </div>
    `
    : "";

  const secondaryLinkMarkup =
    secondaryLinkLabel && secondaryLinkUrl
      ? `
        <div style="margin-top: 18px;">
          <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; line-height: 1.6;">
            ${escapeHtml(secondaryLinkLabel)}
          </p>
          <a
            href="${escapeHtml(secondaryLinkUrl)}"
            style="color: ${accent}; font-size: 13px; line-height: 1.7; word-break: break-all; text-decoration: underline;"
          >
            ${escapeHtml(secondaryLinkUrl)}
          </a>
        </div>
      `
      : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #edf4fb; font-family: Arial, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${escapeHtml(preheader || title)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, #edf4fb 0%, #f8fbff 100%);">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; border-collapse: collapse;">
                <tr>
                  <td style="padding-bottom: 18px;">
                    <div style="display: inline-block; border-radius: 999px; background: rgba(15, 23, 42, 0.06); color: #64748b; padding: 8px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase;">
                      ${escapeHtml(eyebrow || APP_NAME)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background: ${BRAND_DARK}; border-radius: 32px 32px 0 0; padding: 32px 36px; color: #ffffff;">
                    <div style="width: 56px; height: 56px; border-radius: 18px; background: rgba(14, 165, 233, 0.16); border: 1px solid rgba(125, 211, 252, 0.26); text-align: center; line-height: 56px; font-size: 26px; font-weight: 700; color: #7dd3fc;">
                      A
                    </div>
                    <h1 style="margin: 22px 0 10px; font-size: 32px; line-height: 1.2; font-weight: 800;">
                      ${escapeHtml(title)}
                    </h1>
                    <p style="margin: 0; color: #cbd5e1; font-size: 15px; line-height: 1.7;">
                      ${escapeHtml(intro)}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background: #ffffff; border-radius: 0 0 32px 32px; padding: 34px 36px 28px; box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);">
                    <div style="display: inline-block; border-radius: 999px; background: ${accentSoft}; color: ${accent}; padding: 9px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
                      ${escapeHtml(APP_NAME)}
                    </div>
                    <div style="margin-top: 20px;">
                      ${renderParagraphs(paragraphs)}
                    </div>
                    ${factsMarkup}
                    ${buttonMarkup}
                    ${secondaryLinkMarkup}
                    <div style="margin-top: 28px; padding-top: 22px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.7;">
                        ${escapeHtml(footer || `This email was sent by ${APP_NAME}.`)}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const buildActionText = ({ greetingName, lines = [], facts = [], ctaLabel, ctaUrl, footer }) => {
  const sections = [];

  if (greetingName) {
    sections.push(`Hi ${greetingName},`);
  }

  if (lines.length > 0) {
    sections.push(lines.join("\n"));
  }

  if (facts.length > 0) {
    sections.push(
      facts
        .filter((item) => item?.label && item?.value)
        .map(({ label, value }) => `${label}: ${value}`)
        .join("\n")
    );
  }

  if (ctaLabel && ctaUrl) {
    sections.push(`${ctaLabel}: ${ctaUrl}`);
  }

  if (footer) {
    sections.push(footer);
  }

  return sections.join("\n\n");
};

const sendMail = async ({ to, subject, text, html }) => {
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    console.warn(`[Email] Skipped (${subject}) - SMTP config missing.`);
    return { skipped: true };
  }

  try {
    const info = await activeTransporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to,
      subject,
      text,
      html,
    });
    return { messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed (${subject}) for ${to}:`, error.message);
    throw error;
  }
};

const sendBulkToStudents = async (students, buildMessage) => {
  const recipients = normalizeRecipients(students);
  if (recipients.length === 0) return { total: 0, sent: 0, failed: 0, skipped: 0 };

  if (!getTransporter()) {
    console.warn("[Email] Skipped bulk send - SMTP config missing.");
    return { total: recipients.length, sent: 0, failed: 0, skipped: recipients.length };
  }

  const settled = await Promise.allSettled(
    recipients.map(({ name, email }) => {
      const { subject, text, html } = buildMessage(name);
      return sendMail({ to: email, subject, text, html });
    })
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of settled) {
    if (result.status === "rejected") {
      failed += 1;
      continue;
    }

    if (result.value?.skipped) skipped += 1;
    else sent += 1;
  }

  return { total: recipients.length, sent, failed, skipped };
};

const getRoleBaseUrl = (role = "student") => {
  const teacherBaseUrl =
    process.env.TEACHER_URL ||
    process.env.TEACHER_FRONTEND_URL ||
    "https://adhyanai-teacher.onrender.com";
  const studentBaseUrl =
    process.env.STUDENT_URL ||
    process.env.STUDENT_FRONTEND_URL ||
    "https://adhyanai-student.onrender.com";
  const principalBaseUrl =
    process.env.PRINCIPAL_URL ||
    process.env.PRINCIPAL_FRONTEND_URL ||
    "https://adhyanai-principal.onrender.com";

  if (role === "teacher") return teacherBaseUrl;
  if (role === "principal") return principalBaseUrl;
  return studentBaseUrl;
};

export const sendWelcomeEmail = async ({ name, email, role }) => {
  if (!email) return;

  const loginUrl = buildAbsoluteUrl(getRoleBaseUrl(role), "login");
  const resolvedName = name || "there";
  const resolvedRole = role || "user";

  const subject = `Welcome to ${APP_NAME}`;
  const text = buildActionText({
    greetingName: resolvedName,
    lines: [
      `Welcome to ${APP_NAME}. Your ${resolvedRole} account is ready.`,
      "You can now access your workspace and continue with your academic operations.",
    ],
    facts: [
      { label: "Account Role", value: resolvedRole },
      { label: "Portal", value: loginUrl },
    ],
    ctaLabel: "Login to your account",
    ctaUrl: loginUrl,
    footer: `${APP_NAME} Team`,
  });

  const html = buildEmailShell({
    preheader: `Your ${resolvedRole} account is ready on ${APP_NAME}.`,
    eyebrow: "Account created",
    title: `Welcome to ${APP_NAME}`,
    intro: `Your ${resolvedRole} workspace has been activated successfully.`,
    paragraphs: [
      `Hi ${resolvedName},`,
      "Your account has been created successfully and is ready for sign-in.",
      "Use the button below to open your portal and continue with your classes, dashboards, and academic workflows.",
    ],
    facts: [
      { label: "Account role", value: resolvedRole },
      { label: "Portal", value: loginUrl },
    ],
    ctaLabel: "Login to your account",
    ctaUrl: loginUrl,
    footer: `Need help signing in? Contact your ${APP_NAME} administrator.`,
  });

  await sendMail({ to: email, subject, text, html });
};

export const sendPasswordResetEmail = async ({ name, email, role, resetUrl, expiresInMinutes }) => {
  if (!email || !resetUrl) return;

  const resolvedName = name || "there";
  const resolvedRole = role || "user";
  const subject = `Reset your ${APP_NAME} password`;
  const text = buildActionText({
    greetingName: resolvedName,
    lines: [
      `We received a request to reset the password for your ${resolvedRole} account.`,
      "Use the secure link below to choose a new password.",
    ],
    facts: [
      { label: "Account role", value: resolvedRole },
      { label: "Link expires in", value: `${expiresInMinutes} minutes` },
    ],
    ctaLabel: "Reset password",
    ctaUrl: resetUrl,
    footer: `If you did not request this, you can ignore this email. ${APP_NAME} Team`,
  });

  const html = buildEmailShell({
    preheader: `Reset your ${APP_NAME} password securely.`,
    eyebrow: "Password recovery",
    title: "Reset your password",
    intro: "A secure reset request was received for your account.",
    paragraphs: [
      `Hi ${resolvedName},`,
      `We received a password reset request for your ${resolvedRole} account.`,
      "Use the secure action below to set a new password.",
    ],
    facts: [
      { label: "Account role", value: resolvedRole },
      { label: "Link expires in", value: `${expiresInMinutes} minutes` },
    ],
    ctaLabel: "Reset password",
    ctaUrl: resetUrl,
    secondaryLinkLabel: "If the button does not open correctly, copy and open this secure link:",
    secondaryLinkUrl: resetUrl,
    footer:
      "If you did not request this reset, no action is required and you can safely ignore this email.",
  });

  return sendMail({ to: email, subject, text, html });
};

export const sendAssignmentPublishedEmails = async ({
  students,
  className,
  assignmentTitle,
  dueDate,
  teacherName,
}) => {
  const studentPortalUrl = getRoleBaseUrl("student");
  return sendBulkToStudents(students, (studentName) => {
    const subject = `New assignment in ${className || "your class"}`;
    const dueDateText = formatDateTime(dueDate);
    const text = buildActionText({
      greetingName: studentName,
      lines: [
        `${teacherName || "Your teacher"} published a new assignment for your class.`,
        "Review the task and submit it before the deadline.",
      ],
      facts: [
        { label: "Class", value: className || "N/A" },
        { label: "Assignment", value: assignmentTitle || "New Assignment" },
        { label: "Due date", value: dueDateText },
      ],
      ctaLabel: "Open student portal",
      ctaUrl: studentPortalUrl,
      footer: `${APP_NAME} Team`,
    });

    const html = buildEmailShell({
      preheader: `A new assignment is available in ${className || "your class"}.`,
      eyebrow: "Assignment update",
      title: "New assignment published",
      intro: `${teacherName || "Your teacher"} has assigned new work in your class.`,
      paragraphs: [
        `Hi ${studentName},`,
        "A new assignment has been published and is now available in your student workspace.",
        "Open the portal to review the instructions, due date, and submission requirements.",
      ],
      facts: [
        { label: "Class", value: className || "N/A" },
        { label: "Assignment", value: assignmentTitle || "New Assignment" },
        { label: "Due date", value: dueDateText },
      ],
      ctaLabel: "Open student portal",
      ctaUrl: studentPortalUrl,
      footer: "Please review the assignment and submit it before the deadline.",
    });

    return { subject, text, html };
  });
};

export const sendNoteUploadedEmails = async ({
  students,
  className,
  noteTitle,
  teacherName,
}) => {
  const studentPortalUrl = getRoleBaseUrl("student");
  return sendBulkToStudents(students, (studentName) => {
    const subject = `New note uploaded in ${className || "your class"}`;
    const text = buildActionText({
      greetingName: studentName,
      lines: [
        `${teacherName || "Your teacher"} uploaded a new note for your class.`,
        "Open the student portal to review the material.",
      ],
      facts: [
        { label: "Class", value: className || "N/A" },
        { label: "Note", value: noteTitle || "New Note" },
      ],
      ctaLabel: "View notes",
      ctaUrl: studentPortalUrl,
      footer: `${APP_NAME} Team`,
    });

    const html = buildEmailShell({
      preheader: `A new note is ready in ${className || "your class"}.`,
      eyebrow: "Notes update",
      title: "New note uploaded",
      intro: `${teacherName || "Your teacher"} shared fresh study material with your class.`,
      paragraphs: [
        `Hi ${studentName},`,
        "A new note has been uploaded and is now available in your class workspace.",
        "Open the portal to read the material and stay up to date with the class.",
      ],
      facts: [
        { label: "Class", value: className || "N/A" },
        { label: "Note", value: noteTitle || "New Note" },
      ],
      ctaLabel: "View notes",
      ctaUrl: studentPortalUrl,
      footer: "Log in to your student dashboard to access the uploaded material.",
    });

    return { subject, text, html };
  });
};

export const sendLiveClassStartedEmails = async ({
  students,
  className,
  teacherName,
}) => {
  const studentPortalUrl = getRoleBaseUrl("student");
  const startedAt = formatDateTime(new Date());
  return sendBulkToStudents(students, (studentName) => {
    const subject = `Live class started: ${className || "your class"}`;
    const text = buildActionText({
      greetingName: studentName,
      lines: [
        `${teacherName || "Your teacher"} has started a live class.`,
        "Join from your student dashboard while the session is active.",
      ],
      facts: [
        { label: "Class", value: className || "N/A" },
        { label: "Started at", value: startedAt },
      ],
      ctaLabel: "Open live class portal",
      ctaUrl: studentPortalUrl,
      footer: `${APP_NAME} Team`,
    });

    const html = buildEmailShell({
      preheader: `Your live class for ${className || "your class"} has started.`,
      eyebrow: "Live session",
      title: "Live class started",
      intro: `${teacherName || "Your teacher"} has started a live session for your class.`,
      paragraphs: [
        `Hi ${studentName},`,
        "Your class is now live. Open the student portal to join the active session.",
        "Join promptly to avoid missing attendance or the start of the lecture.",
      ],
      facts: [
        { label: "Class", value: className || "N/A" },
        { label: "Started at", value: startedAt },
      ],
      ctaLabel: "Open live class portal",
      ctaUrl: studentPortalUrl,
      footer: "Join from your student dashboard while the live session is active.",
      accent: "#10b981",
      accentSoft: "#d1fae5",
    });

    return { subject, text, html };
  });
};
