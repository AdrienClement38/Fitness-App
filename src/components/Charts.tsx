/** Graphiques SVG minimalistes, sans dépendance : graduations + infobulle au survol/touché. */
import {useState, type PointerEvent as ReactPointerEvent} from 'react';

interface Point {
  label: string;
  value: number;
}

/** Bornes et graduations « rondes » pour un axe (algo classique nice-numbers). */
function niceScale(min: number, max: number, count = 4) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const niceNum = (range: number, round: boolean) => {
    const exp = Math.floor(Math.log10(range || 1));
    const f = range / Math.pow(10, exp);
    let nf: number;
    if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
    else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * Math.pow(10, exp);
  };
  const range = niceNum(max - min, false);
  const step = niceNum(range / (count - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return {niceMin, niceMax, ticks};
}

const fmtTick = (v: number) => {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 100) / 10}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};

export function LineChart({data, unit = ''}: {data: Point[]; unit?: string}) {
  const [active, setActive] = useState<number | null>(null);
  const W = 320;
  const H = 160;
  const padL = 24;
  const padR = 8;
  const padT = 16;
  const padB = 20;
  if (data.length === 0) return null;

  const vals = data.map((d) => d.value);
  const {niceMin, niceMax, ticks} = niceScale(Math.min(...vals), Math.max(...vals));
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const X = (i: number) => (data.length === 1 ? padL + innerW / 2 : padL + (i / (data.length - 1)) * innerW);
  const Y = (v: number) => padT + innerH - ((v - niceMin) / (niceMax - niceMin)) * innerH;

  const line = data.map((d, i) => `${X(i).toFixed(1)},${Y(d.value).toFixed(1)}`).join(' ');
  const area = `${X(0).toFixed(1)},${(padT + innerH).toFixed(1)} ${line} ${X(data.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)}`;
  const last = data[data.length - 1];

  const onMove = (e: ReactPointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - r.left) / r.width;
    setActive(Math.max(0, Math.min(data.length - 1, Math.round(frac * (data.length - 1)))));
  };
  const a = active != null ? data[active] : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y select-none" role="img" aria-label="Courbe de progression">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} y1={Y(t)} x2={W - padR} y2={Y(t)} stroke="#1e293b" strokeWidth="0.5" />
          <text x={padL - 3} y={Y(t) + 3} textAnchor="end" fill="#475569" fontSize="8">
            {fmtTick(t)}
          </text>
        </g>
      ))}

      <polygon points={area} fill="url(#areaGrad)" />
      <polyline points={line} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={X(i)} cy={Y(d.value)} r={active === i ? 4 : 2.5} fill="#34d399" />
      ))}

      {a == null && (
        <text x={X(data.length - 1)} y={Y(last.value) - 6} textAnchor="end" fill="#34d399" fontSize="10" fontWeight="bold">
          {last.value}
          {unit}
        </text>
      )}

      <text x={padL} y={H - 4} fill="#64748b" fontSize="9">
        {data[0].label}
      </text>
      {data.length > 1 && (
        <text x={W - padR} y={H - 4} textAnchor="end" fill="#64748b" fontSize="9">
          {last.label}
        </text>
      )}

      {a != null &&
        (() => {
          const x = X(active!);
          const y = Y(a.value);
          const bw = 64;
          const bh = 30;
          const bx = Math.max(0, Math.min(W - bw, x - bw / 2));
          const by = Math.max(0, y - bh - 8);
          return (
            <g pointerEvents="none">
              <line x1={x} y1={padT} x2={x} y2={padT + innerH} stroke="#475569" strokeWidth="0.5" strokeDasharray="2 2" />
              <rect x={bx} y={by} width={bw} height={bh} rx="4" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
              <text x={bx + bw / 2} y={by + 12} textAnchor="middle" fill="#94a3b8" fontSize="8">
                {a.label}
              </text>
              <text x={bx + bw / 2} y={by + 24} textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">
                {a.value}
                {unit}
              </text>
            </g>
          );
        })()}

      <rect
        x={padL}
        y={padT}
        width={innerW}
        height={innerH}
        fill="transparent"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
      />
    </svg>
  );
}

export function BarChart({data, unit = ''}: {data: Point[]; unit?: string}) {
  const [active, setActive] = useState<number | null>(null);
  const W = 320;
  const H = 150;
  const padL = 26;
  const padR = 8;
  const padT = 14;
  const padB = 20;
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const {niceMax, ticks} = niceScale(0, max);
  const innerH = H - padT - padB;
  const innerW = W - padL - padR;
  const slot = innerW / data.length;
  const bw = Math.min(slot * 0.6, 30);
  const Y = (v: number) => padT + innerH - (v / niceMax) * innerH;
  const a = active != null ? data[active] : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="Volume par semaine">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} y1={Y(t)} x2={W - padR} y2={Y(t)} stroke="#1e293b" strokeWidth="0.5" />
          <text x={padL - 3} y={Y(t) + 3} textAnchor="end" fill="#475569" fontSize="8">
            {fmtTick(t)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const y = Y(d.value);
        const x = padL + i * slot + (slot - bw) / 2;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={Math.max(padT + innerH - y, 1)} rx="2" fill={active === i ? '#a5b4fc' : '#818cf8'} />
            <text x={padL + i * slot + slot / 2} y={H - 5} textAnchor="middle" fill="#64748b" fontSize="8">
              {d.label}
            </text>
            <rect
              x={padL + i * slot}
              y={padT}
              width={slot}
              height={innerH}
              fill="transparent"
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
            />
          </g>
        );
      })}

      {a != null &&
        (() => {
          const x = padL + active! * slot + slot / 2;
          const bwid = 74;
          const bh = 30;
          const bx = Math.max(0, Math.min(W - bwid, x - bwid / 2));
          return (
            <g pointerEvents="none">
              <rect x={bx} y={2} width={bwid} height={bh} rx="4" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
              <text x={bx + bwid / 2} y={14} textAnchor="middle" fill="#94a3b8" fontSize="8">
                sem. {a.label}
              </text>
              <text x={bx + bwid / 2} y={26} textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="bold">
                {a.value.toLocaleString('fr-FR')}
                {unit}
              </text>
            </g>
          );
        })()}
    </svg>
  );
}
