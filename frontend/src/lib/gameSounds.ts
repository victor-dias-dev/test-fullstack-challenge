/**
 * Bonus: lightweight UI sounds (Web Audio API, no asset files).
 */

let audioContext: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function beep(
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gain = 0.08,
): void {
  try {
    const ctx = getContext();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  } catch {
    /* ignore */
  }
}

export function playBetSound(): void {
  beep(660, 80, "square", 0.06);
}

export function playCashoutSound(): void {
  beep(880, 100, "sine", 0.09);
  setTimeout(() => beep(1320, 120, "sine", 0.07), 90);
}

export function playCrashSound(): void {
  beep(120, 400, "sawtooth", 0.12);
}
