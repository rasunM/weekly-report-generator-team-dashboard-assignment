import { prisma } from "../../common/prisma";
import { AppError } from "../../common/errors/AppError";
import { paginated, PaginationParams } from "../../common/utils/pagination";
import { CreateProjectInput, UpdateProjectInput } from "./projects.dto";

export const projectsService = {
  // Any authenticated user can list projects (members need this to tag their reports); only
  // managers can create/edit/delete (enforced at the route level).
  async list(params: PaginationParams, filters: { isActive?: boolean }) {
    const where = filters.isActive !== undefined ? { isActive: filters.isActive } : {};

    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { name: "asc" },
        skip: params.skip,
        take: params.take,
        include: { _count: { select: { reports: true, assignments: true } } },
      }),
      prisma.project.count({ where }),
    ]);

    return paginated(
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        isActive: p.isActive,
        createdAt: p.createdAt,
        reportCount: p._count.reports,
        assignedMemberCount: p._count.assignments,
      })),
      totalCount,
      params
    );
  },

  async getById(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { assignments: { include: { user: true } } },
    });
    if (!project) throw AppError.notFound("Project not found");

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      isActive: project.isActive,
      createdAt: project.createdAt,
      assignedMembers: project.assignments.map((a) => ({
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
      })),
    };
  },

  async create(input: CreateProjectInput) {
    return prisma.project.create({ data: input });
  },

  async update(projectId: string, input: UpdateProjectInput) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw AppError.notFound("Project not found");
    return prisma.project.update({ where: { id: projectId }, data: input });
  },

  async remove(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw AppError.notFound("Project not found");

    const reportCount = await prisma.report.count({ where: { projectId } });
    if (reportCount > 0) {
      // Soft-delete instead of a hard delete: reports reference this project and we never want a
      // manager's project cleanup to silently corrupt historical report data. isActive=false removes
      // it from "assign to a new report" dropdowns while keeping past reports intact.
      await prisma.project.update({ where: { id: projectId }, data: { isActive: false } });
      return { softDeleted: true };
    }

    await prisma.projectAssignment.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    return { softDeleted: false };
  },

  async assignMembers(projectId: string, userIds: string[]) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw AppError.notFound("Project not found");

    const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
    if (users.length !== userIds.length) {
      throw AppError.badRequest("One or more userIds do not exist");
    }

    await prisma.$transaction(
      userIds.map((userId) =>
        prisma.projectAssignment.upsert({
          where: { userId_projectId: { userId, projectId } },
          create: { userId, projectId },
          update: {},
        })
      )
    );

    return projectsService.getById(projectId);
  },

  async unassignMember(projectId: string, userId: string) {
    await prisma.projectAssignment.deleteMany({ where: { projectId, userId } });
  },
};
