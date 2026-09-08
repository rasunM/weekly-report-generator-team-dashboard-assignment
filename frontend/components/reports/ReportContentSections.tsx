// Shared read-only rendering of a report's fixed 8-section content - extracted out of
// ReportDetail.tsx (Feature 6) so the new Manager Review page (Feature 9) can show the exact same
// report body without duplicating ~150 lines of JSX. Pure presentational, no data fetching.
import type { ReportContent, ReportProjectRef, HourType } from "@/types/report";
import DetailSection from "./DetailSection";
import EmptyState from "@/components/common/EmptyState";

const HOUR_ORDER: HourType[] = ["DEVELOPMENT", "TESTING", "MEETINGS", "DOCUMENTATION", "OTHER"];
const HOUR_LABELS: Record<HourType, string> = {
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  MEETINGS: "Meetings",
  DOCUMENTATION: "Documentation",
  OTHER: "Other",
};

export default function ReportContentSections({
  project,
  content,
}: {
  project: ReportProjectRef | null;
  content: ReportContent | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <DetailSection title="Project / Category">
        <p className="text-sm text-slate-700">{project?.name ?? "No project"}</p>
      </DetailSection>

      <DetailSection title="Tasks Completed">
        {!content || content.tasksCompleted.length === 0 ? (
          <EmptyState message="No tasks recorded." />
        ) : (
          <div className="flex flex-col gap-3">
            {content.tasksCompleted.map((task, i) => (
              <div key={i} className="rounded-md border border-slate-100 p-4">
                <p className="text-sm font-medium text-slate-900">{task.taskName}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-4">
                  <span>Priority: {task.priority}</span>
                  <span>Status: {task.status}</span>
                  <span>Planned: {task.plannedPct}%</span>
                  <span>Actual: {task.actualPct}%</span>
                  {task.timePlannedHrs !== undefined && <span>Planned time: {task.timePlannedHrs} hrs</span>}
                  {task.timeSpentHrs !== undefined && <span>Time spent: {task.timeSpentHrs} hrs</span>}
                  {task.deliverable && <span className="col-span-2 sm:col-span-4">Deliverable: {task.deliverable}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="Tasks Planned for Next Week">
        {!content || content.tasksPlannedNextWeek.length === 0 ? (
          <EmptyState message="No planned tasks recorded." />
        ) : (
          <ul className="list-inside list-disc text-sm text-slate-700">
            {content.tasksPlannedNextWeek.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Blockers / Challenges">
        {!content || content.blockers.length === 0 ? (
          <EmptyState message="No blockers recorded." />
        ) : (
          <ul className="flex flex-col gap-2">
            {content.blockers.map((b, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm text-slate-700">
                <span>{b.text}</span>
                {b.isKey && (
                  <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                    Key Issue
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Achievements / Highlights">
        {!content || content.achievements.length === 0 ? (
          <EmptyState message="No achievements recorded." />
        ) : (
          <ul className="flex flex-col gap-2">
            {content.achievements.map((a, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm text-slate-700">
                <span>{a.text}</span>
                {a.isKey && (
                  <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    Key Achievement
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Hours Worked">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {HOUR_ORDER.map((type) => {
            const entry = content?.hoursByType.find((h) => h.type === type);
            return (
              <div key={type}>
                <p className="text-xs text-slate-400">{HOUR_LABELS[type]}</p>
                <p className="text-sm font-medium text-slate-900">{entry?.hours ?? 0} hrs</p>
              </div>
            );
          })}
        </div>
      </DetailSection>

      <DetailSection title="Notes / Links">
        {content?.notes ? (
          <p className="whitespace-pre-wrap text-sm text-slate-700">{content.notes}</p>
        ) : (
          <EmptyState message="No notes." />
        )}
      </DetailSection>
    </div>
  );
}
