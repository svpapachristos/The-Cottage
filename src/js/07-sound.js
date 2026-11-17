// ============================================================ 07 · sound: soft, witchy, synthesized in code. Off unless turned on (Cottage keeping).
// No harsh sounds and no bass drones: gentle bells, a whisper of wings, a small crackle, a quiet purr.

let AC = null;
function audioOn() { if (AC) { if (AC.state === "suspended") AC.resume().catch(() => {}); return AC; } try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } return AC; }
function bell(freq, at, dur = 1.2, vol = 0.07, type = "sine") {
  const o = AC.createOscillator(), g = AC.createGain(), o2 = AC.createOscillator(), g2 = AC.createGain();
  o.type = type; o.frequency.value = freq; o2.type = "sine"; o2.frequency.value = freq * 2.01;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  g2.gain.setValueAtTime(0, at); g2.gain.linearRampToValueAtTime(vol * 0.25, at + 0.01); g2.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.6);
  o.connect(g).connect(AC.destination); o2.connect(g2).connect(AC.destination); o.start(at); o2.start(at); o.stop(at + dur + 0.05); o2.stop(at + dur + 0.05);
}
function hush(at, dur, vol, lo, hi, shape) {   // filtered noise: wings, crackles, purrs
  const n = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (shape ? shape(i / n, i) : 1);
  const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  src.buffer = buf; f.type = "bandpass"; f.frequency.value = (lo + hi) / 2; f.Q.value = (lo + hi) / 2 / Math.max(1, hi - lo);
  g.gain.value = vol; src.connect(f).connect(g).connect(AC.destination); src.start(at);
}
function sfx(name) {
  if (!PREF.get("sound", false) || !audioOn()) return;
  const t = AC.currentTime + 0.01;
  try {
    if (name === "rune") { bell(880, t, 0.9, 0.05); bell(1318.5, t + 0.07, 1.1, 0.035); }
    else if (name === "send") { hush(t, 0.5, 0.18, 600, 1800, p => Math.sin(p * Math.PI) * (0.6 + 0.4 * Math.sin(p * 40))); bell(1046.5, t + 0.25, 1, 0.04); }
    else if (name === "done") { bell(659.3, t, 1.3, 0.06); bell(987.8, t + 0.09, 1.4, 0.05); bell(1318.5, t + 0.18, 1.6, 0.035); }
    else if (name === "toss") { hush(t, 0.35, 0.12, 500, 1600, p => Math.sin(p * Math.PI)); hush(t + 0.8, 0.9, 0.22, 900, 3200, (p) => (Math.random() < 0.01 ? 2.5 : 0.1) * (1 - p)); }
    else if (name === "hex") { bell(740, t, 0.6, 0.04, "triangle"); bell(554, t + 0.08, 0.8, 0.035, "triangle"); }
    else if (name === "burn") { hush(t, 2.2, 0.32, 900, 3200, (p, i) => (Math.random() < 0.004 ? 3 : 0.12) * (1 - p)); bell(392, t + 0.1, 1.8, 0.03); }
    else if (name === "purr") { hush(t, 1.4, 0.22, 180, 520, p => (0.5 + 0.5 * Math.sin(p * 1.4 * 2 * Math.PI * 24)) * Math.sin(p * Math.PI)); }
    else if (name === "caw") { bell(523.3, t, 0.5, 0.035, "triangle"); bell(587.3, t + 0.09, 0.6, 0.03, "triangle"); }
    else if (name === "stone") { [523.3, 659.3, 784, 1046.5].forEach((f, i) => bell(f, t + i * 0.11, 1.6, 0.045)); }
    else if (name === "night") { [784, 659.3, 523.3, 392].forEach((f, i) => bell(f, t + i * 0.42, 2.2, 0.04)); }
  } catch (e) { }
}
