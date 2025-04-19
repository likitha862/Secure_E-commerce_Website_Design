
import { createTransport } from "nodemailer";

// 📩 Send OTP email
const sendMail = async (email, subject, data) => {
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.Gmail,
      pass: process.env.Password,
    },
  });

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Verify Your Account</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background-color: #fafafa;
      }
      .card {
        background: #fff;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.1);
        text-align: center;
      }
      h1 {
        color: #8a4baf;
        margin-bottom: 15px;
      }
      .otp {
        font-size: 32px;
        color: #5a2d82;
        font-weight: bold;
        margin: 20px 0;
      }
      p {
        color: #444;
        font-size: 16px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>OTP Verification</h1>
      <p>Hi ${data.name},</p>
      <p>Your one-time password for account verification is:</p>
      <div class="otp">${data.otp}</div>
      <p>This code will expire shortly. Please do not share it.</p>
    </div>
  </body>
  </html>
  `;

  await transport.sendMail({
    from: process.env.Gmail,
    to: email,
    subject,
    html,
  });
};

export default sendMail;

// 🔐 Send password reset email
export const sendForgotMail = async (subject, data) => {
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.Gmail,
      pass: process.env.Password,
    },
  });

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Password Reset Request</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f3f3f3;
        margin: 0;
        padding: 0;
      }
      .container {
        background: #ffffff;
        padding: 30px;
        max-width: 600px;
        margin: 40px auto;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      h1 {
        color: #4b2e83;
        margin-bottom: 15px;
      }
      p {
        color: #333;
        line-height: 1.5;
      }
      a.button {
        display: inline-block;
        margin: 20px 0;
        padding: 12px 24px;
        background: #8a4baf;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
      }
      .footer {
        margin-top: 30px;
        text-align: center;
        color: #999;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Reset Your Password</h1>
      <p>Hello,</p>
      <p>You’ve requested to reset your password. Click the button below to proceed:</p>
      <a href="${process.env.frontendurl}/reset-password/${data.token}" class="button">Reset Password</a>
      <p>If you didn’t make this request, please ignore this email.</p>
      <div class="footer">
        <p>— The E-Learning Team</p>
      </div>
    </div>
  </body>
  </html>
  `;

  await transport.sendMail({
    from: process.env.Gmail,
    to: data.email,
    subject,
    html,
  });
};
