/** Graphiques SVG minimalistes, sans dépendance. Responsive via viewBox. */

interface Point {
  label: string;
  value: number;
}

export function LineChart({data, unit = ''}: {data: Point[]; unit?: string}) {
  const W = 320;
  const H = 150;
  const padL = 6;
  const padR = 6;
  const padT = 18;
  const padB = 18;
  if (data.length === 0) return null;

  const vals = data.map((d) => d.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const X = (i: number) => (data.length === 1 ? padL + innerW / 2 : padL + (i / (data.length - 1)) * innerW);
  const Y = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;

  const line = data.map((d, i) => `${X(i).toFixed(1)},${Y(d.value).toFixed(1)}`).join(' ');
  const area = `${X(0).toFixed(1)},${padT + innerH} ${line} ${X(data.length - 1).toFixed(1)},${padT + innerH}`;
  const last = data[data.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Courbe de progression">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#areaGrad)" />
      <polyline points={line} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={X(i)} cy={Y(d.value)} r="2.5" fill="#34d399" />
      ))}
      {/* valeur de départ et d'arrivée */}
      <text x={X(0)} y={Y(data[0].value) - 6} fill="#64748b" fontSize="9">
        {data[0].value}
        {unit}
      </text>
      <text x={X(data.length - 1)} y={Y(last.value) - 6} textAnchor="end" fill="#34d399" fontSize="10" fontWeight="bold">
        {last.value}
        {unit}
      </text>
      {/* dates extrêmes */}
      <text x={padL} y={H - 4} fill="#64748b" fontSize="9">
        {data[0].label}
      </text>
      {data.length > 1 && (
        <text x={W - padR} y={H - 4} textAnchor="end" fill="#64748b" fontSize="9">
          {last.label}
        </text>
      )}
    </svg>
  );
}

export function BarChart({data, unit = ''}: {data: Point[]; unit?: string}) {
  const W = 320;
  const H = 130;
  const padT = 16;
  const padB = 18;
  const padX = 6;
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const innerH = H - padT - padB;
  const slot = (W - padX * 2) / data.length;
  const bw = Math.min(slot * 0.6, 30);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Volume par semaine">
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = padX + i * slot + (slot - bw) / 2;
        const y = padT + innerH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={Math.max(h, 1)} rx="2" fill="#818cf8" />
            <text x={x + bw / 2} y={H - 5} textAnchor="middle" fill="#64748b" fontSize="8">
              {d.label}
            </text>
          </g>
        );
      })}
      <text x={W - padX} y={11} textAnchor="end" fill="#94a3b8" fontSize="9">
        max {max.toLocaleString('fr-FR')}
        {unit}
      </text>
    </svg>
  );
}
