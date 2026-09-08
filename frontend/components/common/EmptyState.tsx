export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}
