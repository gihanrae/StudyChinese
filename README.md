# 汉字 Study Chinese

My growing Mandarin vocabulary library. One page, no build, no install.
Hover a character to see its stroke order. Check pinyin and meaning. Build sentences.

## Use

| Do | How |
|---|---|
| Stroke order | Hover (loops while hovered) |
| Pinyin | Click / tap |
| Meaning + example | Hold |
| Map | Scroll = zoom (up to 40×, double-click a card = fit that card, again = fit all), middle-drag (or drag empty space) = pan, pinch / one finger on phone, double-click empty space = Fit |
| Layout | Each group is its own compact block of cards (cards keep their tight 2px gap; blocks sit 6px apart, 3×). Blocks are packed tightly (shapes chosen to fill gaps), so the order is roughly, not exactly, the vocab-file order. Search re-packs the blocks around the matches, **Fit** or the 汉语 dot shows everything. **Groups** in the top bar shows tiny dim group names on each group's first row (remembered); full labels with edit buttons appear in **Edit** mode |
| Attention | Every pinyin / meaning check is counted. Most-checked words get a slightly deeper colour. **Reset counts** clears them |
| Build a sentence | Drag cards into the bottom box, or type hanzi / pinyin / English and press Enter |
| Write | **Write**, then tap a card and trace it |
| Search | Hanzi, pinyin (no tones) or English. Type `new` to see only new words |
| New dot | Small, soft red dot on a card = new word. Click it to clear. Edit mode: **New** toggle in the word form, **Clear new** clears all. In `vocab.js` add `\| new` as the 5th field |

Pinyin and meaning hide again after 4 seconds.

## Story

**Story** in the top bar opens one continuous story in four chapters that uses every word in the list (check with a quick search when you add words, then add a line for them). Each line is big; tap it to show pinyin and meaning, tap again to hide.
To edit or add lines, change the block at the top of `story.html`:

```
[Scene title]
speaker | 汉字 | pinyin | english
```

## Colors

Every group has its own soft, muted colour (spread so neighbouring hues are far apart in the vocab order). Categories: People, Things, Subjects, Verbs, Adjectives, Pronouns, Other.
**Tones** colors pinyin: 1 blue, 2 green, 3 amber, 4 red, neutral gray.

## Edit the map

**Edit** turns on editing. Hubs show small buttons: **+ word**, **+ group**, **+ category** (on the centre), rename ✎ and delete ✕. Click any word to edit or delete it. Paste lines like `汉字 | pinyin | meaning` into a new word's first field to add many at once.
Edits live in this browser; **Export** saves everything as `vocab.txt` to paste into `data/vocab.js`, **Backup / Restore** moves them between devices.

## Files

`index.html` shell · `css/app.css` · `js/app.js` · `data/vocab.js` words · `data/strokes.js` stroke data for every word (offline) · `vendor/` stroke library. After adding words to `data/vocab.js`, run `python bake-strokes.py` once (needs internet) to embed their strokes.
