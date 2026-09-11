/* audio.js — tiny WebAudio bleeps, no assets */
(function () {
  let ctx = null, muted = false;
  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function beep(freq, dur, type, vol) {
    if (muted) return;
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.value = vol || 0.05;
      o.connect(g); g.connect(c.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (dur || 0.08));
      o.stop(c.currentTime + (dur || 0.08));
    } catch (_) {}
  }
  window.Sfx = {
    move() { beep(520, 0.05); },
    bad() { beep(140, 0.15, 'sawtooth', 0.07); },
    good() { beep(880, 0.09); setTimeout(() => beep(1320, 0.09), 70); },
    jump() { beep(660, 0.07, 'sine', 0.07); },
    alarm() { beep(220, 0.2, 'sawtooth', 0.06); },
    toggleMute() { muted = !muted; return muted; }
  };
})();
