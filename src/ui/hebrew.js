const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];

/** 1..99 → Hebrew numeral with geresh/gershayim (ה׳, י״א, ט״ו) */
export function gem(n) {
  let s;
  if (n === 15) s = 'טו';
  else if (n === 16) s = 'טז';
  else s = TENS[Math.floor(n / 10)] + ONES[n % 10];
  return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
}

export const CH_NAME = { 40: 'מ', 41: 'מא', 42: 'מב', 43: 'מג', 44: 'מד' };

/** remove cantillation + vowel points, turn maqaf into a space */
export function strip(s) {
  return s.replace(/[֑-ׇ]/g, '').replace(/־/g, ' ').replace(/[()[\]]/g, '').replace(/\s+/g, ' ').trim();
}

/** Split a pointed verse into clickable words. A maqaf-joined pair becomes two words. */
export function tokenize(he) {
  const out = [];
  let inKetiv = false;
  for (const chunk of he.split(' ')) {
    if (!chunk) continue;
    const parts = chunk.split('־');
    parts.forEach((p, i) => {
      if (!p) return;
      const startsK = p.startsWith('(');
      const endsK = p.endsWith(')');
      if (startsK) inKetiv = true;
      out.push({
        raw: p + (i < parts.length - 1 ? '־' : ''),
        key: strip(p),
        ketiv: inKetiv,
        glue: i < parts.length - 1,
      });
      if (endsK) inKetiv = false;
    });
  }
  return out;
}

const PREFIXES = ['ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש'];
/** candidate stems of a word: itself, then with leading prefix letters stripped (up to 3) */
export function stems(word) {
  const res = new Set([word]);
  let cur = [word];
  for (let depth = 0; depth < 3; depth++) {
    const next = [];
    for (const w of cur) {
      if (w.length > 2 && PREFIXES.includes(w[0])) {
        const t = w.slice(1);
        if (!res.has(t)) { res.add(t); next.push(t); }
      }
    }
    cur = next;
  }
  return [...res];
}
