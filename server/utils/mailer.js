import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
    secure: false, 
});

export const sendEmail = async (to, subject, html) => {
    try {
      console.log(`Attempting to send email to ${to} with subject: ${subject}`);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"AI SaanKa" <no-reply@aisaanka.com>',
        to,
        subject,
        html,
      };
  
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      console.log("Mailtrap preview URL:", nodemailer.getTestMessageUrl(info));
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  };

  
export const sendOtpEmail = (email, otp) => {
    const mailOptions = {
        from: '"Aisaanka Team" <no-reply@aisaanka.co>',
        to: email,
        subject: "Verify Your Email - Aisaanka OTP Code",
        html: `
        <div style="max-width: 600px; margin: auto; padding: 20px; border-radius: 8px; background-color: #f9fafc; font-family: Arial, sans-serif; text-align: center; border: 1px solid #ddd;">
            <div style="background-color: #0b617e; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #fff; margin: 0;">Aisaanka</h1>
            </div>
            <div style="padding: 20px;">
                <h2 style="color: #0b617e; font-size: 22px; margin-bottom: 10px;">Your OTP Code</h2>
                <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                    Use the code below to verify your email and activate your account.
                </p>
                <div style="font-size: 32px; font-weight: bold; padding: 15px; background-color: #e6f4f1; color: #0b617e; display: inline-block; border-radius: 6px;">
                    ${otp}
                </div>
                <p style="color: #555; font-size: 14px; margin-top: 20px;">
                    This OTP is valid for <strong>1 hour</strong>. If you did not request this, please ignore this email.
                </p>
                <hr style="border: none; height: 1px; background-color: #ddd; margin: 20px 0;">
                <p style="color: #777; font-size: 13px;">
                    If you need any help, contact us at 
                    <a href="mailto:support@aisaanka.co" style="color: #0b617e; text-decoration: none;">support@aisaanka.co</a>.
                </p>
            </div>
            <div style="background-color: #0b617e; padding: 10px; border-radius: 0 0 8px 8px; text-align: center;">
                <p style="color: #fff; font-size: 12px; margin: 0;">Aisaanka © 2024 - All rights reserved.</p>
            </div>
        </div>
        `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("❌ Error sending email:", error);
        } else {
            console.log("✅ Email sent:", info.response);
        }
    });
};

export const sendPasswordResetEmail = async (email, resetUrl) => {
    const subject = "Password Reset Request";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>You requested a password reset. Click the button below to create a new password:</p>
        <div style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #0b617e; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px;">Reset Password</a>
        </div>
        <p>If you prefer, you can also copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      </div>
    `;
  
    return sendEmail(email, subject, html);
  };