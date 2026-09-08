import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export default function Textarea({ label, error, id, className = "", ...rest }: TextareaProps) {
  const areaId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={areaId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        className={`rounded-md border px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-slate-300 ${
          error ? "border-red-400" : "border-slate-300"
        } ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${areaId}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${areaId}-error`} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
