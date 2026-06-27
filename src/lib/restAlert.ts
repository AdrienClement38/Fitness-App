/**
 * Bip de fin de repos (Web Audio). Aucune permission, mais l'audio doit être
 * « débloqué » par un geste utilisateur (politique autoplay des navigateurs, iOS
 * surtout) : on appelle armAudio() dans le handler du tap « série faite » qui lance
 * le repos. Le bip peut ensuite sonner plus tard, même après 2 min de repos.
 * Tout est best-effort : no-op si Web Audio est indisponible.
 */
let ctx: AudioContext | null = null;

type ACtor = typeof AudioContext;
function audioCtor(): ACtor | undefined {
  return window.AudioContext || (window as unknown as {webkitAudioContext?: ACtor}).webkitAudioContext;
}

/** À appeler DANS un gestionnaire d'événement (tap) pour créer/réveiller le contexte audio. */
export function armAudio(): void {
  try {
    if (!ctx) {
      const Ctor = audioCtor();
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  } catch {
    /* Web Audio indisponible */
  }
}

/** Joue deux brèves notes montantes. No-op si l'audio n'a pas pu être armé. */
export function beep(): void {
  if (!ctx || ctx.state !== 'running') return;
  try {
    const t0 = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t0 + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    });
  } catch {
    /* ignore */
  }
}
