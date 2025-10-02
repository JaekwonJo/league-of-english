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
    const error = new Error('이메일 발송 설정을 찾을 수 없어 메일을 보내지 못했어요. EMAIL_USER와 EMAIL_PASS를 점검해 주세요.');
    error.code = 'EMAIL_TRANSPORT_UNAVAILABLE';
    throw error;
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  try {
    const info = await mailer.sendMail({
      from,
      to,
      subject,
      html,
      text
    });
    console.info('[emailService] 메일 발송 성공:', {
      to,
      subject,
      messageId: info?.messageId || null
    });
    return info;
  } catch (error) {
    console.error('[emailService] 메일 발송 실패:', error);
    const friendly = new Error('메일 발송 중 오류가 발생했어요. 이메일 환경 변수를 다시 확인해 주세요.');
    friendly.code = 'EMAIL_SEND_FAILED';
    friendly.cause = error;
    throw friendly;
  }
}

module.exports = {
  sendMail
};
