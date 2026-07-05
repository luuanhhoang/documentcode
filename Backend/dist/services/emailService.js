import nodemailer from "nodemailer";
// Cấu hình SMTP qua biến môi trường Backend/.env. Với Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465,
// SMTP_USER=email, SMTP_PASS=App Password (mật khẩu ứng dụng 16 ký tự, KHÔNG phải mật khẩu Gmail thường).
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? "587");
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM ?? (user ? `Cosmic Love <${user}>` : "Cosmic Love");
const transporter = host && user && pass
    ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
    : null;
export const isEmailConfigured = () => Boolean(transporter);
const otpEmailHtml = (otp) => `
  <div style="margin:0;padding:24px;background:#0b0e1f;font-family:'Segoe UI',Roboto,Arial,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:linear-gradient(160deg,#1a1430,#0e1024);border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden">
      <div style="padding:26px 28px;background:radial-gradient(120% 90% at 50% 0%,rgba(255,138,196,.22),transparent 70%)">
        <p style="margin:0;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#c9bfe6">Cosmic Love 💞</p>
        <h1 style="margin:8px 0 0;font-size:22px;color:#fff">Mã đặt lại mật khẩu</h1>
      </div>
      <div style="padding:8px 28px 28px;color:#dccff2;font-size:14px;line-height:1.6">
        <p>Bạn (hoặc người ấy) vừa yêu cầu đặt lại mật khẩu. Nhập mã dưới đây để tiếp tục — mã có hiệu lực <b>15 phút</b>:</p>
        <div style="margin:18px 0;text-align:center">
          <span style="display:inline-block;padding:14px 26px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,158,207,.4);font-size:30px;font-weight:800;letter-spacing:.32em;color:#ff9ecf">${otp}</span>
        </div>
        <p style="color:#9c93b6;font-size:12.5px">Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu sẽ không thay đổi.</p>
      </div>
    </div>
  </div>
`;
// Trả về true nếu đã gửi email thật; false nếu chưa cấu hình SMTP (chế độ dev sẽ hiển thị mã trên màn hình).
export const sendOtpEmail = async (to, otp) => {
    if (!transporter) {
        return false;
    }
    try {
        await transporter.sendMail({
            from,
            to,
            subject: "Mã đặt lại mật khẩu — Cosmic Love 💞",
            text: `Mã đặt lại mật khẩu của bạn là ${otp} (hiệu lực 15 phút).`,
            html: otpEmailHtml(otp)
        });
        return true;
    }
    catch (error) {
        console.error("[email] Gửi OTP thất bại:", error);
        return false;
    }
};
