const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const {
    EMAIL_SERVICE,
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_SECURE,
    EMAIL_USER,
    EMAIL_PASS
  } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('[emailService] 이메일 환경 변수가 설정되지 않았어요.');
    return null;
  }

  if (EMAIL_SERVICE) {
    transporter = nodemailer.createTransport({
      service: EMAIL_SERVICE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
  } else {
    const port = EMAIL_PORT ? Number(EMAIL_PORT) : 587;
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port,
      secure: EMAIL_SECURE ? EMAIL_SECURE === 'true' : port === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
  }

  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[emailService] 메일을 보낼 수 없어 콘솔에만 남깁니다:', { to, subject });
    return false;
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  await mailer.sendMail({
    from,
    to,
    subject,
    html,
    text
  });
  return true;
}

module.exports = {
  sendMail
};
