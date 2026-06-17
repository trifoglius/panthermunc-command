"use client";

export function DelegateMultiSelect({
  label,
  delegates,
  selected,
  onToggle,
  hint,
}: {
  label: string;
  delegates: { id: string; country: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  hint?: string;
}) {
  if (delegates.length === 0) {
    return (
      <div className="mt-3">
        <p className="mb-1 text-sm font-medium text-purple-900">{label}</p>
        <p className="text-sm text-purple-600">No delegates available.</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="mb-1 text-sm font-medium text-purple-900">{label}</p>
      {hint && <p className="mb-2 text-xs text-purple-600">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {delegates.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onToggle(d.id)}
            className={`rounded-full border px-3 py-1 text-sm ${
              selected.includes(d.id)
                ? "border-purple-700 bg-purple-700 text-white"
                : "border-purple-200 bg-white text-purple-800"
            }`}
          >
            {d.country}
          </button>
        ))}
      </div>
    </div>
  );
}
