import { PrismaClient, HourType } from "@prisma/client";
import { hashPassword } from "../src/common/utils/password";
import { startOfIsoWeek, endOfIsoWeek, addWeeks } from "../src/common/utils/week";

const prisma = new PrismaClient();

// Every seeded user shares this password so the presentation/demo/live-coding round can log in as
// anyone instantly. Change it (or seed real accounts) before this ever goes anywhere real.
const SEED_PASSWORD = "Password123!";

type Flag = { text: string; isKey: boolean };

function content(opts: {
  tasks: { taskName: string; priority: string; plannedPct: number; actualPct: number; status: string; timePlannedHrs?: number; timeSpentHrs?: number; deliverable?: string }[];
  next: string[];
  blockers: Flag[];
  achievements: Flag[];
  hours: Partial<Record<HourType, number>>;
  notes?: string;
}) {
  return {
    tasksCompleted: opts.tasks,
    tasksPlannedNextWeek: opts.next,
    blockers: opts.blockers,
    achievements: opts.achievements,
    hoursByType: Object.entries(opts.hours).map(([type, hours]) => ({ type: type as HourType, hours: hours as number })),
    notes: opts.notes,
  };
}

async function createReport(params: {
  userId: string;
  projectId?: string;
  weekStart: Date;
  status: "DRAFT" | "SUBMITTED" | "NEEDS_CORRECTION" | "APPROVED";
  v1: ReturnType<typeof content>;
  v1SubmittedDaysAfterWeekStart?: number; // undefined = stays DRAFT (no submission)
  review?: { reviewerId: string; action: "APPROVED" | "REQUEST_CHANGES"; comment: string; daysAfter?: number };
  // second cycle: a correction + edit + resubmit + final review, to demonstrate version history
  v2?: ReturnType<typeof content>;
  v2Review?: { reviewerId: string; action: "APPROVED" | "REQUEST_CHANGES"; comment: string; daysAfter?: number };
}) {
  const weekEnd = endOfIsoWeek(params.weekStart);

  const report = await prisma.report.create({
    data: {
      userId: params.userId,
      projectId: params.projectId,
      weekStart: params.weekStart,
      weekEnd,
      status: "DRAFT",
    },
  });

  const v1 = await prisma.reportVersion.create({
    data: {
      reportId: report.id,
      versionNumber: 1,
      blockers: params.v1.blockers,
      achievements: params.v1.achievements,
      tasksPlannedNextWeek: params.v1.tasksPlannedNextWeek,
      notes: params.v1.notes,
      submittedAt:
        params.v1SubmittedDaysAfterWeekStart !== undefined
          ? addDays(params.weekStart, params.v1SubmittedDaysAfterWeekStart)
          : null,
      taskEntries: { create: params.v1.tasksCompleted.map((t, i) => ({ ...t, sortOrder: i })) },
      hoursEntries: { create: params.v1.hoursByType },
    },
  });
  await prisma.report.update({ where: { id: report.id }, data: { currentVersionId: v1.id } });

  let status: typeof params.status = params.v1SubmittedDaysAfterWeekStart !== undefined ? "SUBMITTED" : "DRAFT";
  let currentVersionId = v1.id;

  if (params.review) {
    await prisma.reviewComment.create({
      data: {
        reportId: report.id,
        reportVersionId: v1.id,
        reviewerId: params.review.reviewerId,
        action: params.review.action,
        comment: params.review.comment,
        createdAt: addDays(params.weekStart, params.review.daysAfter ?? 2),
      },
    });
    status = params.review.action === "APPROVED" ? "APPROVED" : "NEEDS_CORRECTION";
  }

  if (params.v2) {
    const v2 = await prisma.reportVersion.create({
      data: {
        reportId: report.id,
        versionNumber: 2,
        blockers: params.v2.blockers,
        achievements: params.v2.achievements,
        tasksPlannedNextWeek: params.v2.tasksPlannedNextWeek,
        notes: params.v2.notes,
        submittedAt: addDays(params.weekStart, 4),
        taskEntries: { create: params.v2.tasksCompleted.map((t, i) => ({ ...t, sortOrder: i })) },
        hoursEntries: { create: params.v2.hoursByType },
      },
    });
    await prisma.report.update({ where: { id: report.id }, data: { currentVersionId: v2.id } });
    currentVersionId = v2.id;
    status = "SUBMITTED";

    if (params.v2Review) {
      await prisma.reviewComment.create({
        data: {
          reportId: report.id,
          reportVersionId: v2.id,
          reviewerId: params.v2Review.reviewerId,
          action: params.v2Review.action,
          comment: params.v2Review.comment,
          createdAt: addDays(params.weekStart, params.v2Review.daysAfter ?? 6),
        },
      });
      status = params.v2Review.action === "APPROVED" ? "APPROVED" : "NEEDS_CORRECTION";
    }
  }

  await prisma.report.update({ where: { id: report.id }, data: { status, currentVersionId } });
  return report;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  console.log("Seeding database...");

  // Wipe existing data (dev-only script - never run this against anything real). Deleted in
  // leaf-to-root order: ReviewComment/HoursEntry/TaskEntry reference ReportVersion, Report has a FK
  // to its current ReportVersion, and ReportVersion has a FK back to Report - clearing Report's
  // currentVersionId pointers before deleting ReportVersion rows avoids that circular-reference
  // conflict regardless of the exact cascade rules in play.
  await prisma.reviewComment.deleteMany();
  await prisma.hoursEntry.deleteMany();
  await prisma.taskEntry.deleteMany();
  await prisma.report.updateMany({ data: { currentVersionId: null } });
  await prisma.reportVersion.deleteMany();
  await prisma.report.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword(SEED_PASSWORD);

  const manager = await prisma.user.create({
    data: { name: "Ava Patel", email: "manager@example.com", role: "MANAGER", passwordHash },
  });

  const [liam, sofia, noah, maya] = await Promise.all([
    prisma.user.create({ data: { name: "Liam Chen", email: "liam@example.com", role: "MEMBER", passwordHash } }),
    prisma.user.create({ data: { name: "Sofia Torres", email: "sofia@example.com", role: "MEMBER", passwordHash } }),
    prisma.user.create({ data: { name: "Noah Williams", email: "noah@example.com", role: "MEMBER", passwordHash } }),
    prisma.user.create({ data: { name: "Maya Singh", email: "maya@example.com", role: "MEMBER", passwordHash } }),
  ]);

  const [clientA, internalTooling, rnd, marketing] = await Promise.all([
    prisma.project.create({ data: { name: "Client A", description: "Retainer client engagement" } }),
    prisma.project.create({ data: { name: "Internal Tooling", description: "Internal dev tools & automation" } }),
    prisma.project.create({ data: { name: "R&D", description: "Exploratory / research projects" } }),
    prisma.project.create({ data: { name: "Marketing", description: "Website & campaign work", isActive: true } }),
  ]);

  await prisma.projectAssignment.createMany({
    data: [
      { userId: liam.id, projectId: clientA.id },
      { userId: liam.id, projectId: internalTooling.id },
      { userId: sofia.id, projectId: clientA.id },
      { userId: noah.id, projectId: rnd.id },
      { userId: maya.id, projectId: marketing.id },
      { userId: maya.id, projectId: clientA.id },
    ],
  });

  const thisWeek = startOfIsoWeek(new Date());
  const week1Ago = addWeeks(thisWeek, -1);
  const week2Ago = addWeeks(thisWeek, -2);
  const week3Ago = addWeeks(thisWeek, -3);

  // ---- Liam Chen: steady contributor, currently mid-draft this week ----
  await createReport({
    userId: liam.id,
    projectId: clientA.id,
    weekStart: week3Ago,
    v1SubmittedDaysAfterWeekStart: 4,
    status: "APPROVED",
    review: { reviewerId: manager.id, action: "APPROVED", comment: "Solid week, nice progress on the API integration.", daysAfter: 5 },
    v1: content({
      tasks: [
        { taskName: "Build client onboarding API", priority: "High", plannedPct: 100, actualPct: 100, status: "Completed", timePlannedHrs: 12, timeSpentHrs: 14, deliverable: "PR #142 merged" },
        { taskName: "Write integration tests", priority: "Medium", plannedPct: 100, actualPct: 80, status: "In Progress", timePlannedHrs: 6, timeSpentHrs: 5 },
      ],
      next: ["Finish integration test coverage", "Start on billing webhook handler"],
      blockers: [{ text: "Waiting on client's sandbox API credentials", isKey: true }],
      achievements: [{ text: "Onboarding API shipped a day early", isKey: true }],
      hours: { DEVELOPMENT: 22, TESTING: 5, MEETINGS: 4, DOCUMENTATION: 2 },
      notes: "Good momentum this week.",
    }),
  });

  await createReport({
    userId: liam.id,
    projectId: clientA.id,
    weekStart: week2Ago,
    v1SubmittedDaysAfterWeekStart: 4,
    status: "SUBMITTED",
    v1: content({
      tasks: [
        { taskName: "Billing webhook handler", priority: "High", plannedPct: 100, actualPct: 90, status: "In Progress", timePlannedHrs: 10, timeSpentHrs: 11 },
      ],
      next: ["Finish webhook handler", "Code review for teammates"],
      blockers: [],
      achievements: [{ text: "Reduced API p95 latency by 30%", isKey: true }],
      hours: { DEVELOPMENT: 24, MEETINGS: 3 },
    }),
  });

  await createReport({
    userId: liam.id,
    projectId: internalTooling.id,
    weekStart: week1Ago,
    status: "DRAFT",
    v1: content({
      tasks: [{ taskName: "Internal CLI tool prototype", priority: "Low", plannedPct: 50, actualPct: 20, status: "In Progress" }],
      next: ["Continue CLI tool"],
      blockers: [{ text: "Deprioritized in favor of Client A work", isKey: false }],
      achievements: [],
      hours: { DEVELOPMENT: 4 },
    }),
  });
  // (this week: intentionally no report yet - shows up as "not started" on the dashboard)

  // ---- Sofia Torres: the full correction cycle demo (v1 rejected -> edited -> v2 approved) ----
  await createReport({
    userId: sofia.id,
    projectId: clientA.id,
    weekStart: week3Ago,
    v1SubmittedDaysAfterWeekStart: 3,
    status: "APPROVED",
    review: { reviewerId: manager.id, action: "APPROVED", comment: "Great write-up, thanks Sofia.", daysAfter: 4 },
    v1: content({
      tasks: [{ taskName: "Client A design review", priority: "Medium", plannedPct: 100, actualPct: 100, status: "Completed", timePlannedHrs: 8, timeSpentHrs: 8, deliverable: "Figma file v3" }],
      next: ["Kick off next design sprint"],
      blockers: [],
      achievements: [{ text: "Client approved the new design system", isKey: true }],
      hours: { MEETINGS: 6, DOCUMENTATION: 3 },
    }),
  });

  await createReport({
    userId: sofia.id,
    projectId: clientA.id,
    weekStart: week2Ago,
    v1SubmittedDaysAfterWeekStart: 3,
    status: "APPROVED",
    review: {
      reviewerId: manager.id,
      action: "REQUEST_CHANGES",
      comment: "Can you add more detail on the blocker with the design handoff, and break the 'misc' task into specifics?",
      daysAfter: 4,
    },
    v1: content({
      tasks: [{ taskName: "Misc design work", priority: "Low", plannedPct: 100, actualPct: 60, status: "In Progress" }],
      next: ["TBD"],
      blockers: [{ text: "Blocked on something", isKey: true }],
      achievements: [],
      hours: { MEETINGS: 4 },
      notes: "Busy week.",
    }),
    v2: content({
      tasks: [
        { taskName: "Component library handoff docs", priority: "Medium", plannedPct: 100, actualPct: 100, status: "Completed", timePlannedHrs: 6, timeSpentHrs: 7, deliverable: "Handoff doc v1" },
        { taskName: "Redline review with engineering", priority: "Medium", plannedPct: 100, actualPct: 100, status: "Completed", timePlannedHrs: 3, timeSpentHrs: 3 },
      ],
      next: ["Support engineering during implementation"],
      blockers: [{ text: "Design handoff was delayed because Figma dev-mode access wasn't granted to engineering until Wednesday", isKey: true }],
      achievements: [{ text: "Finished full component handoff docs ahead of schedule", isKey: true }],
      hours: { MEETINGS: 4, DOCUMENTATION: 6 },
      notes: "Addressed manager's feedback - added specifics on tasks and the blocker.",
    }),
    v2Review: { reviewerId: manager.id, action: "APPROVED", comment: "Much clearer, thank you!", daysAfter: 6 },
  });

  await createReport({
    userId: sofia.id,
    projectId: clientA.id,
    weekStart: week1Ago,
    v1SubmittedDaysAfterWeekStart: 4,
    status: "SUBMITTED",
    v1: content({
      tasks: [{ taskName: "Engineering support during implementation", priority: "Medium", plannedPct: 100, actualPct: 100, status: "Completed", timePlannedHrs: 8, timeSpentHrs: 9 }],
      next: ["Start next client initiative"],
      blockers: [],
      achievements: [{ text: "Zero implementation bugs from the handoff docs", isKey: true }],
      hours: { MEETINGS: 5, DOCUMENTATION: 2 },
    }),
  });

  await createReport({
    userId: sofia.id,
    projectId: clientA.id,
    weekStart: thisWeek,
    status: "DRAFT",
    v1: content({
      tasks: [],
      next: ["Plan next initiative kickoff"],
      blockers: [],
      achievements: [],
      hours: {},
    }),
  });

  // ---- Noah Williams: currently needs correction, hasn't edited yet ----
  await createReport({
    userId: noah.id,
    projectId: rnd.id,
    weekStart: week3Ago,
    v1SubmittedDaysAfterWeekStart: 5,
    status: "NEEDS_CORRECTION",
    review: {
      reviewerId: manager.id,
      action: "REQUEST_CHANGES",
      comment: "The R&D spike write-up is missing a clear recommendation - what should we do next? Please add that before resubmitting.",
      daysAfter: 6,
    },
    v1: content({
      tasks: [{ taskName: "Evaluate vector DB options", priority: "Medium", plannedPct: 100, actualPct: 100, status: "Completed", timePlannedHrs: 10, timeSpentHrs: 12, deliverable: "Comparison doc" }],
      next: ["Await manager decision"],
      blockers: [{ text: "No blockers", isKey: false }],
      achievements: [{ text: "Compared 4 vector DB options in depth", isKey: true }],
      hours: { DEVELOPMENT: 6, DOCUMENTATION: 6 },
    }),
  });

  await createReport({
    userId: noah.id,
    projectId: rnd.id,
    weekStart: week2Ago,
    v1SubmittedDaysAfterWeekStart: 3,
    status: "APPROVED",
    review: { reviewerId: manager.id, action: "APPROVED", comment: "Good spike, approved.", daysAfter: 4 },
    v1: content({
      tasks: [{ taskName: "Prototype recommendation engine", priority: "High", plannedPct: 80, actualPct: 70, status: "In Progress", timePlannedHrs: 14, timeSpentHrs: 15 }],
      next: ["Finish prototype", "Present findings"],
      blockers: [],
      achievements: [{ text: "Prototype hit 85% accuracy on the test set", isKey: true }],
      hours: { DEVELOPMENT: 18, MEETINGS: 2 },
    }),
  });

  // (week1Ago: no report - "not yet started")

  await createReport({
    userId: noah.id,
    projectId: rnd.id,
    weekStart: thisWeek,
    status: "DRAFT",
    v1: content({
      tasks: [{ taskName: "Resume recommendation engine prototype", priority: "High", plannedPct: 50, actualPct: 10, status: "In Progress" }],
      next: [],
      blockers: [],
      achievements: [],
      hours: { DEVELOPMENT: 3 },
    }),
  });

  // ---- Maya Singh: consistently on-time, currently awaiting review ----
  for (const [i, week] of [week3Ago, week2Ago, week1Ago].entries()) {
    await createReport({
      userId: maya.id,
      projectId: marketing.id,
      weekStart: week,
      v1SubmittedDaysAfterWeekStart: 2,
      status: "APPROVED",
      review: { reviewerId: manager.id, action: "APPROVED", comment: `Approved - week ${i + 1} campaign metrics look great.`, daysAfter: 3 },
      v1: content({
        tasks: [
          { taskName: "Q3 campaign copy", priority: "High", plannedPct: 100, actualPct: 100, status: "Completed", timePlannedHrs: 8, timeSpentHrs: 7, deliverable: "Campaign brief v2" },
          { taskName: "A/B test landing pages", priority: "Medium", plannedPct: 100, actualPct: 100, status: "Completed", timePlannedHrs: 5, timeSpentHrs: 6, deliverable: "Test results doc" },
        ],
        next: ["Launch next campaign phase"],
        blockers: [],
        achievements: [{ text: "Landing page B outperformed A by 22% conversion", isKey: true }],
        hours: { DEVELOPMENT: 2, MEETINGS: 5, DOCUMENTATION: 4 },
      }),
    });
  }

  await createReport({
    userId: maya.id,
    projectId: marketing.id,
    weekStart: thisWeek,
    v1SubmittedDaysAfterWeekStart: 1,
    status: "SUBMITTED",
    v1: content({
      tasks: [{ taskName: "Plan next campaign phase", priority: "High", plannedPct: 100, actualPct: 60, status: "In Progress", timePlannedHrs: 6, timeSpentHrs: 4 }],
      next: ["Finalize creative direction"],
      blockers: [{ text: "Waiting on brand guidelines refresh from design", isKey: true }],
      achievements: [],
      hours: { MEETINGS: 4, DOCUMENTATION: 2 },
    }),
  });

  console.log("Seed complete:");
  console.log(`  Manager login: manager@example.com / ${SEED_PASSWORD}`);
  console.log(`  Member logins: liam@example.com, sofia@example.com, noah@example.com, maya@example.com / ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
