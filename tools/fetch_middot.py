#!/usr/bin/env python3
"""Fetch Mishnah Middot (Hebrew) from Sefaria into data/middot.json."""
import json, os, urllib.parse, urllib.request
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
out = {}
for ch in range(1, 6):
    ref = urllib.parse.quote(f"Mishnah Middot {ch}")
    with urllib.request.urlopen(f"https://www.sefaria.org/api/texts/{ref}?context=0&commentary=0&pad=0", timeout=40) as r:
        d = json.load(r)
    out[ch] = {"he": d["he"], "ver": d.get("heVersionTitle"), "lic": d.get("license")}
json.dump(out, open(os.path.join(ROOT, "data", "middot.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("ok")
