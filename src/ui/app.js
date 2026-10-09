import { Stage } from '../engine/stage.js';
import { tagMatches } from '../engine/batch.js';
import { buildModel } from '../model/index.js';
import { FX } from './fx.js';
import { gem, CH_NAME, strip, tokenize, stems } from './hebrew.js';
import { SCENES, CHAPTER_DEFAULT } from '../content/scenes.js';
import { LEXICON } from '../content/lexicon.js';
import { PARTS, mapTokens } from '../content/parts.js';
import { GRA, GRA_INTRO } from '../content/gra.js';
import { NOTES } from '../content/notes.js';
import { MISHNAH } from '../content/mishnah.js';
import { VARIANTS } from '../content/variants.js';
import ch40 from '../../data/ch40.json';
import ch41 from '../../data/ch41.json';
import ch42 from '../../data/ch42.json';
import ch43 from '../../data/ch43.json';
import ch44 from '../../data/ch44.json';

const DATA = { 40: ch40, 41: ch41, 42: ch42, 43: ch43, 44: ch44 };
const TABS = [
  ['m3d', 'תלת־ממד'],
  ['gra', 'הגר״א · הספר'],
  ['en', 'English'],
];
const MODES = [['ghost', 'בהקשר', '◐'], ['isolate', 'מבודד', '◼'], ['normal', 'רגיל', '○']];

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function startApp(root) {
  root.innerHTML = `
  <div class="app">
    <aside class="panel" id="panel">
      <header class="panel-head">
        <div class="brand"><span class="brand-mark">⌂</span><div><h1>תבנית הבית</h1><small>יחזקאל פרקים מ–מד · בתלת־ממד</small></div></div>
        <nav class="chapters" id="chapters"></nav>
        <div class="panel-tools"><button id="introBtn" class="chip">מבוא לפרק</button><button id="helpBtn" class="chip">איך משתמשים?</button></div>
      </header>
      <div class="verses" id="verses" tabindex="0"></div>
      <footer class="panel-foot">נוסח המקרא: ספריא (Miqra according to the Masorah) · ביאור הגר״א ומידות הבית לפי הספר המצורף</footer>
    </aside>
    <main class="view" id="view">
      <div class="stage" id="stage"></div>
      <div class="hud" id="hud"></div>
      <div class="toolbar" id="toolbar"></div>
      <div class="cutbar" id="cutbar" hidden><label>חתך אופקי <input id="cut" type="range" min="2" max="125" value="125"></label><button id="cutOff" class="chip">בטל חתך</button></div>
      <div class="pickmenu" id="pickmenu" hidden></div>
      <div class="walkbar" id="walkbar" hidden>
        <div class="walk-t">🧍 תצוגת 360° · גררו להביט סביב · גלגלת – זום · WASD / חצים – ללכת · לחיצה על הרצפה – ללכת לשם</div>
        <div class="walk-r"><select id="walkPlaces" aria-label="מקומות לעמוד בהם"></select><button id="walkExit" class="chip">✕ יציאה מהתצוגה הפנימית</button></div>
        <div class="dpad" aria-hidden="true"><button data-k="KeyW">▲</button><button data-k="KeyA">◀</button><button data-k="KeyS">▼</button><button data-k="KeyD">▶</button></div>
      </div>
      <div class="lostbanner" id="lostbanner" hidden>החיבור לכרטיס הגרפי נותק – ממתין לשחזור… (אפשר לרענן את הדף)</div>
      <section class="card" id="card" hidden></section>
      <div class="loading" id="loading">בונה את המקדש… <i></i></div>
    </main>
  </div>
  <div class="modal" id="modal" hidden><div class="modal-box"><button class="modal-x" id="modalX" aria-label="סגור">✕</button><div id="modalBody"></div></div></div>`;

  const $ = (id) => root.querySelector('#' + id);
  const stageEl = $('stage');
  const S = { ch: 40, n: null, w: null, p: null, tab: 'm3d', mode: 'ghost', cut: null, dims: true, tour: false, walk: false, sound: false, cardOpen: window.innerWidth >= 860, variant: {} };

  // ---------------------------------------------------------------- 3D
  const stage = new Stage(stageEl, { onPick });
  const model = buildModel();
  stage.setModel(model);
  const fx = new FX(stage, model);
  fx.setDoors({ heichal: false, kk: false, east: true });
  window.__app = { stage, model, S, fx, PARTS, SCENES, VARIANTS, LEXICON, GRA, MISHNAH, NOTES, go: (...a) => go(...a) };
  stage.overview();
  requestAnimationFrame(() => setTimeout(() => $('loading').classList.add('gone'), 400));

  // index of verses by focus tag (used when clicking things in 3D)
  // entries: [tag, ref, part index | null] – parts first so that a click on the model finds the exact phrase
  const tagIndex = [];
  for (const [ref, list] of Object.entries(PARTS)) {
    const at = SCENES[ref]?.at || '';
    list.forEach((p, i) => { for (const t of p.t || []) tagIndex.push([t.replace('{at}', at), ref, i]); });
  }
  for (const [ref, sc] of Object.entries(SCENES)) for (const t of sc.f || []) tagIndex.push([t, ref, null]);

  // ---------------------------------------------------------------- text panel
  const chaptersEl = $('chapters');
  Object.keys(DATA).forEach((ch) => {
    const b = el('button', 'chtab', `פרק ${CH_NAME[ch]}`);
    b.dataset.ch = ch;
    b.onclick = () => go(+ch, 1);
    chaptersEl.append(b);
  });

  const versesEl = $('verses');
  let words = []; // tokens of current verse
  function renderChapter(ch) {
    versesEl.replaceChildren();
    chaptersEl.querySelectorAll('.chtab').forEach((b) => b.classList.toggle('on', +b.dataset.ch === ch));
    const frag = document.createDocumentFragment();
    DATA[ch].verses.forEach((v) => {
      const sec = el('section', 'verse');
      sec.dataset.n = v.n;
      const num = el('button', 'vnum', gem(v.n));
      num.title = `יחזקאל ${CH_NAME[ch]}:${gem(v.n)}`;
      const p = el('p', 'vtext');
      const toks = tokenize(v.he), P = PARTS[`${ch}:${v.n}`], map = mapTokens(toks, P);
      let cur = null, curP = -2;
      toks.forEach((t, i) => {
        const pi = P ? map[i] : -1;
        if (!cur || pi !== curP) { cur = el('span', 'ph'); cur.dataset.p = pi; p.append(cur); curP = pi; }
        const w = el('span', 'w' + (t.ketiv ? ' ketiv' : ''), esc(t.raw));
        w.dataset.i = i;
        cur.append(w);
        if (!t.glue) (i + 1 < toks.length && P && map[i + 1] !== pi ? p : cur).append(document.createTextNode(' '));
      });
      sec.append(num, p);
      frag.append(sec);
    });
    versesEl.append(frag);
  }
  versesEl.addEventListener('click', (e) => {
    const sec = e.target.closest('.verse');
    if (!sec) return;
    const n = +sec.dataset.n;
    let w = e.target.closest('.w');
    if (!w) w = e.target.closest('.ph')?.querySelector('.w:not(.ketiv)');
    if (w) { S.tab = 'm3d'; S.cardOpen = true; }
    go(S.ch, n, w ? +w.dataset.i : null);
  });

  // ---------------------------------------------------------------- navigation
  let scrollAnim = 0;
  function scrollTo(sec) {
    const box = versesEl.getBoundingClientRect(), r = sec.getBoundingClientRect();
    const from = versesEl.scrollTop, to = Math.max(0, from + (r.top - box.top) - (box.height - r.height) / 2);
    const t0 = performance.now(), dur = 380, id = ++scrollAnim;
    const step = (now) => {
      if (id !== scrollAnim) return;
      const k = Math.min(1, (now - t0) / dur), e = k * k * (3 - 2 * k);
      versesEl.scrollTop = from + (to - from) * e;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function go(ch, n, w = null, { scroll = true, hash = true } = {}) {
    if (ch !== S.ch || !versesEl.children.length) { S.ch = ch; renderChapter(ch); }
    S.n = n;
    S.w = w;
    if (n && S.tab === 'gra' && !GRA[`${ch}:${n}`]) S.tab = 'm3d';
    tokensFor(ch, n);
    S.p = w != null && curParts ? tokPart[w] : null;
    versesEl.querySelectorAll('.verse.on').forEach((v) => v.classList.remove('on'));
    versesEl.querySelectorAll('.w.on, .ph.on').forEach((v) => v.classList.remove('on'));
    const sec = n ? versesEl.querySelector(`.verse[data-n="${n}"]`) : null;
    if (sec) {
      sec.classList.add('on');
      if (w != null) {
        sec.querySelector(`.w[data-i="${w}"]`)?.classList.add('on');
        if (S.p != null) sec.querySelector(`.ph[data-p="${S.p}"]`)?.classList.add('on');
      }
      if (scroll) scrollTo(sec);
    }
    applyScene();
    renderCard();
    if (hash) { try { history.replaceState(null, '', n ? `#${ch}:${n}` : location.pathname + location.search); } catch (e) { /* sandboxed frames */ } }
    document.title = n ? `יחזקאל ${CH_NAME[ch]}:${gem(n)} · תבנית הבית בתלת־ממד` : 'תבנית הבית – יחזקאל מ–מד בתלת־ממד';
  }
  const verseData = () => DATA[S.ch].verses[S.n - 1];
  let curParts = null, tokPart = [];
  function tokensFor(ch, n) {
    words = n ? tokenize(DATA[ch].verses[n - 1].he) : [];
    curParts = n ? PARTS[`${ch}:${n}`] || null : null;
    tokPart = mapTokens(words, curParts);
  }
  /** pointed text of part i of the current verse */
  const partText = (i) => words.filter((t, k) => tokPart[k] === i && !t.ketiv && t.key).map((t) => t.raw.replace(/־$/, '')).join(' ');
  /** token index of the first word of part i */
  const firstWord = (i) => words.findIndex((t, k) => tokPart[k] === i && !t.ketiv && t.key);
  /** select part i of the current verse (stays on the 3D tab) */
  const selectPart = (i) => { S.tab = 'm3d'; S.cardOpen = true; go(S.ch, S.n, firstWord(i)); };
  const refOf = () => `${S.ch}:${S.n}`;
  const nextRef = (d) => {
    let ch = S.ch, n = (S.n || 0) + d;
    const len = (c) => DATA[c].verses.length;
    if (n > len(ch)) { if (ch >= 44) return null; ch++; n = 1; }
    if (n < 1) { if (ch <= 40) return null; ch--; n = len(ch); }
    return [ch, n];
  };
  const step = (d) => { const r = nextRef(d); if (r) go(r[0], r[1]); };

  // ---------------------------------------------------------------- scene application
  const expandTags = (tags, at) => (tags || []).map((t) => t.replace('{at}', at || ''));
  const resolveTags = (tags, at) => (tags || []).map((t) => t.replace('{at}', at || '')).filter((t) => t && !t.includes('{at}') && stage.boxOf([t]));
  const resolveMeasures = (ids, at, specM) => {
    let out = [];
    for (const id of ids || []) {
      if (id === '*') out.push(...(specM || []));
      else out.push(id.replace('{at}', at || ''));
    }
    return out.filter((id) => !id.includes('{at}'));
  };

  let curSpec = null;
  const variantsFor = (ref) => (VARIANTS.byVerse[ref] || []).map((v) => ({ v, g: VARIANTS.groups[v.id], opt: S.variant[v.id] || v.default }));
  function applyVariants() {
    const active = new Map(S.n ? variantsFor(refOf()).map((x) => [x.v.id, x.opt]) : []);
    for (const [id, g] of Object.entries(VARIANTS.groups)) g.apply(model, stage, active.has(id) ? active.get(id) : null);
    stage.refresh();
  }
  function applyScene() {
    if (!S.n) {
      curSpec = CHAPTER_DEFAULT[S.ch] || { f: [] };
    } else {
      curSpec = SCENES[refOf()] || { f: CHAPTER_DEFAULT[S.ch]?.f || [], txt: '' };
    }
    // alternative readings first: they change which meshes exist
    applyVariants();
    let eff = { ...curSpec };
    let wordInfo = null;
    const part = S.n && S.p != null && curParts ? curParts[S.p] : null;
    const vf = (tags) => variantsFor(refOf()).reduce((t, { g, opt }) => (g.focus ? g.focus(opt, t) : t), tags);
    if (part) {
      // a phrase of the verse: focus exactly what it describes and draw only its own measurements
      const tags = resolveTags(vf(expandTags(part.t, curSpec.at)), curSpec.at);
      const has = tags.length > 0;
      const fitT = part.fit ? resolveTags(vf(expandTags(part.fit, curSpec.at)), curSpec.at) : tags;
      eff = {
        ...curSpec,
        f: has ? tags : curSpec.f,
        fit: has ? (fitT.length ? fitT : tags) : curSpec.fit,
        m: resolveMeasures(part.m, curSpec.at, curSpec.m),
        a: [...(part.a || [])],
        v: part.v || curSpec.v,
        d: part.d ?? (has ? (curSpec.d || 1) * (S.mode === 'isolate' ? 0.42 : 0.46) : curSpec.d),
        cut: 'cut' in part ? part.cut : curSpec.cut,
        ov: has ? undefined : curSpec.ov,
        cam: has ? undefined : curSpec.cam,
      };
      if (part.ctx) eff.ctx = resolveTags(part.ctx, curSpec.at);
    } else if (S.w != null && words[S.w]) {
      wordInfo = lookupWord(words[S.w].key);
      const ov = curSpec.words && Object.entries(curSpec.words).find(([k]) => stems(words[S.w].key).includes(k));
      if (ov) wordInfo = { stem: ov[0], entry: ov[1] };
      if (wordInfo) {
        const tags = resolveTags(vf(expandTags(wordInfo.entry.t, curSpec.at)), curSpec.at);
        const ms = resolveMeasures(wordInfo.entry.m, curSpec.at, curSpec.m);
        eff = { ...curSpec, f: tags.length ? tags : curSpec.f, fit: tags.length ? tags : curSpec.fit, m: ms.length ? ms : curSpec.m, d: tags.length ? (curSpec.d || 1) * 0.85 : curSpec.d, ov: tags.length ? undefined : curSpec.ov, cam: tags.length ? undefined : curSpec.cam };
      }
    }
    if (S.n && (part || !(wordInfo && eff.f !== curSpec.f))) {
      for (const { g, opt } of variantsFor(refOf())) {
        if (!part && g.focus) eff.f = g.focus(opt, eff.f || []);
        if (g.fit && (!part || !eff.fit)) eff.fit = g.fit(opt, eff.fit);
        if (g.measures) eff.m = g.measures(opt, eff.m || []);
        if (g.anchors) eff.a = [...(eff.a || []), ...g.anchors(opt)];
      }
    }
    if (S.mode === 'isolate' && !part && S.n) {
      // the isolated model of a whole verse: every measurement of every phrase is drawn
      const ids = new Set(eff.m || []);
      for (const p of curParts || []) for (const id of resolveMeasures(p.m, curSpec.at, curSpec.m)) ids.add(id);
      eff.m = [...ids];
      eff.d = (eff.d || 1) * 0.72;
    }
    S.part = part;
    S.eff = eff;
    S.wordInfo = wordInfo;
    const modeNow = S.walk ? 'normal' : (S.mode === 'isolate' ? 'isolate' : (curSpec.mode || S.mode));
    stage.setMode(modeNow);
    stageEl.classList.toggle('isolated', modeNow === 'isolate');
    const cutNow = S.walk ? null : (S.cut != null ? S.cut : (eff.cut ?? null));
    $('cut').value = cutNow == null ? 125 : Math.max(2, Math.min(124, cutNow));
    const ctx = S.walk ? [] : (eff.ctx || (curSpec.at && stage.boxOf([curSpec.at]) ? [curSpec.at] : []));
    stage.show({ ...eff, ctx, cut: cutNow });
    const fxMode = part && part.fx !== undefined ? part.fx : (wordInfo && wordInfo.entry.fx) || curSpec.fx;
    fx.setGlory(fxMode === 'glory' ? 'approach' : fxMode === 'fill' ? 'fill' : 'off');
    fx.setDoors({
      heichal: !!curSpec.open?.includes('heichal'),
      kk: !!curSpec.open?.includes('kk'),
      east: !(curSpec.shut || S.ch === 44),
    });
    drawDims(eff);
    renderHud(wordInfo);
    if (S.walk) { const sp = walkSpot(); stage.walkTo(sp.x, sp.z, sp.yaw); }
  }

  function drawDims(spec) {
    if (!S.dims) { stage.showAnnotations([], []); return; }
    const ms = model.measuresFor(spec.m || []);
    const as = (spec.a || []).map((id) => model.anchors.get(id.replace('{at}', curSpec.at || ''))).filter((a) => a && a.text);
    stage.showAnnotations(ms, as);
  }

  // ---------------------------------------------------------------- words
  function lookupWord(key) {
    for (const s of stems(key)) {
      const entry = LEXICON.get(s);
      if (entry) return { stem: s, entry };
    }
    return null;
  }
  function graNoteFor(key) {
    const notes = GRA[refOf()] || [];
    if (key.length < 3) return null;
    return notes.find(([k]) => strip(k).split(' ').some((x) => stems(x).includes(key) || stems(key).includes(x)));
  }

  // ---------------------------------------------------------------- HUD
  function renderHud(wordInfo) {
    const hud = $('hud');
    if (!S.n) {
      hud.innerHTML = `<div class="hud-ref">יחזקאל ${CH_NAME[S.ch]}</div><div class="hud-title">מבוא לפרק – הבית במבט כולל</div>`;
      return;
    }
    const sc = curSpec;
    const w = S.w != null && words[S.w] ? words[S.w] : null;
    hud.innerHTML = `<div class="hud-ref">יחזקאל ${CH_NAME[S.ch]}:${gem(S.n)}</div>
      <div class="hud-title">${esc(sc.title || '')}</div>
      ${S.part ? `<div class="hud-word"><b>«${esc(partText(S.p))}»</b> ${esc(S.part.h)}</div>`
        : w ? `<div class="hud-word"><b>«${esc(w.key)}»</b> ${wordInfo ? esc(wordInfo.entry.g) : 'המילה אינה מסומנת במודל התלת־ממדי; מוצג כל הפסוק.'}</div>` : ''}`;
  }

  // ---------------------------------------------------------------- verse card
  const cardEl = $('card');
  function availableTabs() {
    if (!S.n) return GRA_INTRO[S.ch] ? [['m3d', 'סקירה'], ['gra', 'מבוא · הספר']] : [['m3d', 'סקירה']];
    const v = verseData();
    const c = v.c || {};
    return TABS.filter(([k]) => {
      if (k === 'm3d') return true;
      if (k === 'gra') return !!GRA[refOf()];
      if (k === 'metzudat') return !!(c.metzudatDavid || c.metzudatZion);
      if (k === 'mishna') return !!MISHNAH[refOf()];
      if (k === 'notes') return !!(NOTES[refOf()] || VARIANTS.byVerse[refOf()]);
      if (k === 'en') return !!v.en;
      return !!c[k];
    });
  }

  const syncInset = () => {
    const v = $('view').getBoundingClientRect();
    const bottom = cardEl.hidden ? 0 : Math.max(0, v.bottom - cardEl.getBoundingClientRect().top + 8);
    stage.setInset(bottom, window.innerWidth < 860 ? 52 : 70);
  };
  new ResizeObserver(syncInset).observe(cardEl);
  window.addEventListener('resize', syncInset);
  function renderCard() {
    const tabs = availableTabs();
    if (!tabs.some(([k]) => k === S.tab)) S.tab = tabs[0][0];
    cardEl.hidden = false;
    cardEl.classList.toggle('collapsed', !S.cardOpen);
    const ref = S.n ? `יחזקאל ${CH_NAME[S.ch]}:${gem(S.n)}` : `יחזקאל ${CH_NAME[S.ch]} · מבוא`;
    const hasVar = S.n && (VARIANTS.byVerse[refOf()] || []).length;
    cardEl.innerHTML = `
      <div class="card-head">
        <button class="nav" id="prevV" aria-label="פסוק קודם" title="פסוק קודם (→)">›</button>
        <div class="card-ref"><b>${ref}</b><span>${esc(curSpec?.title || '')}</span></div>
        <button class="nav" id="nextV" aria-label="פסוק הבא" title="פסוק הבא (←)">‹</button>
        <button class="nav sm" id="collapseV" aria-label="מזער/הרחב" title="מזער/הרחב">${S.cardOpen ? '▾' : '▴'}</button>
      </div>
      <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="tab${k === S.tab ? ' on' : ''}" data-tab="${k}">${l}${k === 'notes' && hasVar ? ' <i class="dot" title="כולל תצוגה תלת־ממדית של שיטות"></i>' : ''}</button>`).join('')}</div>
      <div class="card-body" id="cardBody"></div>`;
    cardEl.querySelector('#prevV').onclick = () => step(-1);
    cardEl.querySelector('#nextV').onclick = () => step(1);
    cardEl.querySelector('#collapseV').onclick = () => { S.cardOpen = !S.cardOpen; renderCard(); };
    cardEl.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { S.tab = b.dataset.tab; S.cardOpen = true; renderCard(); }));
    renderTab();
  }

  const para = (html) => `<div class="comm">${html.split(/<br\s*\/?>/i).map((p) => `<p>${p}</p>`).join('')}</div>`;
  function renderTab() {
    const body = cardEl.querySelector('#cardBody');
    if (!body) return;
    const v = S.n ? verseData() : null;
    const c = v?.c || {};
    let html = '';
    switch (S.tab) {
      case 'm3d': html = tab3d(); break;
      case 'gra': html = tabGra(); break;
      case 'metzudat':
        html = (c.metzudatDavid ? `<h4>מצודת דוד</h4>${para(c.metzudatDavid)}` : '') + (c.metzudatZion ? `<h4>מצודת ציון</h4>${para(c.metzudatZion)}` : '');
        break;
      case 'mishna': html = tabMishna(); break;
      case 'notes': html = tabNotes(); break;
      case 'en': html = `<div class="comm en" dir="ltr"><p>${esc(v.en)}</p><small>JPS Tanakh: Gender-Sensitive Edition, via Sefaria (CC BY-NC)</small></div>`; break;
      default: html = c[S.tab] ? para(c[S.tab]) : '<p class="muted">אין פירוש לפסוק זה.</p>';
    }
    if (['rashi', 'radak', 'malbim', 'abarbanel', 'targum'].includes(S.tab) && c[S.tab]) html += `<p class="src">מקור: ספריא (Sefaria.org)</p>`;
    body.innerHTML = html;
    body.scrollTop = 0;
    wireTab(body);
  }

  const fmtM = (x) => String(Number(x.toFixed(1)));
  /** "≈ 3 מ׳" for plain cubit labels ("6 אמות", "אמה") – an amah of six handbreadths ≈ 50 cm */
  const metric = (label) => {
    const m = /^(\d+(?:\.\d+)?)?\s*(אמה|אמות)$/.exec(label.trim());
    return m ? ` ≈ ${fmtM((m[1] ? +m[1] : 1) * 0.5)} מ׳` : '';
  };
  function measureChips(ids) {
    const ms = model.measuresFor(ids || []);
    if (!ms.length) return '';
    const uniq = [...new Map(ms.map((m) => [m.label, m])).values()];
    return `<div class="chips">${uniq.map((m) => `<span class="mchip">${esc(m.label)}<small>${esc(metric(m.label))}</small></span>`).join('')}</div>`;
  }
  const graNotesForPart = (i) => {
    const ws = words.filter((t, k) => tokPart[k] === i && !t.ketiv && t.key.length >= 3).map((t) => t.key);
    return (GRA[refOf()] || []).filter(([k]) => strip(k).split(' ').some((x) => x.length >= 3 && ws.some((w) => stems(x).includes(w) || stems(w).includes(x)))).slice(0, 2);
  };

  function tab3d() {
    const sc = curSpec || {};
    let h = '';
    if (!S.n) {
      return h + `<p class="m3d-txt">${esc(CHAPTER_DEFAULT[S.ch]?.txt || '')}</p>
        <div class="hint"><b>איך מתחילים?</b> לחצו על <b>פסוק</b> בטקסט – המודל יתמקד במה שהוא מתאר. לחצו על <b>מילה או חלק מהפסוק</b> – תקבלו הסבר לאותו חלק, את מידותיו, והוא יודגש במודל. לחצו על <b>חלק במודל</b> – תראו אילו חלקי פסוקים מתארים אותו. או לחצו על ״סיור״ ללימוד אוטומטי.</div>
        <div class="ctl"><button class="chip" id="startBtn">▶ התחילו בפסוק הראשון</button>${GRA_INTRO[S.ch] ? '<button class="chip" id="introTab">מבוא הספר לפרק</button>' : ''}</div>`;
    }
    const P = curParts;
    if (P && P.length > 1) {
      h += `<div class="parts" role="group" aria-label="חלקי הפסוק">${P.map((p, i) => `<button class="pchip${S.p === i ? ' on' : ''}" data-p="${i}" title="${esc(p.h)}">${esc(partText(i))}</button>`).join('')}</div>`;
    }
    if (S.part) {
      const p = S.part;
      const notes = graNotesForPart(S.p);
      h += `<div class="partcard">
        <div class="part-top"><button class="nav sm" id="pPrev" aria-label="החלק הקודם" ${S.p === 0 ? 'disabled' : ''}>›</button>
          <span class="part-n">חלק ${S.p + 1} מתוך ${P.length}</span>
          <button class="nav sm" id="pNext" aria-label="החלק הבא" ${S.p === P.length - 1 ? 'disabled' : ''}>‹</button>
          <button class="chip" id="wordClear">כל הפסוק</button></div>
        <div class="part-w">«${esc(partText(S.p))}»</div>
        <div class="part-h">${esc(p.h)}</div>
        <p class="part-e">${esc(p.e)}</p>
        ${measureChips(S.eff?.m)}
        ${notes.length ? notes.map(([k, t]) => `<div class="wordcard-n"><b>בספר – ${esc(k)}:</b> ${esc(t)}</div>`).join('') : ''}
      </div>`;
    } else if (S.w != null && words[S.w]) {
      const wi = S.wordInfo;
      const note = graNoteFor(words[S.w].key);
      h += `<div class="wordcard"><div class="wordcard-t">«${esc(words[S.w].key)}»</div>
        <div>${wi ? esc(wi.entry.g) : 'המילה אינה מסומנת במודל התלת־ממדי; מוצג הפסוק כולו.'}</div>
        ${note ? `<div class="wordcard-n"><b>בספר:</b> ${esc(note[1])}</div>` : ''}
        <button class="chip" id="wordClear">חזרה לכל הפסוק</button></div>`;
    } else {
      h += `<p class="m3d-txt">${esc(sc.txt || '')}</p>`;
      h += measureChips(S.eff?.m);
      if (P && P.length) h += `<p class="muted part-hint">לחצו על מילה או על חלק מהפסוק (למעלה או בטקסט) – לקבלת הסבר מפורט וקווי המידה שלו במודל.</p>`;
    }
    if (S.mode === 'isolate' && !S.part && P && P.length) {
      h += `<div class="plist"><h4>🔍 המודל המבודד – כל פרטי הפסוק והמידות</h4>${P.map((p, i) => {
        const ids = resolveMeasures(p.m, curSpec.at, curSpec.m);
        return `<div class="plist-i" data-p="${i}"><div class="plist-w">${esc(partText(i))}</div><div class="plist-h">${esc(p.h)}</div><p class="plist-e">${esc(p.e)}</p>${measureChips(ids)}</div>`;
      }).join('')}</div>`;
    }
    if (sc.assume && !S.part) h += `<p class="assume"><b>השלמה/פרשנות במודל:</b> ${esc(sc.assume)}</p>`;
    h += `<div class="ctl big"><button class="chip big${S.mode === 'isolate' ? ' on' : ''}" id="isoBtn">${S.mode === 'isolate' ? '↩ חזרה לתצוגה בהקשר' : '🔍 המודל המבודד של הפסוק – עם כל המידות'}</button><button class="chip big" id="walkBtn">🧍 כניסה פנימה – תצוגת 360°</button></div>
      <div class="ctl"><span>תצוגה:</span>${MODES.map(([k, l, i]) => `<button class="chip mode${(curSpec.mode || S.mode) === k ? ' on' : ''}" data-mode="${k}">${i} ${l}</button>`).join('')}
      <button class="chip" id="cutBtn">▭ חתך אופקי</button><button class="chip" id="dimBtn">${S.dims ? '📏 הסתר מידות' : '📏 הצג מידות'}</button></div>`;
    return h;
  }

  function tabGra() {
    if (!S.n) {
      const intro = GRA_INTRO[S.ch] || [];
      return `<div class="comm gra">${intro.map((p) => `<p>${p}</p>`).join('')}</div><p class="src">מתוך הספר המצורף (ביאור הגר״א ע״פ ״אור אליהו״)</p>`;
    }
    const notes = GRA[refOf()] || [];
    return `<div class="comm gra">${notes.map(([k, t]) => `<p><b class="k">${esc(k)}</b> – ${t}</p>`).join('')}</div><p class="src">מתוך הספר המצורף – ביאור הגר״א (ע״פ ״אור אליהו״ לר׳ אוריאל שונברג). נוסח מתומצת.</p>`;
  }

  function tabMishna() {
    const ms = MISHNAH[refOf()] || [];
    return `<div class="comm">${ms.map((m) => `<h4>${esc(m.h)}</h4><p>${m.t}</p>`).join('')}</div><p class="src">מקדש שני לעומת הבית של יחזקאל · מקור: ספריא</p>`;
  }

  function tabNotes() {
    let h = '';
    const vs = VARIANTS.byVerse[refOf()] || [];
    for (const v of vs) {
      const opt = S.variant[v.id] || v.default;
      h += `<div class="variant"><h4>${esc(v.title)}</h4><div class="vopts">${v.options.map((o) => `<label class="vopt${o.k === opt ? ' on' : ''}"><input type="radio" name="var-${v.id}" value="${o.k}" data-var="${v.id}" ${o.k === opt ? 'checked' : ''}><span><b>${esc(o.label)}</b><small>${esc(o.who)}</small></span></label>`).join('')}</div>
        <p class="vnote">${esc(v.options.find((o) => o.k === opt).note)}</p></div>`;
    }
    for (const n of NOTES[refOf()] || []) h += `<h4>${esc(n.t)}</h4><p>${n.b}</p>`;
    return h || '<p class="muted">אין הערות לפסוק זה.</p>';
  }

  function wireTab(body) {
    body.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { S.mode = b.dataset.mode; curSpec.mode = undefined; syncTb(); applyScene(); renderTab(); }));
    body.querySelector('#cutBtn')?.addEventListener('click', () => { $('cutbar').hidden = false; });
    body.querySelector('#dimBtn')?.addEventListener('click', () => { S.dims = !S.dims; drawDims(S.eff || curSpec); renderTab(); });
    body.querySelector('#wordClear')?.addEventListener('click', () => go(S.ch, S.n));
    body.querySelectorAll('.pchip').forEach((b) => (b.onclick = () => selectPart(+b.dataset.p)));
    body.querySelectorAll('.plist-i').forEach((b) => (b.onclick = () => selectPart(+b.dataset.p)));
    body.querySelector('#isoBtn')?.addEventListener('click', () => { S.mode = S.mode === 'isolate' ? 'ghost' : 'isolate'; curSpec.mode = undefined; syncTb(); applyScene(); renderTab(); });
    body.querySelector('#walkBtn')?.addEventListener('click', () => enterWalk());
    body.querySelector('#pPrev')?.addEventListener('click', () => selectPart(S.p - 1));
    body.querySelector('#pNext')?.addEventListener('click', () => selectPart(S.p + 1));
    body.querySelector('#startBtn')?.addEventListener('click', () => go(S.ch, 1));
    body.querySelector('#introTab')?.addEventListener('click', () => { S.tab = 'gra'; renderCard(); });
    body.querySelectorAll('[data-var]').forEach((r) => (r.onchange = () => { S.variant[r.dataset.var] = r.value; applyScene(); renderTab(); }));
  }

  // ---------------------------------------------------------------- 3D picking → verse menu
  const pick = $('pickmenu');
  const firstWordOf = (ref, i) => {
    const [c, n] = ref.split(':');
    const toks = tokenize(DATA[c].verses[n - 1].he), map = mapTokens(toks, PARTS[ref]);
    return toks.findIndex((t, k) => map[k] === i && !t.ketiv && t.key);
  };
  function onPick(tag, point) {
    const hits = new Map(); // "ref|part" → score
    for (const [t, ref, pi] of tagIndex) {
      let score = 0;
      if (t === tag) score = 3;
      else if (tagMatches(tag, t)) score = 2;
      else if (tagMatches(t, tag)) score = 1;
      const key = `${ref}|${pi ?? ''}`;
      if (score && (!hits.has(key) || hits.get(key) < score)) hits.set(key, score);
    }
    const partRefs = new Set([...hits.keys()].filter((k) => !k.endsWith('|')).map((k) => k.split('|')[0]));
    const items = [...hits.entries()].filter(([k]) => !k.endsWith('|') || !partRefs.has(k.split('|')[0]))
      .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k.split('|'));
    if (!items.length) { pick.hidden = true; return; }
    const v = point.clone().project(stage.camera);
    const x = (v.x * 0.5 + 0.5) * stage.w, y = (-v.y * 0.5 + 0.5) * stage.h;
    pick.innerHTML = `<div class="pm-t">הפסוקים והחלקים שמתארים חלק זה</div>` + items.map(([r, pi]) => {
      const [c, n] = r.split(':');
      const label = pi !== '' ? PARTS[r][+pi].h : SCENES[r].title || '';
      return `<button data-ref="${r}" data-p="${pi}">יחזקאל ${CH_NAME[c]}:${gem(+n)}<small>${esc(label)}</small></button>`;
    }).join('');
    pick.hidden = false;
    pick.style.left = Math.min(Math.max(8, x), stage.w - 230) + 'px';
    pick.style.top = Math.min(Math.max(8, y), stage.h - 40 - items.length * 40) + 'px';
    pick.querySelectorAll('button').forEach((b) => (b.onclick = () => {
      const [c, n] = b.dataset.ref.split(':');
      pick.hidden = true;
      if (b.dataset.p !== '') { S.tab = 'm3d'; S.cardOpen = true; go(+c, +n, firstWordOf(b.dataset.ref, +b.dataset.p)); } else go(+c, +n);
    }));
  }
  document.addEventListener('pointerdown', (e) => { if (!pick.hidden && !pick.contains(e.target)) pick.hidden = true; }, true);

  // ---------------------------------------------------------------- 360° inside view
  const PLACES = [
    ['שער החצר החיצונה (מזרח) – מבחוץ', 266, 0, Math.PI / 2],
    ['תוך שער החצר החיצונה', 225, 0, Math.PI / 2],
    ['החצר החיצונה – מול השער הפנימי', 140, 0, Math.PI / 2],
    ['שער החצר הפנימית (מזרח)', 78, 0, Math.PI / 2],
    ['החצר הפנימית – מול המזבח והבית', 44, 0, Math.PI / 2],
    ['המזבח – מדרום לו', 0, 16, Math.PI / 2],
    ['אולם הבית', -56, 0, Math.PI / 2],
    ['ההיכל – מבפנים', -86, 0, Math.PI / 2],
    ['קודש הקדשים', -128, 0, -Math.PI / 2],
    ['הגזרה – מאחורי הבית', -170, 0, Math.PI / 2],
    ['לשכות המאה (צפון) – המעבר', -58, -60, Math.PI],
    ['לשכות המאה (דרום) – המעבר', -58, 60, 0],
    ['לשכות החמישים (צפון-מזרח)', 90, -80, Math.PI / 2],
    ['שער החצר החיצונה (צפון)', 0, -226, Math.PI],
    ['שער החצר הפנימית (צפון)', 0, -80, Math.PI],
  ];
  const sx0 = (b) => b.max.x - b.min.x;
  function walkSpot() {
    const eff = S.eff || curSpec;
    const tags = (eff.fit && eff.fit.length ? eff.fit : eff.f) || [];
    const box = tags.length ? stage.boxOf(tags) : null;
    const at = curSpec.at || '';
    const yaw = /\.N(\.|$)/.test(at) ? Math.PI : /\.S(\.|$)/.test(at) ? 0 : Math.PI / 2;
    if (curSpec.walk) return { x: curSpec.walk[0], z: curSpec.walk[1], yaw: curSpec.walk[2] };
    if (at === 'house' && sx0(box) > 40) return { x: -88, z: 0, yaw: Math.PI / 2 }; // inside the heichal rather than inside a wall
    if (!box) return { x: 266, z: 0, yaw: Math.PI / 2 };
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    const sx = box.max.x - box.min.x, sz = box.max.z - box.min.z;
    // a small object (altar, reed, a table…) is viewed from beside it; a room or a gate is entered
    if (sx < 26 && sz < 26) return { x: Math.min(box.max.x + 16, 250), z: cz, yaw: Math.PI / 2 };
    return { x: cx, z: cz, yaw };
  }
  function enterWalk() {
    if (S.walk) return;
    S.walk = true;
    S.cardWasOpen = S.cardOpen;
    S.cardOpen = false;
    stage.fly = null;
    const sp = walkSpot();
    root.querySelector('.app').classList.add('walking');
    stage.enterWalk(sp.x, sp.z, sp.yaw);
    $('walkbar').hidden = false;
    stopTour();
    applyScene();
    renderCard();
    syncTb();
  }
  function exitWalk() {
    if (!S.walk) return;
    S.walk = false;
    stage.exitWalk();
    root.querySelector('.app').classList.remove('walking');
    $('walkbar').hidden = true;
    S.cardOpen = S.cardWasOpen !== false;
    applyScene();
    renderCard();
    syncTb();
  }
  {
    const sel = $('walkPlaces');
    sel.innerHTML = '<option value="">🧭 קפצו למקום…</option>' + PLACES.map((p, i) => `<option value="${i}">${p[0]}</option>`).join('');
    sel.onchange = () => { if (sel.value !== '') { const p = PLACES[+sel.value]; stage.walkTo(p[1], p[2], p[3]); sel.value = ''; } };
    $('walkExit').onclick = exitWalk;
    $('walkbar').querySelectorAll('.dpad button').forEach((b) => {
      const k = b.dataset.k;
      const on = (e) => { e.preventDefault(); stage.walk?.keys.add(k); };
      const off = () => stage.walk?.keys.delete(k);
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
  }
  stage.onAutoQuality = (q) => { S.q = q; syncTb(); };
  stage.onLost = (lost) => { $('lostbanner').hidden = !lost; };

  // ---------------------------------------------------------------- toolbar
  const tb = $('toolbar');
  const btn = (id, label, title, fn) => {
    const b = el('button', 'tbtn', label);
    b.id = id; b.title = title; b.setAttribute('aria-label', title); b.onclick = fn;
    tb.append(b);
    return b;
  };
  btn('tbHome', '⌂<span>מבט כללי</span>', 'מבט כללי על הבית', () => { S.tab = 'm3d'; go(S.ch, 0, null, { scroll: false }); });
  const modeBtn = btn('tbMode', '◐<span>שקוף</span>', 'מצב תצוגה: שקוף / בידוד / רגיל', () => {
    const i = MODES.findIndex(([k]) => k === S.mode);
    S.mode = MODES[(i + 1) % MODES.length][0];
    curSpec.mode = undefined;
    syncTb();
    applyScene();
    if (S.tab === 'm3d') renderTab();
  });
  btn('tbIso', '🔍<span>מבודד</span>', 'מודל מבודד של הפסוק – עם כל המידות', () => {
    S.mode = S.mode === 'isolate' ? 'ghost' : 'isolate';
    curSpec.mode = undefined;
    syncTb();
    applyScene();
    if (S.tab === 'm3d') renderTab();
  });
  btn('tbWalk', '🧍<span>360°</span>', 'כניסה פנימה – תצוגת 360° (כמו Street View)', () => (S.walk ? exitWalk() : enterWalk()));
  btn('tbCut', '▭<span>חתך</span>', 'חתך אופקי – לראות לתוך המבנים', () => { $('cutbar').hidden = !$('cutbar').hidden; });
  btn('tbDims', '📏<span>מידות</span>', 'הצג/הסתר מידות', () => { S.dims = !S.dims; drawDims(S.eff || curSpec); syncTb(); });
  btn('tbTour', '▶<span>סיור</span>', 'סיור אוטומטי בפסוקים', () => toggleTour());
  btn('tbSound', '🔈<span>צליל</span>', 'צליל "קול מים רבים" בפסוק בו כבוד ה׳ בא', () => { S.sound = !S.sound; fx.setSound(S.sound); syncTb(); });
  btn('tbQ', '⚙<span>איכות</span>', 'איכות גרפית (גבוהה / בינונית / נמוכה)', () => {
    S.q = S.q === 'high' ? 'mid' : S.q === 'mid' ? 'low' : 'high';
    stage.setQuality(S.q);
    syncTb();
  });
  S.q = 'high';
  if ((navigator.hardwareConcurrency || 8) <= 4 || window.innerWidth < 700) { S.q = 'mid'; stage.setQuality('mid'); }
  function syncTb() {
    const m = MODES.find(([k]) => k === S.mode);
    modeBtn.innerHTML = `${m[2]}<span>${m[1]}</span>`;
    $('tbDims').classList.toggle('off', !S.dims);
    $('tbIso').classList.toggle('on', S.mode === 'isolate');
    $('tbWalk').classList.toggle('on', S.walk);
    $('tbSound').innerHTML = `${S.sound ? '🔊' : '🔈'}<span>צליל</span>`;
    $('tbSound').classList.toggle('on', S.sound);
    $('tbTour').innerHTML = `${S.tour ? '⏸' : '▶'}<span>${S.tour ? 'עצור' : 'סיור'}</span>`;
    $('tbQ').innerHTML = `⚙<span>${{ high: 'גבוהה', mid: 'בינונית', low: 'נמוכה' }[S.q]}</span>`;
  }
  syncTb();

  $('cut').addEventListener('input', (e) => {
    const v = +e.target.value;
    S.cut = v >= 125 ? null : v;
    stage.setCut(S.cut);
  });
  $('cutOff').onclick = () => { S.cut = null; $('cut').value = 125; stage.setCut((S.eff || curSpec)?.cut ?? null); $('cutbar').hidden = true; };

  // tour: each verse as a whole, then its parts one after another
  let tourT = null;
  function toggleTour() {
    S.tour = !S.tour;
    clearTimeout(tourT);
    syncTb();
    if (S.tour) {
      if (!S.n) go(S.ch, 1);
      const tick = () => {
        if (!S.tour) return;
        const P = curParts;
        if (S.n && P && P.length > 1 && (S.p == null || S.p < P.length - 1)) {
          const nx = S.p == null ? 0 : S.p + 1;
          S.tab = 'm3d';
          go(S.ch, S.n, firstWord(nx));
        } else {
          const r = nextRef(1);
          if (!r) { S.tour = false; syncTb(); return; }
          go(r[0], r[1]);
        }
        tourT = setTimeout(tick, 6500);
      };
      tourT = setTimeout(tick, 6500);
    }
  }
  const stopTour = () => { if (S.tour) { S.tour = false; clearTimeout(tourT); syncTb(); } };
  stageEl.addEventListener('pointerdown', stopTour);

  // keyboard (RTL: ← is "next")
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (S.walk) { if (e.key === 'Escape') exitWalk(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(-1); }
    else if (e.key === 'Escape') { $('modal').hidden = true; pick.hidden = true; }
  });

  // modal: intro + help
  const modal = $('modal');
  const openModal = (html) => { $('modalBody').innerHTML = html; modal.hidden = false; };
  $('modalX').onclick = () => (modal.hidden = true);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
  $('introBtn').onclick = () => { S.tab = GRA_INTRO[S.ch] ? 'gra' : 'm3d'; S.cardOpen = true; go(S.ch, 0, null, { scroll: false }); };
  $('helpBtn').onclick = () => openModal(HELP);

  // ---------------------------------------------------------------- start
  const m = /^#(\d\d):(\d+)/.exec(location.hash);
  if (m && DATA[+m[1]]) go(+m[1], +m[2], null, { scroll: false });
  else go(40, 0, null, { scroll: false, hash: false });
  window.addEventListener('hashchange', () => {
    const mm = /^#(\d\d):(\d+)/.exec(location.hash);
    if (mm && DATA[+mm[1]] && (+mm[1] !== S.ch || +mm[2] !== S.n)) go(+mm[1], +mm[2], null, { hash: false });
  });
}

const HELP = `
<h2>איך משתמשים?</h2>
<ul class="help">
<li><b>לחיצה על פסוק</b> (או על מספרו) – המקדש בתלת־ממד מתמקד במה שהפסוק מתאר: החלקים הרלוונטיים מוארים, השאר שקופים, ומוצגות המידות.</li>
<li><b>לחיצה על מילה או על חלק מהפסוק</b> – כל פסוק מחולק לחלקים (ביטויים), וכל חלק מוסבר בנפרד: מה הוא מתאר, מה מידתו (באמות ובמטרים משוער), ואיפה הוא במודל. החלק מודגש בטקסט, בתלת־ממד מוצגים קווי המידה שלו, ואפשר לעבור לחלק הבא/הקודם בכרטיס.</li>
<li><b>לשוניות הכרטיס</b> – התלת־ממד (ההסבר והמידות של כל חלק), ביאור הגר״א מהספר המצורף, והתרגום לאנגלית.</li>
<li><b>לחיצה על חלק במודל התלת־ממדי</b> – מראה אילו פסוקים וחלקי פסוקים מתארים אותו; לחיצה עליהם מובילה אל ההסבר.</li>
<li><b>עכבר/מגע</b>: גרירה – סיבוב · גלגלת/צביטה – קירוב · לחיצה ימנית/שתי אצבעות – הזזה.</li>
<li><b>🔍 מודל מבודד</b>: לכל פסוק אפשר להציג את החלק שהוא מתאר לבדו, עם <b>כל המידות</b> והסבר מפורט לכל חלק.</li>
<li><b>🧍 תצוגת 360°</b>: כניסה פנימה, כמו ב־Street View – גרירה להבטה סביב, גלגלת לזום, WASD/חצים ללכת, לחיצה על הרצפה ללכת לשם, ורשימת מקומות לקפיצה (שערים, חצרות, המזבח, ההיכל, קודש הקדשים, הלשכות).</li>
<li><b>סרגל הכלים</b>: מבט כללי · מבודד · 360° · חתך אופקי · מידות · סיור אוטומטי · צליל · איכות.</li>
<li><b>מקשים</b>: ← פסוק הבא · → פסוק קודם · Esc סגירה.</li>
</ul>
<p class="muted">היחידות באמות (אמה ≈ 50 ס״מ). המודל מצייר את הבית כפי שמבאר הגר״א בספר המצורף (חלק א׳: פרקים מ–מא; חלק ב׳: פרקים מב–מד,יד); ובמקומות שהספר אינו קובע – בעיקר מד,טו–לא – הגיאומטריה נבנתה מן הפסוקים ומפירושי הראשונים, והם מסומנים כ״השלמה״.</p>`;
