// Web Audio API sounds — generated on-the-fly, no file downloads needed
// Silently fails in environments without AudioContext (prevents crashes)

function makeCtx(): AudioContext | null {
  try {
    return new AudioContext();
  } catch {
    return null;
  }
}

// 答对：两声上行短音 C5 → E5
export function playCorrect() {
  const c = makeCtx();
  if (!c) return;
  [[523.25, 0], [659.25, 0.1]].forEach(([freq, delay]) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(c.destination);
    const t = c.currentTime + delay;
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

// 答错：下行钝音
export function playWrong() {
  const c = makeCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.28);
  osc.connect(gain);
  gain.connect(c.destination);
  gain.gain.setValueAtTime(0.18, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.32);
  osc.start();
  osc.stop(c.currentTime + 0.35);
}

// 完成目标：C-E-G-C 上行四音
export function playCelebration() {
  const c = makeCtx();
  if (!c) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(c.destination);
    const t = c.currentTime + i * 0.13;
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.start(t);
    osc.stop(t + 0.28);
  });
}
