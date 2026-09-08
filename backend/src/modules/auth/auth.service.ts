import { prisma } from "../../common/prisma";
import { AppError } from "../../common/errors/AppError";
import { hashPassword, verifyPassword } from "../../common/utils/password";
import { hashToken } from "../../common/utils/hashToken";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../common/utils/jwt";
import { env } from "../../config/env";
import { RegisterInput, LoginInput } from "./auth.dto";
import ms from "../../common/utils/ms";

function toSafeUser(user: { id: string; name: string; email: string; role: string; createdAt: Date }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

async function issueTokens(userId: string, role: "MEMBER" | "MANAGER") {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = signRefreshToken({ sub: userId });

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + ms(env.jwtRefreshExpiresIn)),
    },
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw AppError.conflict("An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: input.role },
    });

    const tokens = await issueTokens(user.id, user.role);
    return { user: toSafeUser(user), ...tokens };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const tokens = await issueTokens(user.id, user.role);
    return { user: toSafeUser(user), ...tokens };
  },

  async refresh(refreshTokenRaw: string) {
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshTokenRaw);
    } catch {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }

    const tokenHash = hashToken(refreshTokenRaw);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw AppError.unauthorized("Refresh token has been revoked or expired");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw AppError.unauthorized("User no longer exists");
    }

    // Rotate: revoke the old refresh token and issue a brand new pair. This limits how long a
    // leaked refresh token stays useful, and lets us detect reuse of a revoked token as a signal
    // of theft (not implemented as an alert here, but the data model supports adding one).
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const tokens = await issueTokens(user.id, user.role);
    return { user: toSafeUser(user), ...tokens };
  },

  async logout(refreshTokenRaw: string) {
    const tokenHash = hashToken(refreshTokenRaw);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
