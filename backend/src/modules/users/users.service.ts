import { Role } from "@prisma/client";
import { prisma } from "../../common/prisma";
import { AppError } from "../../common/errors/AppError";
import { hashPassword } from "../../common/utils/password";
import { paginated, PaginationParams } from "../../common/utils/pagination";
import { InviteUserInput } from "./users.dto";

function toSafeUser(user: { id: string; name: string; email: string; role: Role; createdAt: Date }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

export const usersService = {
  async list(params: PaginationParams, filters: { role?: Role; search?: string }) {
    const where = {
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" as const } },
              { email: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { name: "asc" },
        skip: params.skip,
        take: params.take,
      }),
      prisma.user.count({ where }),
    ]);

    return paginated(users.map(toSafeUser), totalCount, params);
  },

  async getById(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");
    return toSafeUser(user);
  },

  // Backs the "Team member profile page (manager view)" - full history + basic stats in one call.
  async getProfileWithStats(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");

    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
      include: { project: true, currentVersion: true },
    });

    const statusCounts = reports.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      user: toSafeUser(user),
      stats: {
        totalReports: reports.length,
        byStatus: statusCounts,
      },
      reports: reports.map((r) => ({
        id: r.id,
        weekStart: r.weekStart,
        weekEnd: r.weekEnd,
        status: r.status,
        project: r.project ? { id: r.project.id, name: r.project.name } : null,
        updatedAt: r.updatedAt,
      })),
    };
  },

  async invite(input: InviteUserInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw AppError.conflict("An account with this email already exists");

    const passwordHash = await hashPassword(input.temporaryPassword);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, role: input.role, passwordHash },
    });
    return toSafeUser(user);
  },

  async updateRole(userId: string, role: Role) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");

    const updated = await prisma.user.update({ where: { id: userId }, data: { role } });
    return toSafeUser(updated);
  },

  async remove(userId: string, requestingUserId: string) {
    if (userId === requestingUserId) {
      throw AppError.badRequest("You cannot remove your own account");
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");

    await prisma.user.delete({ where: { id: userId } });
  },
};
