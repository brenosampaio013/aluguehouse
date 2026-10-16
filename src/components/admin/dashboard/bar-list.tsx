/** Barras horizontais de uma só cor (magnitude), com o valor escrito ao lado. */
export function BarList({
  items,
  label,
}: {
  items: { label: string; value: number; href?: string }[];
  label: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="grid gap-3" aria-label={label}>
      {items.map((item) => (
        <li key={item.label} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-3 text-small">
            <span className="truncate">{item.label}</span>
            <span className="font-semibold tabular-nums">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-marfim" aria-hidden="true">
            <div
              className="h-2 rounded-full bg-[#1d6b73]"
              style={{ width: `${item.value === 0 ? 0 : Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
