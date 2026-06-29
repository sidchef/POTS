import nodemailer from "nodemailer";

let transporter = null;

export const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || "smtp.gmail.com",
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

// Verify SMTP connection on startup
export const verifyEmailConnection = async () => {
  try {
    const t = getTransporter();
    await t.verify();
    console.log(" Email server connected");
  } catch (err) {
    console.warn("⚠ Email server connection failed:", err.message, "(Email notifications will be skipped)");
  }
};
