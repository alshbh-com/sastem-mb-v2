let ctx: AudioContext | null = null;
const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
};

export const beep = (ok: boolean) => {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = ok ? 'sine' : 'square';
    o.frequency.value = ok ? 880 : 220;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (ok ? 0.12 : 0.25));
    o.start();
    o.stop(c.currentTime + (ok ? 0.13 : 0.26));
  } catch {}
};
