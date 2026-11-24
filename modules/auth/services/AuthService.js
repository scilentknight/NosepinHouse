import crypto from "crypto";
import bcrypt from "bcryptjs";
import AppError from "@/core/errors/AppError";
import { registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/schemas/auth";
import { sendMailBestEffort, otpEmail, passwordResetEmail } from "@/lib/mail";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default class AuthService {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async register(body) {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { name, email, phone, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.authRepository.findByEmail(normalizedEmail);

    const verificationCode = generateOTP();
    const verificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (existing) {
      if (existing.emailVerified) {
        throw new AppError("An account with this email already exists.", 409);
      } else {
        await this.authRepository.updateUserOtp(existing.id, verificationCode, verificationCodeExpiresAt);
        await sendMailBestEffort({ to: existing.email, ...otpEmail(verificationCode) });
        return {
          pendingVerification: true,
          message: "A new verification code has been sent to your email.",
          data: { email: existing.email },
        };
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.authRepository.createUser({
      name,
      email: normalizedEmail,
      phone: phone || null,
      passwordHash,
      emailVerified: null,
      verificationCode,
      verificationCodeExpiresAt,
    });

    await sendMailBestEffort({ to: user.email, ...otpEmail(verificationCode) });
    return {
      pendingVerification: true,
      message: "Account created. Please verify your email.",
      data: { email: user.email },
    };
  }

  async verifyOtp(body) {
    const email = String(body.email || "").toLowerCase().trim();
    const otp = String(body.otp || "").trim();

    if (!email || !otp) {
      throw new AppError("Email and verification code are required.", 400);
    }

    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      throw new AppError("Account not found.", 404);
    }
    if (user.emailVerified) {
      throw new AppError("This account has already been verified.", 400);
    }
    if (!user.verificationCode || !user.verificationCodeExpiresAt) {
      throw new AppError("No verification code found. Please request a new code.", 400);
    }
    if (new Date() > user.verificationCodeExpiresAt) {
      throw new AppError("Your verification code has expired. Please request a new code.", 400);
    }
    if (otp !== user.verificationCode) {
      throw new AppError("Invalid verification code.", 400);
    }

    await this.authRepository.markEmailVerified(user.id);
    return { message: "Email verified successfully." };
  }

  async resendOtp(body) {
    const email = String(body.email || "").toLowerCase().trim();
    if (!email) {
      throw new AppError("Email is required.", 400);
    }

    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      throw new AppError("Account not found.", 404);
    }
    if (user.emailVerified) {
      throw new AppError("This account has already been verified.", 400);
    }

    const newOtp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.authRepository.updateUserOtp(user.id, newOtp, expiresAt);
    await sendMailBestEffort({ to: user.email, ...otpEmail(newOtp) });

    return { message: "A new verification code has been sent to your email." };
  }

  async forgotPassword(body, origin) {
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await this.authRepository.findByEmail(email);

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await this.authRepository.createPasswordResetToken(user.id, tokenHash, expiresAt);
      const baseUrl = (process.env.NEXTAUTH_URL ?? origin).replace(/\/$/, "");
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
      await sendMailBestEffort({ to: user.email, ...passwordResetEmail(resetUrl) });
    }

    return { message: "If an account exists for that email, we've sent a password reset link." };
  }

  async resetPassword(body) {
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
    const record = await this.authRepository.findResetToken(tokenHash);

    if (!record || record.expiresAt < new Date()) {
      throw new AppError("This reset link is invalid or has expired", 400);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await this.authRepository.resetPassword(record.userId, passwordHash);

    return { message: "Password updated — you can now log in" };
  }
}
