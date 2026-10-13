#!/usr/bin/env node
/*
 * Tests for the Chicago Citation Generator. Run from the repository root:  node Tests/run.js
 * Needs Node 18 or later and nothing else. It loads index.html, runs the embedded
 * citeproc-js engine, Chicago style, and the page's own core, and checks known inputs
 * against the note and bibliography forms of The Chicago Manual of Style, 18th edition.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = (id) => { const m = html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>')); if (!m) throw new Error('No <script id="' + id + '"> in index.html'); return m[1]; };
global.window = {};
const CSL = new Function(grab('citeproc') + ';return CSL;')();
global.CSL = CSL;
new Function(grab('styledata'))();
const C = new Function('CSL', grab('core') + ';return CMS;')(CSL);
C.setup(window.CMS_STYLE, window.CMS_LOCALE);

let failed = 0, passed = 0;
function eq(got, want, label) {
  if (got === want) { passed++; return; }
  failed++; console.log('FAIL  ' + label + '\n  got : ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
}
// One source on its own: [full note, shortened note, bibliography entry or "-" for notes only].
function forms(st, opt) {
  const r = C.render([{ id: 'x', st }]);
  if (!r.refs.x) return ['(nothing)', '', ''];
  const n = r.note('x', opt || {});
  return [n.fullText, n.shortText, r.refs.x.bib ? r.refs.x.bib.text : '-'];
}

// ---- 1. Notes and bibliography entries, modeled on CMOS 18 examples (italics not shown) ----
const FIXTURES = [
 ['book, one author', {type:'book', authors:'Smith, Zadie', date:'2016', title:'Swing Time', publisher:'Penguin Press'}, {locType:'page', locator:'315-16'},
  ['Zadie Smith, Swing Time (Penguin Press, 2016), 315–16.', 'Smith, Swing Time, 315–16.', 'Smith, Zadie. Swing Time. Penguin Press, 2016.']],
 ['book, two authors, title typed with capital stop words', {type:'book', authors:'Grazer, Brian\nFishman, Charles', date:'2015', title:'A Curious Mind: The Secret To A Bigger Life', publisher:'Simon & Schuster'}, {locType:'page', locator:'12'},
  ['Brian Grazer and Charles Fishman, A Curious Mind: The Secret to a Bigger Life (Simon & Schuster, 2015), 12.', 'Grazer and Fishman, Curious Mind, 12.', 'Grazer, Brian, and Charles Fishman. A Curious Mind: The Secret to a Bigger Life. Simon & Schuster, 2015.']],
 ['edited book', {type:'book', editors:'Lahiri, Jhumpa', date:'2019', title:'The Penguin Book of Italian Short Stories', shortTitle:'Italian Short Stories', publisher:'Penguin Books'}, {locType:'page', locator:'23'},
  ['Jhumpa Lahiri, ed., The Penguin Book of Italian Short Stories (Penguin Books, 2019), 23.', 'Lahiri, Italian Short Stories, 23.', 'Lahiri, Jhumpa, ed. The Penguin Book of Italian Short Stories. Penguin Books, 2019.']],
 ['translated book, later edition', {type:'book', authors:'Camus, Albert', translators:'Buss, Robin', date:'2021', title:'The Plague', edition:'2nd', publisher:'Vintage'}, {},
  ['Albert Camus, The Plague, 2nd ed., trans. Robin Buss (Vintage, 2021).', 'Camus, Plague.', 'Camus, Albert. The Plague. 2nd ed. Translated by Robin Buss. Vintage, 2021.']],
 ['seven authors', {type:'book', authors:'Aa, Ann\nBb, Bob\nCc, Cy\nDd, Di\nEe, Ed\nFf, Flo\nGg, Gus', date:'2020', title:'Many Hands', publisher:'Example Press'}, {},
  ['Ann Aa et al., Many Hands (Example Press, 2020).', 'Aa et al., Many Hands.', 'Aa, Ann, Bob Bb, Cy Cc, et al. Many Hands. Example Press, 2020.']],
 ['chapter in an edited book', {type:'chapter', authors:'Thoreau, Henry David', title:'Walking', editors:"D’Agata, John", container:'The Making of the American Essay', pages:'167-95', publisher:'Graywolf Press', date:'2016'}, {locType:'page', locator:'177-78'},
  ['Henry David Thoreau, “Walking,” in The Making of the American Essay, ed. John D’Agata (Graywolf Press, 2016), 177–78.', 'Thoreau, “Walking,” 177–78.', 'Thoreau, Henry David. “Walking.” In The Making of the American Essay, edited by John D’Agata. Graywolf Press, 2016.']],
 ['journal article with DOI', {type:'journal', authors:'Satterfield, Susan', date:'2016', title:'Livy and the Pax Deum', shortTitle:'Livy', container:'Classical Philology', volume:'111', issue:'2', pages:'165-76', doi:'https://doi.org/10.1086/685810'}, {locType:'page', locator:'170'},
  ['Susan Satterfield, “Livy and the Pax Deum,” Classical Philology 111, no. 2 (2016): 170, https://doi.org/10.1086/685810.', 'Satterfield, “Livy,” 170.', 'Satterfield, Susan. “Livy and the Pax Deum.” Classical Philology 111, no. 2 (2016): 165–76. https://doi.org/10.1086/685810.']],
 ['journal article from a database', {type:'journal', authors:'Doe, Jane', date:'2019', title:'Footnotes in Early Modern Print', container:'Journal of Example Studies', volume:'8', issue:'1', pages:'1-20', database:'JSTOR'}, {},
  ['Jane Doe, “Footnotes in Early Modern Print,” Journal of Example Studies 8, no. 1 (2019): 1–20, JSTOR.', 'Doe, “Footnotes in Early Modern Print.”', 'Doe, Jane. “Footnotes in Early Modern Print.” Journal of Example Studies 8, no. 1 (2019): 1–20. JSTOR.']],
 ['magazine article', {type:'magazine', authors:'Mead, Rebecca', date:'April 17, 2017', title:'The Prophet of Dystopia', shortTitle:'Dystopia', container:'New Yorker'}, {},
  ['Rebecca Mead, “The Prophet of Dystopia,” New Yorker, April 17, 2017.', 'Mead, “Dystopia.”', 'Mead, Rebecca. “The Prophet of Dystopia.” New Yorker, April 17, 2017.']],
 ['newspaper article online', {type:'news', authors:'Manjoo, Farhad', date:'March 8, 2017', title:'Snap Makes a Bet on the Cultural Supremacy of the Camera', shortTitle:'Snap Makes a Bet', container:'New York Times', url:'https://www.nytimes.com/2017/03/08/technology/snap-camera.html'}, {},
  ['Farhad Manjoo, “Snap Makes a Bet on the Cultural Supremacy of the Camera,” New York Times, March 8, 2017, https://www.nytimes.com/2017/03/08/technology/snap-camera.html.', 'Manjoo, “Snap Makes a Bet.”', 'Manjoo, Farhad. “Snap Makes a Bet on the Cultural Supremacy of the Camera.” New York Times, March 8, 2017. https://www.nytimes.com/2017/03/08/technology/snap-camera.html.']],
 ['web page by the site owner, last modified', {type:'webpage', authors:'Google', date:'April 17, 2017', dateKind:'modified', title:'Privacy Policy', container:'Privacy & Terms', url:'https://www.google.com/policies/privacy/'}, {},
  ['“Privacy Policy,” Privacy & Terms, Google, last modified April 17, 2017, https://www.google.com/policies/privacy/.', 'Google, “Privacy Policy.”', 'Google. “Privacy Policy.” Privacy & Terms. Last modified April 17, 2017. https://www.google.com/policies/privacy/.']],
 ['undated web page with an access date', {type:'webpage', authors:'Yale University', title:'About Yale: Yale Facts', shortTitle:'Yale Facts', container:'Yale University', url:'https://www.yale.edu/about-yale/yale-facts', accessed:'May 1, 2017'}, {},
  ['“About Yale: Yale Facts,” Yale University, accessed May 1, 2017, https://www.yale.edu/about-yale/yale-facts.', 'Yale University, “Yale Facts.”', 'Yale University. “About Yale: Yale Facts.” Accessed May 1, 2017. https://www.yale.edu/about-yale/yale-facts.']],
 ['blog post', {type:'blog', authors:'Doe, Jane', date:'May 1, 2020', title:'Some Thoughts on Footnotes', container:'The Example Blog', url:'https://blog.example.org/x'}, {},
  ['Jane Doe, “Some Thoughts on Footnotes,” The Example Blog, May 1, 2020, https://blog.example.org/x.', 'Doe, “Some Thoughts on Footnotes.”', 'Doe, Jane. “Some Thoughts on Footnotes.” The Example Blog, May 1, 2020. https://blog.example.org/x.']],
 ['government report', {type:'report', authors:'US Government Accountability Office', date:'2021', title:'Climate Change: A Climate Migration Pilot Program', reportType:'Report', reportNumber:'GAO-21-23', publisher:'Government Accountability Office', url:'https://www.gao.gov/x'}, {},
  ['US Government Accountability Office, Climate Change: A Climate Migration Pilot Program, Report GAO-21-23 (Government Accountability Office, 2021), https://www.gao.gov/x.', 'US Government Accountability Office, Climate Change.', 'US Government Accountability Office. Climate Change: A Climate Migration Pilot Program. Report GAO-21-23. Government Accountability Office, 2021. https://www.gao.gov/x.']],
 ['dissertation', {type:'thesis', authors:'Robinson, Francis John Gibson', date:'1972', title:'Trends in Education in Northern England during the Eighteenth Century', shortTitle:'Trends in Education', thesisType:'PhD diss.', publisher:'Newcastle University', url:'http://hdl.handle.net/10443/511'}, {},
  ['Francis John Gibson Robinson, “Trends in Education in Northern England during the Eighteenth Century” (PhD diss., Newcastle University, 1972), http://hdl.handle.net/10443/511.', 'Robinson, “Trends in Education.”', 'Robinson, Francis John Gibson. “Trends in Education in Northern England during the Eighteenth Century.” PhD diss., Newcastle University, 1972. http://hdl.handle.net/10443/511.']],
 ['unpublished conference paper: notes only', {type:'conference', authors:'Doe, Jane', date:'April 5, 2019', title:'Fish Fights', event:'Annual Meeting of the Example Society', place:'Chicago'}, {},
  ['Jane Doe, “Fish Fights,” paper presented at Annual Meeting of the Example Society, Chicago, April 5, 2019.', 'Doe, “Fish Fights.”', '-']],
 ['online video', {type:'video', authors:'Ma, Yo-Yo', date:'August 17, 2018', title:'Bach: Cello Suite No. 1 in G Major, Prelude', shortTitle:'Bach', platform:'YouTube', duration:'2:26', url:'https://www.youtube.com/watch?v=1prweT95Mo0'}, {},
  ['Yo-Yo Ma, “Bach: Cello Suite No. 1 in G Major, Prelude,” YouTube video, August 17, 2018, 2 min., 26 sec., https://www.youtube.com/watch?v=1prweT95Mo0.', 'Ma, “Bach.”', 'Ma, Yo-Yo. “Bach: Cello Suite No. 1 in G Major, Prelude.” YouTube video, August 17, 2018. 2 min., 26 sec. https://www.youtube.com/watch?v=1prweT95Mo0.']],
 ['Instagram photo with handle: notes only', {type:'post', authors:'Souza, Pete', handle:'petesouza', date:'April 1, 2016', title:'President Obama bids farewell to President Xi of China at the conclusion of the Nuclear Security Summit', shortTitle:'President Obama bids farewell', platform:'Instagram', postType:'photo', url:'https://www.instagram.com/p/BDrmfXTtNCt/'}, {},
  ['Pete Souza (@petesouza), “President Obama bids farewell to President Xi of China at the conclusion of the Nuclear Security Summit,” Instagram photo, April 1, 2016, https://www.instagram.com/p/BDrmfXTtNCt/.', 'Souza, “President Obama bids farewell.”', '-']],
 ['Facebook post: final period dropped inside the quotation marks', {type:'post', authors:'Chicago Manual of Style', date:'April 17, 2015', title:'Is the world ready for singular they? We thought so back in 1993.', shortTitle:'Singular they', platform:'Facebook', url:'https://www.facebook.com/ChicagoManual/posts/10152906193679151'}, {},
  ['Chicago Manual of Style, “Is the world ready for singular they? We thought so back in 1993,” Facebook, April 17, 2015, https://www.facebook.com/ChicagoManual/posts/10152906193679151.', 'Chicago Manual of Style, “Singular they.”', '-']],
 ['letter in an archive', {type:'archival', authors:'Adams, Abigail', description:'to Thomas Jefferson', date:'June 6, 1786', collection:'Adams Family Papers', repository:'Massachusetts Historical Society', place:'Boston'}, {},
  ['Abigail Adams to Thomas Jefferson, June 6, 1786, Adams Family Papers, Massachusetts Historical Society, Boston.', 'Adams to Jefferson, June 6, 1786.', 'Adams, Abigail. Letter to Thomas Jefferson, June 6, 1786. Adams Family Papers. Massachusetts Historical Society, Boston.']],
 ['titled manuscript with box and folder', {type:'archival', authors:'Adams, John', title:'Journal of a Voyage', date:'1786', collection:'Adams Family Papers', repository:'Massachusetts Historical Society', place:'Boston', boxFolder:'box 3, folder 2'}, {},
  ['John Adams, “Journal of a Voyage,” 1786, box 3, folder 2, Adams Family Papers, Massachusetts Historical Society, Boston.', 'Adams, “Journal of a Voyage.”', 'Adams, John. “Journal of a Voyage.” 1786. Box 3, folder 2. Adams Family Papers. Massachusetts Historical Society, Boston.']],
 ['unsigned dictionary entry: notes only', {type:'entry', title:'salvation', container:'Merriam-Webster.com Dictionary', url:'https://www.merriam-webster.com/dictionary/salvation', accessed:'June 10, 2025'}, {},
  ['Merriam-Webster.com Dictionary, “salvation,” accessed June 10, 2025, https://www.merriam-webster.com/dictionary/salvation.', 'Merriam-Webster.com Dictionary, “salvation.”', '-']],
 ['signed encyclopedia entry', {type:'entry', authors:'Graham, George', title:'Behaviorism', container:'The Stanford Encyclopedia of Philosophy', editors:'Zalta, Edward N.', date:'2019', url:'https://plato.stanford.edu/archives/sum2019/entries/behaviorism/'}, {},
  ['George Graham, “Behaviorism,” in The Stanford Encyclopedia of Philosophy, ed. Edward N. Zalta (2019), https://plato.stanford.edu/archives/sum2019/entries/behaviorism/.', 'Graham, “Behaviorism.”', 'Graham, George. “Behaviorism.” In The Stanford Encyclopedia of Philosophy, edited by Edward N. Zalta. 2019. https://plato.stanford.edu/archives/sum2019/entries/behaviorism/.']],
 ['AI-generated text', {type:'ai', title:'ChatGPT', publisher:'OpenAI', date:'March 7, 2023', url:'https://chat.openai.com/chat'}, {},
  ['Text generated by ChatGPT, OpenAI, March 7, 2023, https://chat.openai.com/chat.', 'Text generated by ChatGPT, March 7, 2023.', '-']],
 ['AI response to a prompt', {type:'ai', title:'ChatGPT', publisher:'OpenAI', date:'March 7, 2023', prompt:'Explain how to make pizza dough from common household ingredients'}, {},
  ['Response to “Explain how to make pizza dough from common household ingredients,” ChatGPT, OpenAI, March 7, 2023.', 'Response to “Explain how to make pizza dough from common household ingredients,” ChatGPT, March 7, 2023.', '-']],
 ['no author', {type:'book', date:'2024', title:'The Chicago Manual of Style', edition:'18th', publisher:'University of Chicago Press'}, {},
  ['The Chicago Manual of Style, 18th ed. (University of Chicago Press, 2024).', 'Chicago Manual of Style.', 'The Chicago Manual of Style. 18th ed. University of Chicago Press, 2024.']],
];
FIXTURES.forEach(([name, st, opt, want]) => {
  const got = forms(st, opt);
  eq(got[0], want[0], 'full note: ' + name);
  eq(got[1], want[1], 'short note: ' + name);
  eq(got[2], want[2], 'bibliography: ' + name);
});

// ---- 2. Locators, quoted in, several sources, bibliography order ----
const E = [
  { id: 'a', st: { type: 'book', authors: 'Smith, Zadie', date: '2016', title: 'Swing Time', publisher: 'Penguin Press' } },
  { id: 'b', st: { type: 'book', authors: 'Smith, Zadie', date: '2005', title: 'On Beauty', publisher: 'Penguin Press' } },
  { id: 'c', st: { type: 'journal', authors: 'Abel, Ann', date: '2010', title: 'Alpha', container: 'Journal', volume: '1', pages: '1-9' } },
  { id: 'd', st: { type: 'post', authors: 'Abel, Ann', date: 'May 1, 2020', title: 'A post', platform: 'X', url: 'https://x.com/a' } },
];
const R = C.render(E);
const nt = (id, o) => { const x = R.note(id, o); return x.fullText + ' | ' + x.shortText; };
eq(nt('a', { locType: 'para', locator: '4' }), 'Zadie Smith, Swing Time (Penguin Press, 2016), para. 4. | Smith, Swing Time, para. 4.', 'locator: paragraph');
eq(nt('a', { locType: 'chapter', locator: '3' }), 'Zadie Smith, Swing Time (Penguin Press, 2016), chap. 3. | Smith, Swing Time, chap. 3.', 'locator: chapter');
eq(nt('a', { locType: 'other', locator: 'table 2' }), 'Zadie Smith, Swing Time (Penguin Press, 2016), table 2. | Smith, Swing Time, table 2.', 'locator: something else');
eq(R.note('c', { secondary: true, original: 'Louis Zukofsky, "Sincerity and Objectification," Poetry 37 (February 1931): 269' }).fullText,
  'Louis Zukofsky, "Sincerity and Objectification," Poetry 37 (February 1931): 269, quoted in Ann Abel, “Alpha,” Journal 1 (2010): 1–9.', 'quoted in');
eq(C.stripTags(R.group(['c', 'a'])), 'Ann Abel, “Alpha,” Journal 1 (2010): 1–9; Zadie Smith, Swing Time (Penguin Press, 2016).', 'several sources in one note');
eq(R.order.join(','), 'c,b,a', 'bibliography: by author, then title; notes-only sources left out');
eq(R.refs.b.bib.text, 'Smith, Zadie. On Beauty. Penguin Press, 2005.', 'bibliography: a repeated author is named again, not replaced by a dash');

eq(forms({ type: 'book', authors: 'Doe, Jane', title: 'Footnotes', edition: 'Rev.', publisher: 'Example Press', date: '2020' })[2], 'Doe, Jane. Footnotes. Rev. ed. Example Press, 2020.', 'bibliography: a described edition');
eq(forms({ type: 'conference', authors: 'Doe, Jane', date: 'April 5, 2019', title: 'Fish Fights', event: 'Annual Meeting of the Example Society', place: 'Chicago', url: 'https://example.org/p' })[2], 'Doe, Jane. “Fish Fights.” Paper presented at Annual Meeting of the Example Society, Chicago, April 5, 2019. https://example.org/p.', 'bibliography: a conference paper online');
eq(forms({ type: 'entry', authors: 'Knopoff, Steven', title: 'Didjeridu', container: 'The Grove Dictionary of Musical Instruments', edition: '2nd', editors: 'Libin, Laurence', publisher: 'Oxford University Press', date: '2014' }, { locType: 'page', locator: '320' }).join(' | '),
  'Steven Knopoff, “Didjeridu,” in The Grove Dictionary of Musical Instruments, 2nd ed., ed. Laurence Libin (Oxford University Press, 2014), 320. | Knopoff, “Didjeridu,” 320. | Knopoff, Steven. “Didjeridu.” In The Grove Dictionary of Musical Instruments, 2nd ed., edited by Laurence Libin. Oxford University Press, 2014.', 'signed print reference entry, cited like a chapter');

// ---- 3. Helpers ----
eq(C.headline('The History Of The World: A Study In Things To Come'), 'The History of the World: A Study in Things to Come', 'headline: lowers capitalized articles, prepositions, and conjunctions');
eq(C.headline('How to Shut Down a Reactor Like a Pro'), 'How to Shut Down a Reactor Like a Pro', 'headline: leaves words that can be adverbs as typed');
eq(C.autoShort('A Curious Mind: The Secret to a Bigger Life'), 'Curious Mind', 'short title: main title without an initial article');
eq(JSON.stringify(C.parseNames('Evans, A. C., Jr.\nWorld Health Organization')), '[{"family":"Evans","given":"A. C.","suffix":"Jr."},{"literal":"World Health Organization"}]', 'names: person with suffix, and a group');
['2019|2019', 'October 31, 2019|October 31, 2019', '31 October 2019|October 31, 2019', '10/31/2019|October 31, 2019', '1786-06-06|June 6, 1786', 'Spring 2020|Spring 2020'].forEach((p) => { const [i, o] = p.split('|'); eq(C.dateText(i), o, 'date: ' + i); });
eq(C.normDoi('doi:10.1086/685810.'), '10.1086/685810', 'doi: from doi: form');

// ---- 4. Checks ----
const flagged = (st, start, o) => C.checks(st, o).some((x) => x.msg.startsWith(start));
eq(flagged({ type: 'book', authors: 'Jane Doe', title: 't' }, '"Jane Doe" looks like a person'), true, 'checks: first-name-first person');
eq(flagged({ type: 'webpage', authors: 'Yale University', title: 't', url: 'https://x.org' }, '"Yale University" looks like a person'), false, 'checks: an organization is not taken for a person');
eq(flagged({ type: 'journal', authors: 'Doe, Jane', title: 't', container: 'J' }, 'Give the volume number'), true, 'checks: journal without volume');
eq(flagged({ type: 'journal', authors: 'Doe, Jane', title: 't', url: 'https://search.ebscohost.com/login.aspx?x=1' }, 'That looks like a library database link'), true, 'checks: database link');
eq(flagged({ type: 'webpage', authors: 'Doe, Jane', title: 't', url: 'https://x.org' }, 'Give the date you accessed the page'), true, 'checks: undated page without an access date');
eq(flagged({ type: 'book', authors: 'Doe, Jane', title: 'The Long and Winding History of Everything', date: '2020' }, 'Shortened notes use a short title'), true, 'checks: long short title');
eq(flagged({ type: 'post', authors: 'Doe, Jane', title: 'x'.repeat(290), url: 'https://x.com/a' }, 'Chicago quotes a post'), true, 'checks: long post');
eq(flagged({ type: 'post', authors: 'Doe, Jane', title: 'hi', url: 'https://x.com/a' }, 'Chicago usually cites social media posts in notes only'), true, 'checks: notes-only note');
eq(flagged({ type: 'book', authors: 'Doe, Jane', title: 't', date: '2020' }, 'A quotation should give the page', { quote: true }), true, 'checks: quotation without a locator');
eq(flagged({ type: 'chapter', authors: 'Doe, Jane', title: 't', container: 'B', date: '2020' }, 'A chapter in an edited book names'), true, 'checks: chapter without editors');
eq(C.checks({ type: 'book' }).length, 0, 'checks: an empty form raises nothing');

// ---- 5. Files ----
const saved = [{ id: 's1', st: { type: 'book', authors: 'Doe, Jane', title: 'T', date: '2020', publisher: 'P' } }];
const back = C.parseListFile(C.listFile('My paper', saved, { s1: 'Jane Doe, T (P, 2020).' }));
eq(back.items.length + ':' + back.items[0].st.authors + ':' + back.name, '1:Doe, Jane:My paper', 'list file: saves and reopens');
eq(!!C.parseListFile('not json').error && !!C.parseListFile('{"x":1}').error && !!C.parseListFile('{"app":"APA Citation Generator","sources":[]}').error, true, 'list file: refuses what is not a Chicago list file');
const docx = C.docxBytes(['Doe, Jane. <i>T</i>. P, 2020.']);
eq(docx[0] === 0x50 && docx[1] === 0x4b && docx.length > 1000, true, 'export: Word file is a zip archive');
eq(C.mdText('', ['Doe, Jane. *T*. P, 2020.']), '## Bibliography\n\nDoe, Jane. *T*. P, 2020.\n', 'export: Markdown');

console.log(failed ? `\n${failed} failed, ${passed} passed` : `All ${passed} checks passed.`);
process.exit(failed ? 1 : 0);
