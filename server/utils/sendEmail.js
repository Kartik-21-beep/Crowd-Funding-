import nodemailer from "nodemailer";

let transporter = null;

const createTransporter = () => {
  if (transporter) return transporter;

  // Prefer app-password style config via env
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  // Fallback to Gmail via app password
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    return transporter;
  }

  // Fallback to EMAIL_USER and EMAIL_PASS (old format)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    return transporter;
  }

  // Return null if no config - don't throw error at module load
  return null;
};

const sendEmail = async (to, subject, text, html = null) => {
  const emailTransporter = createTransporter();
  
  if (!emailTransporter) {
    throw new Error("Email not configured. Please set SMTP or Gmail credentials in .env");
  }

  const info = await emailTransporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.GMAIL_USER || process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  });
  return info;
};

export default sendEmail;
