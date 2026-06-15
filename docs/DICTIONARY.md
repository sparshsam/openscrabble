# Dictionary

## Word List Source

OpenScrabble uses a **built-in word list** for dictionary validation. The list lives in `src/data/wordList.ts` and is dynamically loaded (code-split) on demand.

| Property | Value |
|----------|-------|
| **Source** | SOWPODS-derived (combines TWL/NASPA + Collins) |
| **Word count** | 100,664 |
| **Last updated** | v0.1.x (original import) |
| **Generation** | Static array, auto-converted to `Set` for O(1) lookups |
| **Loading** | Lazy via `DictionaryLoader.ts` — dynamically imported on game start |
| **Bundle** | Separate chunk (`wordList-*.js`, ~955 KB / 268 KB gzipped) |

## 2-Letter Words

All 2-letter words are validated against the **official TWL/NASPA** list (107 words). This list is hardcoded in `src/game/WordValidator.ts` and is **always available** — no lazy loading needed.

Included: AA, AB, AD, AE, AG, AH, AI, AL, AM, AN, AR, AS, AT, AW, AX, AY, BA, BE, BI, BO, BY, CH, DA, DE, DO, ED, EF, EH, EL, EM, EN, ER, ES, ET, EW, EX, FA, FE, GI, GO, HA, HE, HI, HM, HO, ID, IF, IN, IS, IT, JO, KA, KI, KO, LA, LI, LO, MA, ME, MI, MM, MO, MU, MY, NA, NE, NO, NU, OD, OE, OF, OH, OI, OK, OM, ON, OP, OR, OS, OW, OX, OY, PA, PE, PI, PO, QI, RE, SH, SI, SO, TA, TE, TI, TO, UH, UM, UN, UP, US, UT, WE, WO, XI, XU, YA, YE, YO, ZA

Total: **107** words.

**EE**: ❌ Not valid under TWL/NASPA or Collins/SOWPODS.

## Word Definitions

Word definitions are fetched on demand from the **[Free Dictionary API](https://dictionaryapi.dev/)** (no API key required). Definitions are not bundled — they are fetched live when the user taps/click a word in the preview bar.

- **On mobile**: Tap a word in the preview bar, or long-press (500ms hold)
- **On desktop**: Click a word in the preview bar or move history

The details dialog shows:
- Word (uppercase)
- Validity badge (✓ Valid / ✕ Not in dictionary)
- Part of speech
- Definition(s)
- Usage example (when available)
- Phonetic transcription (when available)

## Limitations

1. **Not tournament-legal**: The word list is SOWPODS-derived and may contain entries not recognized by official NASPA or WESPA tournament lists. Some proper nouns may be included. For tournament play, consult the official word list.
2. **No inflections**: The list is a flat word set — it does not include grammatical information (tense, plural, etc.).
3. **API-dependent definitions**: Word definitions require internet access. Offline definitions are not bundled to keep the bundle small.
4. **Coverage gaps**: Some uncommon but valid Scrabble words may be missing. Some obscure entries may be present. No version tracking on the original source data.
