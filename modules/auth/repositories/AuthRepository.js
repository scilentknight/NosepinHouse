import { prisma } from "@/lib/prisma";

export default class AuthRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findByEmail(email) {
    return this.db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async createUser(data) {
    return this.db.user.create({
      data,
    });
  }

  async updateUserOtp(id, verificationCode, verificationCodeExpiresAt) {
    return this.db.user.update({
      where: { id: Number(id) },
      data: {
        verificationCode,
        verificationCodeExpiresAt,
      },
    });
  }

  async markEmailVerified(id) {
    return this.db.user.update({
      where: { id: Number(id) },
      data: {
        emailVerified: new Date(),
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    });
  }

  async createPasswordResetToken(userId, tokenHash, expiresAt) {
    return this.db.$transaction([
      this.db.passwordResetToken.deleteMany({ where: { userId: Number(userId) } }),
      this.db.passwordResetToken.create({
        data: {
          userId: Number(userId),
          tokenHash,
          expiresAt,
        },
      }),
    ]);
  }

  async findResetToken(tokenHash) {
    return this.db.passwordResetToken.findUnique({
      where: { tokenHash },
    });
  }

  async resetPassword(userId, passwordHash) {
    return this.db.$transaction([
      this.db.user.update({
        where: { id: Number(userId) },
        data: { passwordHash },
      }),
      this.db.passwordResetToken.deleteMany({
        where: { userId: Number(userId) },
      }),
    ]);
  }
}
