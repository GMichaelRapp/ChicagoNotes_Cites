# Chicago Citation Generator

A free, open-source tool for citing sources in the notes-and-bibliography style of *The Chicago Manual of Style*, 18th edition. Fill in what you know about a source and get its full note, its shortened note, and its bibliography entry. The tool also checks for the mistakes students make most often.

It is one web page. There is nothing to install, no account, no ads, and nothing is sent anywhere.

## Using it

Open `index.html` in any current browser, or use the hosted copy linked in this repository's About box.

1. Pick the source type. Each type asks only for what Chicago needs for it and can show an example.
2. Fill in the fields. The notes and the bibliography entry build as you type.
3. Read the checks below the outputs. **Fix** means something is missing or wrong. **Check** means look again. **Note** is a reminder.
4. Copy what you need. Use the first note the first time you cite a source and the shortened note after that. **Copy with italics** keeps the formatting when you paste into Word or Google Docs.

Each **?** on the page explains the part beside it.

### Source types

Book (including edited and translated books) · Chapter in an edited book · Journal article · Magazine article · Newspaper article · Web page · Blog post · Report or government document · Dissertation or thesis · Conference paper or talk · Online video · Social media post · Archival document or letter · Dictionary or encyclopedia entry · AI-generated content

### Notes

Every source gets two notes:

- **Full note.** Use it the first time you cite the source, for example: Zadie Smith, *Swing Time* (Penguin Press, 2016), 315–16.
- **Shortened note.** Use it every time after that, for example: Smith, *Swing Time*, 320. The 18th edition prefers shortened notes to *ibid.*

Under **This note** you can:

- point to a page, paragraph, section, chapter, or volume, or to anything else such as a timestamp or table
- mark the note as a direct quotation, which then has to give a locator
- cite a passage your source quotes, which gives "quoted in"

The short title comes from the main title without its subtitle or an opening *A*, *An*, or *The*. You can type your own in **Short title**.

Three or more authors become the first author and et al. in notes. The bibliography lists up to six authors, or the first three and et al. for seven or more.

### What the 18th edition changed, and the tool follows

- Books no longer give the place of publication.
- Shortened notes are preferred to *ibid.*
- A repeated author's name is repeated in the bibliography, not replaced with a 3-em dash.
- Social media posts, AI-generated text, unsigned dictionary entries, and talks readers can't get hold of are cited in notes only. These sources get no bibliography entry.
- Print reference works are cited with "under" in place of *s.v.*

### What the checks catch

- people's names typed first name first. The tool reads "Surname, Given names" as a person and anything else as a group.
- missing pieces Chicago needs: a journal's volume, a URL for online sources, a chapter's editors and book title, the university for a thesis, the archive for a document
- library database links, which readers cannot open
- a malformed DOI
- an undated web page with no access date
- a short title longer than four words
- a quotation with no locator
- notes-only sources, so you know why there is no bibliography entry

Titles are put into Chicago's headline style automatically. Capitals that you type on articles, prepositions, and *and*, *but*, *or* are lowered, and the other words are capitalized. Words that can also be adverbs, such as *up* or *down*, are left as you typed them.

### My sources

**Add to my list** keeps sources in this browser. The bibliography sorts itself the way Chicago sorts a bibliography, and notes-only sources are listed after it. You can:

- copy the bibliography
- export it to Word, with the Bibliography heading and hanging indents already set, or to Markdown
- tick two or more sources to cite them together in one note, separated by semicolons
- save the list to a file and open it again later, on any computer

## Your data

The page runs entirely in your browser and makes no network requests. What you type is kept in your browser's local storage on your device. Clearing your browser's site data clears it, so save a list file if you want to keep a list.

## How accurate it is

The formatting comes from citeproc-js and the Chicago Manual of Style 18th edition (notes and bibliography) style from the Citation Style Language project, the same style that Zotero and Mendeley use. The tool adds the rules that the style file leaves to whoever enters the data:

- headline-style titles and short titles
- a social media handle after the name
- letters cited as "Abigail Adams to Thomas Jefferson"
- "last modified" dates
- running times
- the AI citation form in CMOS 14.112

`Tests/run.js` checks the output against 26 sources modeled on CMOS 18 examples. Each source has a full note, a shortened note, and a bibliography entry. It also checks locators, "quoted in", combined notes, bibliography order, the checks, and the file formats.

The tool formats what you give it. It can't tell whether a word in a title is a proper noun, or whether a preposition is being used as an adverb. Your instructor's requirements come first.

The Chicago Citation Generator is not affiliated with or endorsed by the University of Chicago Press.

## License

© 2026 G. Michael Rapp. This program is free software: you can redistribute it and modify it under the terms of the GNU Affero General Public License, version 3 or (at your option) any later version. See `LICENSE`.

It includes citeproc-js (AGPL), the CSL Chicago style, and the CSL en-US locale. The style and locale are licensed under Creative Commons Attribution-ShareAlike 3.0. See `NOTICE.md` for their authors and terms.

## Reporting a problem

Open an issue and choose **Wrong note or bibliography entry** or **Missing source type**. Include what you entered, what the tool produced, and what Chicago calls for.

## For maintainers

`index.html` is built from the files in `src/`:

- `src/core.js` turns the form into CSL-JSON, applies the Chicago fixes, and runs the checks. The source types and their fields are in `TYPES` at the top.
- `src/ui.js` is the page itself. Its labels, hints, examples, and tips are in tables near the top.
- `src/page.html` holds the markup and styles.
- `src/vendor/` holds citeproc-js, the Chicago style, and the locale, unmodified.

After any change, rebuild and test:

```
python3 src/build.py
node Tests/run.js
```

Both need nothing beyond Python 3 and Node 18 or later. The tests also run on GitHub whenever a change is pushed.

To update the Chicago style, replace `src/vendor/chicago-notes-bibliography.csl` with the current file from https://github.com/citation-style-language/styles, rebuild, and run the tests.
