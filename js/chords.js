/* chords.js — Super+N / Super+Shift+N workspace chords.
   Shift+2 types @ or " so we key off physical Digit/Numpad codes. */
(function (root) {
  const SHIFTED_DIGIT = { '!': 1, '@': 2, '#': 3, '$': 4, '%': 5, '"': 2, '£': 3, '§': 3 };

  function workspaceChord(e) {
    let n = null;
    const code = e.code || '';
    const fromCode = /^(?:Digit|Numpad)([1-4])$/.exec(code);
    if (fromCode) n = +fromCode[1];
    else if (/^[1-4]$/.test(e.key || '')) n = +(e.key);
    else if (SHIFTED_DIGIT[e.key]) n = SHIFTED_DIGIT[e.key];
    if (!n) return null;
    const carry = !!(e.shiftKey || (e.key && e.key !== String(n)));
    return carry
      ? { act: 'carry', ws: n, label: 'Super + Shift + ' + n }
      : { act: 'goto', ws: n, label: 'Super + ' + n };
  }

  const Chords = { workspaceChord };
  if (typeof module !== 'undefined' && module.exports) module.exports = Chords;
  root.OmarchyChords = Chords;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
