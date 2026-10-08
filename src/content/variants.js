// Alternative readings that can be shown in 3D. Each group knows how to switch the model, remap the focus/measures
// of a verse, and which verses it applies to. Sources: the commentaries fetched from Sefaria and the attached book.

const filterIds = (ids, drop) => ids.filter((id) => !drop(id));

const mount = {
  apply(model, stage, opt) {
    model.setVisible('variant.mount3000', opt === 'reeds');
  },
  focus: (opt, f) => (opt === 'reeds' ? [...f.filter((t) => t !== 'court.wall'), 'variant.mount3000'] : f),
  fit: (opt, fit) => (opt === 'reeds' ? ['variant.mount3000'] : fit),
  measures: (opt, ids) => (opt === 'reeds' ? filterIds(ids, (id) => id.startsWith('court.m.')) : filterIds(ids, (id) => id.startsWith('variant.m.'))),
  anchors: (opt) => (opt === 'reeds' ? ['variant.mount.a', 'variant.mount.b'] : []),
};

const ALT = {
  'altar.m.b18': 'variant.m.alt.v32', 'altar.m.b16': 'variant.m.alt.v30', 'altar.m.b14': 'variant.m.alt.v28', 'altar.m.b12': 'variant.m.alt.v24',
  'altar.m.h1': 'variant.m.alt.h1', 'altar.m.h2': 'variant.m.alt.h5', 'altar.m.horn': 'variant.m.alt.v26', 'altar.m.ledge': 'variant.m.alt.v30',
};
const altar = {
  apply(model, stage, opt) {
    const mid = opt === 'middot';
    model.setVisible('variant.altar32', mid);
    model.setVisible('altar', !mid);
  },
  focus: (opt, f) => (opt === 'middot' ? [...new Set(f.map((t) => (t.startsWith('altar') ? 'variant.altar32' : t)))] : f),
  fit: (opt, fit) => (opt === 'middot' ? (fit || []).map((t) => (t.startsWith('altar') ? 'variant.altar32' : t)) : fit),
  measures: (opt, ids) => (opt === 'middot' ? ids.map((id) => ALT[id]).filter(Boolean).concat(ids.includes('altar.m.b18') ? ['variant.m.alt.ramp'] : []) : ids),
  anchors: (opt) => (opt === 'middot' ? ['variant.altar.a'] : []),
};

const lishkot = {
  apply(model, stage, opt) {
    const mal = opt === 'malbim';
    model.setVisible('variant.lish', mal);
    model.setVisible('lp', !mal);
  },
  focus: (opt, f) => (opt === 'malbim' ? f.map((t) => (t.startsWith('lp') ? t.replace(/^lp/, 'variant.lish') : t)) : f),
  fit: (opt, fit) => (opt === 'malbim' ? (fit || []).map((t) => (t.startsWith('lp') ? t.replace(/^lp/, 'variant.lish') : t)) : fit),
  measures: (opt, ids) => (opt === 'malbim' ? [...ids.filter((id) => !id.startsWith('lp.')), 'variant.m.lish.len', 'variant.m.lish.dep', 'variant.m.lish.room'] : ids),
  anchors: (opt) => (opt === 'malbim' ? [] : []),
};

export const VARIANTS = {
  groups: { mount, altar, lishkot },
  byVerse: {},
};

const add = (refs, v) => refs.forEach((r) => ((VARIANTS.byVerse[r] ||= []).push(v)));

add(['42:16', '42:17', '42:18', '42:19', '42:20'], {
  id: 'mount', title: 'גודל הר הבית – ״חמש מאות קנים״', default: 'reeds',
  options: [
    { k: 'reeds', label: '500 קנים = 3000 אמה לכל צד', who: 'רש״י (מב:כ) · מלבי״ם · אברבנאל · מצודות דוד · הגר״א (ספר, הערה 13)',
      note: 'הקנה הוא 6 אמות (מ:ה), ולכן כל צד של הר הבית – 3000 אמה: 36 פעמים ״הר הבית״ הראשון (500×500), לדברי רש״י. חצר הבית עצמה (500 אמה, פרק מ) עומדת בתוך ההר הגדול.' },
    { k: 'cubits', label: '500 אמה לכל צד', who: 'רד״ק (מב:טז) · משנה מידות ב:א (הר הבית של בית שני)',
      note: 'לפי רד״ק מדובר בחמש מאות אמה בלבד – וחומת הר הבית היא חומת החצר החיצונה עצמה, כבבית שני, שבו ״הר הבית היה חמש מאות אמה על חמש מאות אמה״.' },
  ],
});

add(['43:13', '43:14', '43:15', '43:16', '43:17'], {
  id: 'altar', title: 'המזבח – מזבח יחזקאל מול מזבח בית שני', default: 'ezekiel',
  options: [
    { k: 'ezekiel', label: 'מזבח יחזקאל: 18 · 16 · 14 · 12', who: 'הפסוקים (מג:יג–יז)',
      note: 'ארבע מדרגות, כל אחת מצטמצמת באמה: חיק 18×18 (גובה אמה), עזרה תחתונה 16 (2 גבה), עזרה גדולה 14 (4 גבה), הראל 12 (4 גבה) – ומעליו ארבע קרנות של ארבע אמות. המעלות פונות קדים.' },
    { k: 'middot', label: 'מזבח בית שני: 32 · 30 · 28 · 26 · 24', who: 'משנה מידות ג:א, ג:ג',
      note: 'המזבח היה 32×32; יסוד אמה גובה וכנס אמה (30); עלה חמש וכנס אמה – הסובב (28); מקום הקרנות (26); מקום הילוך רגלי הכהנים (24) – מקום המערכה. הכבש מדרום: 32 על 16. לדעת ר׳ יוסי, מתחילה היה 28×28 והוסיפו בני הגולה ארבע אמות מדרום וממערב – כשדרשו ״והאריאל שתים עשרה אורך בשתים עשרה רוחב רבוע״ (גובה המזבח במודל – סכמתי).' },
  ],
});
add(['40:17', '40:18'], {
  id: 'lishkot', title: 'שלושים לשכות – כמה ואיפה?', default: 'gra',
  options: [
    { k: 'gra', label: '30 לשכות מימין ו-30 משמאל לכל שער', who: 'ביאור הגר״א (הספר, עמ׳ 10)',
      note: 'בכל צד של כל שער – רצפה (בניין) ברוחב 44 אמה, ועליה שלוש קומות של 10 חדרים: 30 לשכות. סה״כ 180 לשכות סביב החצר.' },
    { k: 'malbim', label: '30 לשכות בסך הכול (10 בכל רוח)', who: 'מלבי״ם (מ:יז)',
      note: 'לדעת המלבי״ם ״ולא באר כמה לשכות היו בכל צד״, ויש להבין ״שלשים״ כסך הכול: עשרה בכל אחת משלוש הרוחות – חמש מכאן וחמש מכאן לשער – על רצפת אבן מוגבהת באורך 34 אמה לאורך החומה (כאורך מערכת התאים), ועליה לשכות ברוחב ארבע אמות; ואם סופרים את שלוש הקומות – גם 30 בכל רוח.' },
  ],
});
