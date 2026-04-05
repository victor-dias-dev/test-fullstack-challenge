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

/** Call once after user gesture so browsers allow playback (e.g. first tap on the page). */
export function unlockGameAudio(): void {
  try {
    void getContext().resume();
  } catch {
    /* ignore */
  }
}

async function beepAsync(
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gain = 0.08,
): Promise<void> {
  try {
    const ctx = getContext();
    await ctx.resume();
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
  void beepAsync(660, 80, "square", 0.06);
}

export function playCashoutSound(): void {
  void (async () => {
    await beepAsync(880, 100, "sine", 0.09);
    await new Promise((r) => setTimeout(r, 90));
    await beepAsync(1320, 120, "sine", 0.07);
  })();
}

export function playCrashSound(): void {
  void beepAsync(120, 400, "sawtooth", 0.12);
}
