# 汉字 Study Chinese

My growing Mandarin vocabulary library. One page, no build, no install.
Hover a character to see its stroke order. Check pinyin and meaning. Build sentences.

## Use

| Do | How |
|---|---|
| Stroke order | Hover (phone: tap) |
| Pinyin | Click / tap |
| Meaning + example | Hold |
| Build a sentence | Drag cards into the bottom box, or type hanzi / pinyin / English and press Enter |
| Remove a word | Click it in the box |
| Game | Toggle **Game**: random order, words you check most sink to the bottom |
| Write | **Write**, then tap a card and trace it |
| Search | Hanzi, pinyin (no tones) or English |

Pinyin and meaning hide again after 4 seconds.

## Colors

Card colors are the category: People, Things, Subjects, Verbs, Adjectives, Pronouns, Other (gray).
**Tones** colors pinyin: 1 blue, 2 green, 3 amber, 4 red, neutral gray.

## Add words

Edit the list at the top of `index.html`, one line per word, under its `[section]`:

```
汉字 | pinyin | english | example sentence | lesson (optional)
```

Sections: `[people] [things] [subjects] [verbs] [adj] [pron] [other]`

Or use **+** in the page and paste lines. Those are saved in your browser; **Export** gives lines to paste into the file.

## Lessons

**+** → type a number → **Tag cards** → tap cards. A lesson filter appears.

## Backup

**+** → **Backup** / **Restore**: counts, saved sentences, added words, lessons, settings.

## Offline stroke data

New characters download their strokes once. To embed them in the file (needs Python and internet):

```
python bake-strokes.py
```

## Files

| File | |
|---|---|
| `index.html` | The whole app and vocabulary |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | Install to phone, works offline |
| `bake-strokes.py` | Embeds stroke data |

Stroke data: [Hanzi Writer](https://hanziwriter.org). Font: LXGW WenKai TC.
