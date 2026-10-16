"use client";

import { useId, useMemo, useState } from "react";

export type TrendPoint = { label: string; longLabel: string; values: number[] };
export type TrendSeries = { name: string; color: string };

const WIDTH = 720;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

/** Escala "redonda" para o eixo y: 0 até um múltiplo de 1, 2, 5 ou 10. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const exp = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].map((m) => m * exp).find((m) => m * 4 >= value) ?? exp * 10;
  return step * 4;
}

/**
 * Gráfico de linhas em SVG (sem bibliotecas): um eixo só, grade discreta,
 * legenda, rótulo do último ponto, dica ao passar o mouse ou focar com o
 * teclado (setas) e tabela com os mesmos dados para leitores de tela.
 */
export function TrendChart({
  title,
  points,
  series,
}: {
  title: string;
  points: TrendPoint[];
  series: TrendSeries[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const descId = useId();
  const max = useMemo(
    () => niceMax(Math.max(0, ...points.flatMap((point) => point.values))),
    [points],
  );
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * max));
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  const last = points.length - 1;

  function onKeyDown(event: React.KeyboardEvent) {
    if (points.length === 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      setActive((current) =>
        Math.min(last, Math.max(0, (current ?? (step > 0 ? -1 : points.length)) + step)),
      );
    } else if (event.key === "Escape") setActive(null);
  }

  const tip = active !== null ? points[active] : null;

  return (
    <div className="grid gap-3">
      <ul className="flex flex-wrap gap-4 text-small text-rocha" aria-label="Legenda">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 rounded-full"
              style={{ background: s.color }}
            />
            {s.name}
          </li>
        ))}
      </ul>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full touch-pan-y outline-none focus-visible:outline-2 focus-visible:outline-petroleo"
          role="img"
          aria-label={title}
          aria-describedby={descId}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const px = ((event.clientX - rect.left) / rect.width) * WIDTH;
            const i = points.length <= 1 ? 0 : Math.round(((px - PAD.left) / innerW) * last);
            setActive(Math.min(last, Math.max(0, i)));
          }}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="#eae0d0"
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize={11} fill="#52666a">
                {tick}
              </text>
            </g>
          ))}
          {points.map((point, i) =>
            // Rótulos espaçados; o último sempre aparece e nunca encosta no anterior.
            (i % labelEvery === 0 && last - i >= Math.ceil(labelEvery / 2) + 1) || i === last ? (
              <text
                key={point.label + i}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor={
                  i === 0 && points.length > 1
                    ? "start"
                    : i === last && points.length > 1
                      ? "end"
                      : "middle"
                }
                fontSize={11}
                fill="#52666a"
              >
                {point.label}
              </text>
            ) : null,
          )}
          {active !== null ? (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="#52666a"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          ) : null}
          {series.map((s, si) => (
            <g key={s.name}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points.map((p, i) => `${x(i)},${y(p.values[si] ?? 0)}`).join(" ")}
              />
              {points.length > 0 ? (
                <circle
                  cx={x(last)}
                  cy={y(points[last]!.values[si] ?? 0)}
                  r={4}
                  fill={s.color}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ) : null}
              {active !== null ? (
                <circle
                  cx={x(active)}
                  cy={y(points[active]!.values[si] ?? 0)}
                  r={5}
                  fill={s.color}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ) : null}
            </g>
          ))}
        </svg>
        {tip && active !== null ? (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 grid min-w-40 gap-1 rounded-control border border-areia bg-branco px-3 py-2 text-small shadow-flutuante"
            style={{
              left: `${(x(active) / WIDTH) * 100}%`,
              transform: `translateX(${x(active) / WIDTH > 0.6 ? "calc(-100% - 12px)" : "12px"})`,
            }}
          >
            <p className="font-semibold">{tip.longLabel}</p>
            {series.map((s, si) => (
              <p key={s.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-rocha">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.name}
                </span>
                <span className="font-semibold tabular-nums">{tip.values[si] ?? 0}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <p id={descId} className="sr-only">
        Use as setas para a esquerda e a direita para percorrer os pontos. Os mesmos dados estão na
        tabela abaixo.
      </p>
      <details className="text-small">
        <summary className="w-fit cursor-pointer font-semibold text-petroleo">
          Ver dados em tabela
        </summary>
        <div className="relative mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left tabular-nums">
            <caption className="sr-only">{title}</caption>
            <thead className="text-rocha">
              <tr>
                <th scope="col" className="py-1 pr-4 font-semibold">
                  Período
                </th>
                {series.map((s) => (
                  <th key={s.name} scope="col" className="py-1 pr-4 text-right font-semibold">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point, i) => (
                <tr key={point.longLabel + i} className="border-t border-areia">
                  <th scope="row" className="py-1 pr-4 font-normal">
                    {point.longLabel}
                  </th>
                  {series.map((s, si) => (
                    <td key={s.name} className="py-1 pr-4 text-right">
                      {point.values[si] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
