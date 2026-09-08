"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/lib/api/client";
import { createReport, updateReport, submitReport, getReport } from "@/lib/api/reports";
import { listActiveProjects } from "@/lib/api/projects";
import { currentWeekStartDateOnly, currentWeekEndDateOnly, toDateOnly } from "@/lib/week";
import { formatDateTime } from "@/lib/format";
import type { ProjectSummary } from "@/types/project";
import type { HourType, ReportContent, ReportStatus, ReviewComment } from "@/types/report";
import type { FlaggableRow, TaskRow, TextRow } from "./formTypes";
import { newKey } from "./formTypes";
import type { TaskRowErrors } from "./TaskTable";
import FormSection from "./FormSection";
import TaskTable from "./TaskTable";
import StringListEditor from "./StringListEditor";
import FlaggableListEditor from "./FlaggableListEditor";
import HoursWorkedFields, { emptyHours, type HoursByType } from "./HoursWorkedFields";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import Button from "@/components/common/Button";
import ErrorMessage from "@/components/common/ErrorMessage";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";

interface FormErrors {
  weekStart?: string;
  weekEnd?: string;
  tasks?: Record<string, TaskRowErrors>;
  tasksPlanned?: Record<string, string>;
  blockers?: Record<string, string>;
  achievements?: Record<string, string>;
  notes?: string;
}

const LOCKED_STATUSES: ReportStatus[] = ["SUBMITTED", "APPROVED"];

interface ReportFormProps {
  /** "create" is /reports/new (no existing report yet); "edit" is /reports/[id]/edit. */
  mode: "create" | "edit";
  /** The report id to load and edit. Required (and only meaningful) in edit mode. */
  reportId?: string;
}

