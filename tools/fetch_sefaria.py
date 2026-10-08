#!/usr/bin/env python3
"""Fetch Ezekiel 40-44 (Hebrew + English) and classic commentaries from Sefaria
and write one JSON file per chapter into ./data/.

Usage:  python3 tools/fetch_sefaria.py

Sources (all via the public Sefaria API, https://www.sefaria.org):
  - Tanakh: Miqra according to the Masorah (Hebrew), JPS Gender-Sensitive Edition (English)
  - Rashi (vocalized edition), Radak, Metzudat David / Metzudat Zion, Malbim,
    Abarbanel, Targum Jonathan
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

CHAPTERS = range(40, 45)
COMMENTARIES = {
    "rashi": "Rashi on Ezekiel",
    "radak": "Radak on Ezekiel",
    "metzudatDavid": "Metzudat David on Ezekiel",
    "metzudatZion": "Metzudat Zion on Ezekiel",
    "malbim": "Malbim on Ezekiel",
    "abarbanel": "Abarbanel on Ezekiel",
    "targum": "Targum Jonathan on Ezekiel",
}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def get(url):
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=40) as r:
                return json.load(r)
        except Exception as e:  # network hiccup: back off and retry
            last = e
            time.sleep(2 ** attempt)
    raise RuntimeError(f"failed: {url}: {last}")


def api(ref):
    return get("https://www.sefaria.org/api/texts/%s?context=0&commentary=0&pad=0" % urllib.parse.quote(ref))


def flat(x):
    if x is None:
        return ""
    if isinstance(x, str):
        return x
    return " ".join(p for p in (flat(y) for y in x) if p)


# cantillation marks U+0591..U+05AF are dropped; vowel points are kept
CANT = re.compile("[֑-֯׀׃ׅׄ]")


def clean_verse(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    s = s.replace("&thinsp;", " ").replace("&nbsp;", " ").replace("׀", "")
    s = re.sub(r"\{[פס]\}", "", s)
    s = CANT.sub("", s)
    return re.sub(r"\s+", " ", s).strip()


def clean_comm(s):
    s = s or ""
    # drop footnote bodies / markers
    s = re.sub(r"<sup[^>]*>.*?</sup>", "", s, flags=re.S)
    s = re.sub(r"<i class=\"footnote\">.*?</i>", "", s, flags=re.S)
    s = s.replace("&thinsp;", " ").replace("&nbsp;", " ")
    # keep a tiny whitelist of formatting tags
    s = re.sub(r"<(?!/?(?:b|i|br)\b)[^>]+>", "", s)
    s = re.sub(r"<(/?)(b|i|br)\b[^>]*>", r"<\1\2>", s)
    return re.sub(r"[ \t]+", " ", s).strip()


def main():
    os.makedirs(OUT, exist_ok=True)
    for ch in CHAPTERS:
        base = api(f"Ezekiel {ch}")
        n = len(base["he"])
        verses = []
        for i in range(n):
            verses.append({
                "n": i + 1,
                "he": clean_verse(base["he"][i]),
                "en": re.sub(r"<[^>]+>", "", base["text"][i] or "").strip(),
                "c": {},
            })
        for key, title in COMMENTARIES.items():
            try:
                d = api(f"{title} {ch}")
            except Exception as e:
                print("skip", title, ch, e, file=sys.stderr)
                continue
            he = d.get("he") or []
            for i in range(min(n, len(he))):
                txt = clean_comm(flat(he[i]))
                if txt:
                    verses[i]["c"][key] = txt
        path = os.path.join(OUT, f"ch{ch}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"chapter": ch, "verses": verses}, f, ensure_ascii=False, indent=1)
        print("wrote", path, n, "verses")


if __name__ == "__main__":
    main()
