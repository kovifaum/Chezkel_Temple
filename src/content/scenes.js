import { S40 } from './scenes40.js';
import { S41 } from './scenes41.js';
import { S42 } from './scenes42.js';
import { S43 } from './scenes43.js';
import { S44 } from './scenes44.js';

export const SCENES = {};
for (const [ch, S] of [[40, S40], [41, S41], [42, S42], [43, S43], [44, S44]]) {
  for (const [n, spec] of Object.entries(S)) SCENES[`${ch}:${n}`] = spec;
}

/** the "no verse selected" scene of each chapter (intro) */
export const CHAPTER_DEFAULT = {
  40: { f: [], ov: 'far', title: 'מבט כולל: חצר חיצונה, חצר פנימית והבית', txt: 'החצר החיצונה ("עזרת נשים") וחומתה, שלושת שעריה, החצר הפנימית ("עזרה") ושעריה, המזבח והבית – כפי שמבאר הגר״א.' },
  41: { f: ['house'], fit: ['house.walls', 'house.hlf'], ov: 'isoW', title: 'ההיכל והבית', txt: 'האולם, ההיכל וקודש הקדשים, והצלעות סביבם.' },
  42: { f: ['lk', 'house.gizra'], fit: ['lk.N.f1', 'lk.S.f1', 'lk.fifty.N', 'lk.fifty.S'], ov: 'iso', title: 'הלשכות וגבול ההר', txt: 'לשכות המאה משני צדי ההיכל, לשכות החמישים בפינות החצר הפנימית, האתיקים וגדרת הגינה; ומדידת הר הבית מבחוץ – כפי שמבאר הגר״א בחלק ב׳ של הספר.' },
  43: { f: ['altar', 'house'], fit: ['altar'], ov: 'iso', title: 'הכבוד והמזבח', txt: 'כבוד ה׳ חוזר מן המזרח; מידות המזבח וחנוכתו.' },
  44: { f: [], ov: 'far', title: 'השער הסגור והכהנים', txt: 'השער החיצון הפונה קדים סגור; דיני הלויים והכהנים.' },
};
