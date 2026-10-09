// Alternative readings that can be shown in 3D. Each group knows how to switch the model, remap the focus/measures
// of a verse, and which verses it applies to. Sources: the commentaries fetched from Sefaria and the attached book.

const filterIds = (ids, drop) => ids.filter((id) => !drop(id));

const mount = {
  apply(model, stage, opt) {
    model.setVisible('variant.mount3000', opt === 'reeds');
  },
  // only the phrases about the wall itself are redrawn as the 3000-cubit mount; other phrases keep their own focus
  focus: (opt, f) => (opt === 'reeds' && f.includes('court.wall') ? [...f.filter((t) => t !== 'court.wall'), 'variant.mount3000'] : f),
  fit: (opt, fit) => (opt === 'reeds' ? ['variant.mount3000'] : fit),
  measures: (opt, ids) => (opt === 'reeds' ? filterIds(ids, (id) => id.startsWith('court.m.')) : filterIds(ids, (id) => id.startsWith('variant.m.'))),
  anchors: (opt) => (opt === 'reeds' ? ['variant.mount.a', 'variant.mount.b'] : []),
};

// the Gra's altar -> the matching dimension lines of the Second-Temple altar (book fn. 10: "12 אמה" = from the middle each way = 24 for the
// place of the fire; with the horn cubit and the priests' walking cubit 28, with the sovev 30, with the base 32)
const ALT = {
  'altar.m.b16': ['variant.m.alt.v32'], 'altar.m.b14': ['variant.m.alt.v30'], 'altar.m.b12': ['variant.m.alt.v28', 'variant.m.alt.v24'],
  'altar.m.h2': ['variant.m.alt.h1'], 'altar.m.h4a': ['variant.m.alt.h5'], 'altar.m.h4b': ['variant.m.alt.h3', 'variant.m.alt.hh1'],
  'altar.m.horn': ['variant.m.alt.hh1'], 'altar.m.h10': ['variant.m.alt.h10'],
};
const RAMP = ['variant.m.alt.ramp', 'variant.m.alt.rampW'];
const altar = {
  apply(model, stage, opt) {
    const mid = opt === 'middot';
    model.setVisible('variant.altar32', mid);
    model.setVisible('altar', !mid);
  },
  focus: (opt, f) => (opt === 'middot' ? [...new Set(f.map((t) => (t.startsWith('altar') ? 'variant.altar32' : t)))] : f),
  fit: (opt, fit) => (opt === 'middot' ? [...new Set((fit || []).map((t) => (t.startsWith('altar') ? 'variant.altar32' : t)))] : fit),
  measures: (opt, ids) => {
    if (opt !== 'middot') return ids;
    const out = [...new Set(ids.flatMap((id) => ALT[id] || []))];
    return out.includes('variant.m.alt.v32') ? [...out, ...RAMP] : out;
  },
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
  id: 'altar', title: 'המזבח – מזבח הגר״א מול מזבח בית שני', default: 'gra',
  options: [
    { k: 'gra', label: 'מזבח הגר״א: 16 · 14 · 12 (גובה 2 · 4 · 4)', who: 'ביאור הגר״א – פשט המקראות (הספר, מג:יג–יז)',
      note: 'שלושה חלקים מרובעים זה על גב זה: היסוד (״חיק״, ״עזרה קטנה״) – 16×16 וגובהו שתי אמות, בולט אמה מכל צד מן הסובב; הסובב (״עזרה גדולה״) – 14×14 וגובהו ארבע אמות, ובקצהו העליון ה״גבול״ – מדף בן חצי אמה (זרת) התלוי באוויר, ולכן 15×15 עם הגבול; והראל/אריאל – 12×12 וגובהו ארבע אמות כולל ארבע הקרנות (הקרנות לבדן – אמה אחת). בסך הכול 10 אמות גובה. כל המידות הנזכרות באמה קטנה (חמישה טפחים), חוץ מארבע אמות גובה הסובב וארבע אמות גובה ההראל, שהן באמות רחבות (ששה טפחים) – 58 טפחים בסך הכול (שתי אמות קטנות ושמונה רחבות). הכבש (״מעלותהו״) – מדרום למזבח, פונה קדים: קרוב יותר לצד מזרח ולא באמצע.' },
    { k: 'middot', label: 'מזבח בית שני: 32 · 30 · 28 (· 26 · 24)', who: 'דרשת חז״ל · משנה מידות ג:א, ג:ג (הערה 10 בספר)',
      note: 'חז״ל דרשו שה״שתים עשרה אורך בשתים עשרה רוחב״ הן מאמצע המזבח לכל כיוון – כלומר 24 אמות (משנה מידות ג:א: ״אל ארבעת רבעיו – מלמד שמן האמצע הוא מודד שתים עשרה אמה לכל רוח״). מידה זו היא רק למקום המערכה, בלי הקרנות (אמה מכל צד) ובלי הילוך רגלי הכהנים (אמה מכל צד): האריאל כולו 28, הסובב 30 והיסוד 32. כך היה בבית שני: המזבח 32×32; עלה אמה וכנס אמה – היסוד (30); עלה חמש וכנס אמה – הסובב (28); מקום הקרנות (26); מקום הילוך רגלי הכהנים (24) – מקום המערכה. הכבש – מדרום, 32 על 16. המזבח תפס אפוא מקום גדול בעזרה (32 אמה, והכבש עוד 32), ואילו לפי הגר״א הוא קטן בהרבה: היסוד בבית שני כפול פי 4 באמות מרובעות, ומקום המערכה – פי 9. עוד שוני: בבית שני היסוד לא היה סביב כל המזבח (״ואוכל בדרום אמה אחת ובמזרח אמה אחת״), ואילו בפסוקים כאן היסוד סביב כולו. גבהי המודל (1 · 5 · 3 · 1, בסך הכול 10 – כבמזבח הגר״א) הושלמו בהשערה.' },
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
