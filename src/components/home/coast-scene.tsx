/**
 * Cenário desenhado do topo enquanto não há foto: fim de tarde no litoral
 * norte (serra encontrando o mar, uma ilha ao longe, o reflexo dourado do sol
 * e ondas finas). Só decoração, nas cores do site; não imita uma foto.
 *
 * O desenho usa um quadro de 1440×900 cortado para cobrir a área (horizonte
 * a 58% dela; no computador a área é a seção inteira, no celular 69% dela). As ondas ficam em faixas com o dobro da
 * largura, e cada faixa desliza meia largura em loop: como o período das
 * ondas divide 1440, o recomeço não aparece.
 */

const HORIZON = 522;

/** Senoide com curvas quadráticas: começa em y, repete a cada `period`. */
function wavePath(y: number, amplitude: number, period: number, width = 2880) {
  let d = `M0 ${y} Q ${period / 4} ${y - amplitude} ${period / 2} ${y}`;
  for (let x = period; x <= width; x += period / 2) d += ` T ${x} ${y}`;
  return d;
}

type WaveLine = { y: number; amplitude: number; period: number; opacity: number };

const strips: { top: string; height: string; duration: string; lines: WaveLine[] }[] = [
  {
    // Longe: ondas baixas e curtas, quase paradas.
    top: "59%",
    height: "8%",
    duration: "90s",
    lines: [
      { y: 30, amplitude: 3, period: 240, opacity: 0.22 },
      { y: 70, amplitude: 3, period: 180, opacity: 0.16 },
    ],
  },
  {
    top: "67%",
    height: "13%",
    duration: "64s",
    lines: [
      { y: 35, amplitude: 6, period: 360, opacity: 0.3 },
      { y: 85, amplitude: 5, period: 480, opacity: 0.2 },
    ],
  },
  {
    // Perto: mais amplas, deslizam mais rápido (perspectiva).
    top: "79%",
    height: "21%",
    duration: "46s",
    lines: [
      { y: 30, amplitude: 11, period: 720, opacity: 0.42 },
      { y: 70, amplitude: 9, period: 480, opacity: 0.26 },
      { y: 104, amplitude: 13, period: 1440, opacity: 0.16 },
    ],
  },
];

/** Pseudoaleatório fixo (mesmo desenho no servidor e no navegador). */
function noise(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Reflexo do sol: fileiras de traços curtos e soltos, mais largas, espaçadas
 * e apagadas perto da praia, como a luz quebrando nas ondulações.
 */
const glints = Array.from({ length: 16 }, (_, row) => {
  const t = row / 15;
  const y = HORIZON + 6 + t * t * 250 + t * 30;
  const spread = 10 + t * 120;
  const pieces = 1 + Math.floor(noise(row) * 3);
  return Array.from({ length: pieces }, (_, i) => {
    const k = row * 7 + i;
    const center = 1120 + (noise(k + 0.5) * 2 - 1) * spread;
    const half = (3 + noise(k + 0.25) * 14) * (0.6 + t);
    return {
      key: `${row}-${i}`,
      x1: Math.round(center - half),
      x2: Math.round(center + half),
      y: Math.round(y + (noise(k + 0.75) - 0.5) * 4),
      delay: `${-(noise(k + 0.9) * 6).toFixed(1)}s`,
      duration: `${(3.5 + noise(k + 0.3) * 3).toFixed(1)}s`,
      opacity: +(0.7 - t * 0.4).toFixed(2),
    };
  });
}).flat();

export function CoastScene() {
  return (
    <div aria-hidden="true" className="hero-sem-foto absolute inset-0 -z-10 overflow-hidden">
      {/*
        No celular e no tablet o texto ocupa a metade de baixo: o cenário
        encolhe para o horizonte ficar a 40% da altura, acima do texto.
      */}
      <div className="absolute inset-x-0 top-0 h-[69%] lg:h-full">
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 size-full"
        >
          <defs>
            <linearGradient id="serra-perto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#123f45" />
              <stop offset="1" stopColor="#0d2d34" />
            </linearGradient>
          </defs>
          {/* Serra ao longe, em toda a largura, quase dissolvida na névoa. */}
          <path
            d={`M0 ${HORIZON} L0 506 C 90 498, 170 492, 260 500 S 430 488, 540 497 S 700 482, 800 494 S 1000 470, 1090 478 S 1300 470, 1440 476 L1440 ${HORIZON} Z`}
            fill="#1a4a50"
            fillOpacity="0.5"
          />
          {/* Serra do Mar descendo até a água, à direita. */}
          <path
            d={`M760 ${HORIZON} C 840 512, 900 478, 975 456 C 1040 437, 1090 404, 1160 392 C 1230 381, 1290 404, 1340 398 C 1385 393, 1415 386, 1440 384 L1440 ${HORIZON} Z`}
            fill="url(#serra-perto)"
          />
          <path
            d="M760 522 C 840 512, 900 478, 975 456 C 1040 437, 1090 404, 1160 392 C 1230 381, 1290 404, 1340 398 C 1385 393, 1415 386, 1440 384"
            fill="none"
            stroke="var(--color-dourado)"
            strokeOpacity="0.35"
            vectorEffect="non-scaling-stroke"
          />
          {/* Ilha no horizonte. */}
          <path
            d={`M150 ${HORIZON} C 205 510, 255 497, 300 499 C 338 501, 368 512, 410 ${HORIZON} Z`}
            fill="#0f3439"
            fillOpacity="0.85"
          />
          <line
            x1="0"
            y1={HORIZON}
            x2="1440"
            y2={HORIZON}
            stroke="var(--color-dourado)"
            strokeOpacity="0.45"
            vectorEffect="non-scaling-stroke"
          />
          {/* Reflexo do sol na água, cintilando devagar. */}
          <g stroke="var(--color-dourado)" strokeLinecap="round">
            {glints.map((g) => (
              <line
                key={g.key}
                className="mar-brilho"
                x1={g.x1}
                x2={g.x2}
                y1={g.y}
                y2={g.y}
                strokeOpacity={g.opacity}
                strokeWidth={1.25}
                style={{ animationDelay: g.delay, animationDuration: g.duration }}
              />
            ))}
          </g>
        </svg>

        {strips.map((strip) => (
          <div
            key={strip.top}
            className="absolute inset-x-0 overflow-hidden"
            style={{ top: strip.top, height: strip.height }}
          >
            <svg
              viewBox="0 0 2880 120"
              preserveAspectRatio="none"
              className="mar-deriva absolute inset-y-0 left-0 h-full w-[200%] text-dourado"
              style={{ animationDuration: strip.duration }}
            >
              {strip.lines.map((line) => (
                <path
                  key={line.y}
                  d={wavePath(line.y, line.amplitude, line.period)}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={line.opacity}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
