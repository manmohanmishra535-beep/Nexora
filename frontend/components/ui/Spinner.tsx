export default function Spinner({
  label = "Loading",
  size = 28,
}: {
  label?: string;
  size?: number;
}) {
  return (
    <span className="flex items-center justify-center gap-3 py-10 text-[13px] text-ink-3">
      <span
        aria-hidden="true"
        className="animate-spin rounded-full border-2 border-line border-t-accent"
        style={{ width: size, height: size }}
      />
      <span>{label}…</span>
    </span>
  );
}

export function InlineSpinner({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block animate-spin rounded-full border-2 border-line border-t-accent"
      style={{ width: size, height: size }}
    />
  );
}