export default function ReportForm({ mode, reportId: routeReportId }: ReportFormProps) {
  const { accessToken } = useAuth();
  const router = useRouter();

  // Section 1: Week / Date Range - defaults to the current ISO week (Mon-Sun) in create mode;
  // overwritten by the loaded report in edit mode before the form ever becomes visible.
  const [weekStart, setWeekStart] = useState(currentWeekStartDateOnly());
  const [weekEnd, setWeekEnd] = useState(currentWeekEndDateOnly());

  // Section 2: Project / Category
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Sections 3-8
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [tasksPlanned, setTasksPlanned] = useState<TextRow[]>([]);
  const [blockers, setBlockers] = useState<FlaggableRow[]>([]);
  const [achievements, setAchievements] = useState<FlaggableRow[]>([]);
  const [hours, setHours] = useState<HoursByType>(emptyHours());
  const [notes, setNotes] = useState("");

  // Persistence state: in create mode this starts null and gets set after the first Save Draft
  // (POST); in edit mode it's the route's report id from the start, so every save is a PATCH -
  // ensureSaved() below doesn't need to know which mode it's in, it just branches on this.
  const [reportId, setReportId] = useState<string | null>(mode === "edit" ? routeReportId ?? null : null);
  const [reportStatus, setReportStatus] = useState<ReportStatus | null>(null);
  const [reviewComments, setReviewComments] = useState<ReviewComment[]>([]);

  // Edit mode only: loading the existing report before the form can render at all.
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">(mode === "edit" ? "loading" : "ready");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLocked = reportStatus !== null && LOCKED_STATUSES.includes(reportStatus);

  // Load projects for the Section 2 dropdown (both modes).
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    listActiveProjects(accessToken)
      .then((result) => {
        if (!cancelled) setProjects(result.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setProjects([]);
          setProjectsError(err instanceof ApiError ? err.message : "Could not load projects.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // Edit mode only: load the existing report and populate every section from it.
  useEffect(() => {
    if (mode !== "edit" || !routeReportId || !accessToken) return;
    let cancelled = false;

    getReport(accessToken, routeReportId)
      .then((detail) => {
        if (cancelled) return;
        setWeekStart(toDateOnly(detail.weekStart));
        setWeekEnd(toDateOnly(detail.weekEnd));
        setProjectId(detail.project?.id ?? "");

        const content = detail.currentVersion?.content;
        if (content) {
          setTasks(content.tasksCompleted.map((t) => ({ _key: newKey(), ...t })));
          setTasksPlanned(content.tasksPlannedNextWeek.map((text) => ({ _key: newKey(), text })));
          setBlockers(content.blockers.map((b) => ({ _key: newKey(), ...b })));
          setAchievements(content.achievements.map((a) => ({ _key: newKey(), ...a })));
          const hoursRecord = emptyHours();
          for (const h of content.hoursByType) hoursRecord[h.type] = h.hours;
          setHours(hoursRecord);
          setNotes(content.notes ?? "");
        }

        setReportId(detail.id);
        setReportStatus(detail.status);
        setReviewComments(detail.reviewComments);
        setLoadState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "Could not load this report.");
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [mode, routeReportId, accessToken]);

  function validate(): boolean {
    const next: FormErrors = {};

    if (!weekStart) next.weekStart = "Week start is required";
    if (!weekEnd) next.weekEnd = "Week end is required";
    if (weekStart && weekEnd && weekEnd < weekStart) {
      next.weekEnd = "Week end cannot be before week start";
    }

    const taskErrors: Record<string, TaskRowErrors> = {};
    for (const row of tasks) {
      const rowErr: TaskRowErrors = {};
      if (!row.taskName.trim()) rowErr.taskName = "Required";
      else if (row.taskName.length > 200) rowErr.taskName = "Max 200 characters";
      if (!row.priority.trim()) rowErr.priority = "Required";
      if (!row.status.trim()) rowErr.status = "Required";
      if (row.deliverable && row.deliverable.length > 500) rowErr.deliverable = "Max 500 characters";
      if (Object.keys(rowErr).length) taskErrors[row._key] = rowErr;
    }
    if (Object.keys(taskErrors).length) next.tasks = taskErrors;

    const plannedErrors: Record<string, string> = {};
    for (const row of tasksPlanned) {
      if (!row.text.trim()) plannedErrors[row._key] = "Required, or remove this row";
      else if (row.text.length > 500) plannedErrors[row._key] = "Max 500 characters";
    }
    if (Object.keys(plannedErrors).length) next.tasksPlanned = plannedErrors;

    const blockerErrors: Record<string, string> = {};
    for (const row of blockers) {
      if (!row.text.trim()) blockerErrors[row._key] = "Required, or remove this row";
      else if (row.text.length > 1000) blockerErrors[row._key] = "Max 1000 characters";
    }
    if (Object.keys(blockerErrors).length) next.blockers = blockerErrors;

    const achievementErrors: Record<string, string> = {};
    for (const row of achievements) {
      if (!row.text.trim()) achievementErrors[row._key] = "Required, or remove this row";
      else if (row.text.length > 1000) achievementErrors[row._key] = "Max 1000 characters";
    }
    if (Object.keys(achievementErrors).length) next.achievements = achievementErrors;

    if (notes.length > 2000) next.notes = "Max 2000 characters";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildContent(): ReportContent {
    return {
      tasksCompleted: tasks.map(({ _key, ...rest }) => rest),
      tasksPlannedNextWeek: tasksPlanned.map((r) => r.text.trim()).filter(Boolean),
      blockers: blockers.map(({ _key, ...rest }) => rest),
      achievements: achievements.map(({ _key, ...rest }) => rest),
      hoursByType: (Object.keys(hours) as HourType[]).map((type) => ({ type, hours: hours[type] })),
      notes: notes.trim() ? notes.trim() : undefined,
    };
  }

  // Creates the report on the very first save (create mode, reportId still null), PATCHes it on
  // every save after that - which in edit mode is every save, since reportId starts pre-populated.
  async function ensureSaved(): Promise<string> {
    const content = buildContent();
    if (!reportId) {
      // createReportSchema's projectId is optional (no `.nullable()`) - omit the key entirely when
      // no project is selected, rather than sending null.
      const created = await createReport(accessToken as string, {
        weekStart,
        weekEnd,
        projectId: projectId || undefined,
        content,
      });
      setReportId(created.id);
      setReportStatus(created.status);
      return created.id;
    }

    // updateReportSchema's projectId IS nullable - send null explicitly so deselecting a
    // previously-chosen project actually clears it server-side.
    const updated = await updateReport(accessToken as string, reportId, {
      weekStart,
      weekEnd,
      projectId: projectId || null,
      content,
    });
    setReportStatus(updated.status);
    return reportId;
  }

  async function handleSaveDraft() {
    setApiError(null);
    setSuccessMessage(null);
    if (!validate()) return;

    setIsSavingDraft(true);
    try {
      await ensureSaved();
      setSuccessMessage(mode === "edit" ? "Changes saved." : "Draft saved.");
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Something went wrong saving your report.");
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSubmitForReview() {
    setApiError(null);
    setSuccessMessage(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const id = await ensureSaved();
      const submitted = await submitReport(accessToken as string, id);
      if (mode === "edit") {
        // "After successful submission, refresh the report state" - reflect the new status/version
        // right here instead of navigating away, since submitReport() already returns the full
        // up-to-date report.
        setReportStatus(submitted.status);
        setReviewComments(submitted.reviewComments);
        setSuccessMessage("Report submitted for review.");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Something went wrong submitting your report.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadState === "loading") {
    return <LoadingSpinner label="Loading report..." />;
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <ErrorMessage message={loadError} />
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-slate-900 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const projectOptions = [
    { value: "", label: "No project" },
    ...(projects ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];
  const latestCorrection = reviewComments.find((c) => c.action === "REQUEST_CHANGES") ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/dashboard" className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline">
        &larr; Back to Dashboard
      </Link>

      <div className="mb-6 mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {mode === "edit" ? "Edit Weekly Report" : "New Weekly Report"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">All sections below are saved together as one report.</p>
        </div>
        {reportStatus && <StatusBadge status={reportStatus} />}
      </div>

      {isLocked && (
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          This report has been {reportStatus === "APPROVED" ? "approved" : "submitted"} and can no
          longer be edited.
        </div>
      )}

      {latestCorrection && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium text-amber-800">
            Manager feedback from {latestCorrection.reviewer.name} &middot;{" "}
            {formatDateTime(latestCorrection.createdAt)}
          </p>
          <p className="mt-1 text-sm text-amber-900">{latestCorrection.comment}</p>
        </div>
      )}

      <ErrorMessage message={apiError} />
      {successMessage && (
        <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6">
        <FormSection number={1} title="Week / Date Range">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Week start"
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              error={errors.weekStart}
              disabled={isLocked}
            />
            <Input
              label="Week end"
              type="date"
              value={weekEnd}
              onChange={(e) => setWeekEnd(e.target.value)}
              error={errors.weekEnd}
              disabled={isLocked}
            />
          </div>
        </FormSection>

        <FormSection number={2} title="Project / Category">
          {projectsError && <p className="mb-2 text-xs text-red-600">{projectsError}</p>}
          <Select
            label="Project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={projectOptions}
            disabled={isLocked || projects === null}
          />
        </FormSection>

        <FormSection number={3} title="Tasks Completed">
          <TaskTable rows={tasks} onChange={setTasks} errors={errors.tasks} />
        </FormSection>

        <FormSection number={4} title="Tasks Planned for Next Week">
          <StringListEditor
            rows={tasksPlanned}
            onChange={setTasksPlanned}
            placeholder="Describe a planned task"
            addLabel="+ Add Planned Task"
            errors={errors.tasksPlanned}
          />
        </FormSection>

        <FormSection number={5} title="Blockers / Challenges">
          <FlaggableListEditor
            rows={blockers}
            onChange={setBlockers}
            placeholder="Describe a blocker"
            addLabel="+ Add Blocker"
            keyLabel="Key Issue"
            errors={errors.blockers}
          />
        </FormSection>

        <FormSection number={6} title="Achievements / Highlights">
          <FlaggableListEditor
            rows={achievements}
            onChange={setAchievements}
            placeholder="Describe an achievement"
            addLabel="+ Add Achievement"
            keyLabel="Key Achievement"
            errors={errors.achievements}
          />
        </FormSection>

        <FormSection number={7} title="Hours Worked">
          <HoursWorkedFields value={hours} onChange={setHours} />
        </FormSection>

        <FormSection number={8} title="Optional Notes / Links">
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            error={errors.notes}
            disabled={isLocked}
            placeholder="Anything else worth mentioning..."
          />
        </FormSection>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={handleSaveDraft} isLoading={isSavingDraft} disabled={isLocked}>
          {mode === "edit" ? "Save Changes" : "Save Draft"}
        </Button>
        <Button onClick={handleSubmitForReview} isLoading={isSubmitting} disabled={isLocked}>
          {mode === "edit" ? "Submit Report" : "Submit for Review"}
        </Button>
      </div>
    </div>
  );
}
