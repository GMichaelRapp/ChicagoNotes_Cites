/*
 * Chicago core: turns what someone typed into the form into CSL-JSON, formats it with
 * citeproc-js and the community Chicago Manual of Style 18th edition notes-and-
 * bibliography style, and applies the few Chicago rules the style file leaves to the
 * data. No page, no network: the tests run this directly.
 */
var CMS = (function () {
  'use strict';
  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SEASONS = { spring: 1, summer: 2, autumn: 3, fall: 3, winter: 4 };

  // ------------------------------------------------------------------ source types
  // f: the fields the form shows for this type. Labels and hints live in the page.
  var TYPES = {
    book: { label: 'Book', f: ['authors', 'editors', 'translators', 'date', 'title', 'shortTitle', 'edition', 'volume', 'publisher', 'origDate', 'format', 'doi', 'url'] },
    chapter: { label: 'Chapter in an edited book', f: ['authors', 'date', 'title', 'shortTitle', 'editors', 'container', 'pages', 'edition', 'publisher', 'doi', 'url'] },
    journal: { label: 'Journal article', f: ['authors', 'date', 'title', 'shortTitle', 'container', 'volume', 'issue', 'pages', 'articleNumber', 'doi', 'url', 'database'] },
    magazine: { label: 'Magazine article', f: ['authors', 'date', 'title', 'shortTitle', 'container', 'url', 'database'] },
    news: { label: 'Newspaper article', f: ['authors', 'date', 'title', 'shortTitle', 'container', 'url', 'database'] },
    webpage: { label: 'Web page', f: ['authors', 'date', 'dateKind', 'title', 'shortTitle', 'container', 'publisher', 'url', 'accessed'] },
    blog: { label: 'Blog post', f: ['authors', 'date', 'title', 'shortTitle', 'container', 'url'] },
    report: { label: 'Report or government document', f: ['authors', 'date', 'title', 'shortTitle', 'reportType', 'reportNumber', 'publisher', 'doi', 'url'] },
    thesis: { label: 'Dissertation or thesis', f: ['authors', 'date', 'title', 'shortTitle', 'thesisType', 'publisher', 'database', 'url'] },
    conference: { label: 'Conference paper or talk', f: ['authors', 'date', 'title', 'shortTitle', 'presentationType', 'event', 'place', 'url'] },
    video: { label: 'Online video', f: ['authors', 'date', 'title', 'shortTitle', 'platform', 'duration', 'url'] },
    post: { label: 'Social media post', f: ['authors', 'handle', 'date', 'title', 'shortTitle', 'platform', 'postType', 'url'] },
    archival: { label: 'Archival document or letter', f: ['authors', 'date', 'title', 'collection', 'repository', 'place', 'boxFolder'] },
    entry: { label: 'Dictionary or encyclopedia entry', f: ['authors', 'date', 'title', 'editors', 'container', 'edition', 'publisher', 'url', 'accessed'] },
    ai: { label: 'AI-generated content', f: ['title', 'publisher', 'date', 'prompt', 'url'] }
  };
  var TEXT_KEYS = ['authors', 'editors', 'translators', 'handle', 'date', 'dateKind', 'title', 'shortTitle', 'description', 'container', 'volume', 'issue', 'pages',
    'articleNumber', 'edition', 'publisher', 'origDate', 'format', 'reportType', 'reportNumber', 'thesisType', 'database', 'presentationType', 'event', 'place',
    'platform', 'duration', 'postType', 'collection', 'repository', 'boxFolder', 'prompt', 'doi', 'url', 'accessed'];
  // CMOS 18 cites these in notes only (14.106, 14.112, 14.115, 14.130); the style leaves them out of the bibliography.
  var NOTES_ONLY_MSG = {
    post: 'Chicago usually cites social media posts in notes only; a bibliography entry is rarely needed, so this tool gives none (CMOS 18, 14.106).',
    ai: 'Chicago usually cites AI-generated text in a note or in your text only, so this tool gives no bibliography entry (CMOS 18, 14.112).',
    entry: 'Chicago cites unsigned dictionary and encyclopedia entries in notes only, so this source has no bibliography entry (CMOS 18, 14.130).',
    conference: 'An unpublished talk that readers cannot get hold of is cited in notes only. Add a URL if it is online, and it gets a bibliography entry (CMOS 18, 14.115).'
  };

  // ------------------------------------------------------------------ small helpers
  function clean(s) { return String(s == null ? '' : s).replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim(); }
  function lines(s) { return String(s == null ? '' : s).split(/\n+/).map(clean).filter(Boolean); }
  function words(s) { return clean(s) ? clean(s).split(' ').length : 0; }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function esc(s) { return String(s).replace(/&/g, '&#38;').replace(/</g, '&#60;').replace(/>/g, '&#62;'); }

  // One name per line. "Surname, Given names" is a person; anything without a comma
  // is a group or organization, printed as written.
  var ORG_WORDS = /\b(University|Institute|Institution|Center|Centre|Department|Office|Society|Association|Organization|Organisation|Press|Museum|Library|College|Council|Committee|Agency|Bureau|Foundation|Company|Corporation|Group|Service|Services|Board|Commission|Ministry|School|Times|News|Post|Journal|Fund|Bank|Party|Trust|Network|Project|Review|Magazine|Studio|Studios|Records|Research|Lab|Laboratory|Academy|Alliance|Union|Club|Network|Channel|Media|Health|State|States|City|County|Republic|Kingdom|Nations|Army|Navy|Force|Forces|Command|Inc\.?|Ltd\.?|LLC)\b/;
  var SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;
  function parseNames(text) {
    return lines(text).map(function (l) {
      var parts = l.split(',').map(clean).filter(Boolean);
      if (parts.length < 2) return { literal: l };
      var n = { family: parts[0], given: parts[1] };
      if (parts[2] && SUFFIX.test(parts[2])) n.suffix = parts[2];
      return n;
    });
  }
  function looksLikePerson(line) {
    var w = clean(line).split(' ');
    return line.indexOf(',') === -1 && w.length >= 2 && w.length <= 4 && !ORG_WORDS.test(line) && w.every(function (x) { return /^[A-Z][a-z'’.-]+$|^[A-Z]\.$/.test(x); });
  }
  function displayName(n) { return n.literal || [n.given, n.family].filter(Boolean).join(' ') + (n.suffix ? ', ' + n.suffix : ''); }

  // Dates in any common form. Returns { csl, level } or null for "no date".
  function monthOf(s) {
    var k = String(s).toLowerCase().replace(/\.$/, '');
    for (var i = 0; i < 12; i++) if (MONTHS[i] === k || (k.length >= 3 && MONTHS[i].indexOf(k) === 0)) return i + 1;
    return 0;
  }
  function parseDate(raw) {
    var s = clean(raw).replace(/[–—]/g, '-');
    var m, y, mo, d, d2, mo2;
    if (!s || /^n\.?\s*d\.?$/i.test(s)) return null;
    if (/^forthcoming$/i.test(s)) return { csl: { literal: 'forthcoming' }, level: 'press' };
    if ((m = s.match(/^(\d{3,4})$/))) return { csl: { 'date-parts': [[+m[1]]] }, level: 'year' };
    if ((m = s.match(/^(spring|summer|autumn|fall|winter)\s*,?\s*(\d{4})$/i))) return { csl: { 'date-parts': [[+m[2]]], season: SEASONS[m[1].toLowerCase()] }, level: 'season' };
    if ((m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/))) { y = +m[1]; mo = +m[2]; d = m[3] ? +m[3] : 0; }
    else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) { mo = +m[1]; d = +m[2]; y = +m[3]; }
    else if ((m = s.match(/^(\d{4}),?\s+([A-Za-z]+\.?)\s*(\d{1,2})?(?:\s*-\s*(\d{1,2}))?$/))) { y = +m[1]; mo = monthOf(m[2]); d = m[3] ? +m[3] : 0; d2 = m[4] ? +m[4] : 0; }
    else if ((m = s.match(/^([A-Za-z]+\.?)\s+(\d{1,2})(?:\s*-\s*(?:([A-Za-z]+\.?)\s+)?(\d{1,2}))?,?\s+(\d{4})$/))) { mo = monthOf(m[1]); d = +m[2]; mo2 = m[3] ? monthOf(m[3]) : 0; d2 = m[4] ? +m[4] : 0; y = +m[5]; }
    else if ((m = s.match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+([A-Za-z]+\.?),?\s+(\d{4})$/))) { d = +m[1]; d2 = m[2] ? +m[2] : 0; mo = monthOf(m[3]); y = +m[4]; }
    else if ((m = s.match(/^([A-Za-z]+\.?),?\s+(\d{4})$/))) { mo = monthOf(m[1]); y = +m[2]; d = 0; }
    else return { csl: { literal: s }, level: 'raw' };
    if (!mo || mo > 12 || (d && d > 31) || (d2 && d2 > 31)) return { csl: { literal: s }, level: 'raw' };
    var a = [y, mo]; if (d) a.push(d);
    var parts = [a];
    if (d2) parts.push([y, mo2 || mo, d2]);
    return { csl: { 'date-parts': parts }, level: d ? (d2 ? 'range' : 'day') : 'month' };
  }
  function dateText(raw) {
    var p = parseDate(raw);
    if (!p) return '';
    if (p.level === 'raw' || p.level === 'press') return clean(raw);
    var a = p.csl['date-parts'][0];
    if (p.level === 'year') return String(a[0]);
    if (p.level === 'season') return clean(raw);
    return MONTH_NAMES[a[1] - 1] + (a[2] ? ' ' + a[2] + ',' : '') + ' ' + a[0];
  }

  function normDoi(raw) {
    var s = clean(raw);
    var m = s.match(/(?:doi\.org\/|^doi:\s*|^)(10\.\d{4,9}\/\S+)$/i);
    return m ? m[1].replace(/[.,;]$/, '') : '';
  }
  function edNumber(raw) {
    var s = clean(raw);
    var m = s.match(/^(\d+)(?:st|nd|rd|th)?(?:\s+ed(?:ition|\.)?)?$/i);
    if (m) return m[1];
    var w = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 }[s.toLowerCase().split(' ')[0]];
    if (w) return String(w);
    // A described edition reads "rev. ed." or "expanded ed." (CMOS 18, 14.15).
    s = s.replace(/\s+edition$/i, ' ed.');
    if (!/\bed\.$/i.test(s)) s += ' ed.';
    return s.charAt(0).toLowerCase() + s.slice(1);
  }
  // 2:26 becomes 2 min., 26 sec.; 1:02:15 becomes 1 hr., 2 min., 15 sec.
  function runTime(s) {
    var m = clean(s).match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
    if (!m) return clean(s);
    var out = [];
    if (m[1] && +m[1]) out.push(+m[1] + ' hr.');
    if (+m[2]) out.push(+m[2] + ' min.');
    if (+m[3]) out.push(+m[3] + ' sec.');
    return out.join(', ');
  }
  function sameName(a, b) { return clean(a).toLowerCase().replace(/^the /, '') === clean(b).toLowerCase().replace(/^the /, ''); }

  // ------------------------------------------------------------------ titles
  // Chicago headline style (CMOS 18, 8.159): lowercase articles, prepositions, and the
  // conjunctions and, but, for, or, nor, plus to and as, unless first or last or after a
  // colon. The style capitalizes the rest; this only lowers what was typed in capitals.
  // Words that can also be adverbs or conjunctions (up, down, like, since, before) are left as typed.
  var LOWER = /^(a|an|the|and|but|for|or|nor|to|as|of|in|on|at|by|from|into|onto|upon|with|within|without|among|amid|between|through|throughout|toward|towards|via|per|against|during|versus|vs\.?)$/i;
  function headline(s) {
    var w = clean(s).split(' ');
    return w.map(function (x, i) {
      var first = i === 0 || /[:?!.—]$/.test(w[i - 1]), last = i === w.length - 1;
      var core = x.replace(/^[^A-Za-z]+|[^A-Za-z.]+$/g, '');
      if (!first && !last && LOWER.test(core) && /^[A-Z][a-z]*\.?$/.test(core)) return x.replace(core, core.toLowerCase());
      return x;
    }).join(' ');
  }
  // Words with a dot inside (Merriam-Webster.com) keep their case through the style's title casing.
  function protect(s) { return String(s).replace(/(\S*[a-z0-9]\.[a-z]{2,}\S*)/gi, '<span class="nocase">$1</span>'); }
  // A short title for shortened notes: the main title, without a subtitle or an initial A, An, or The (CMOS 18, 13.32).
  function autoShort(title) {
    var main = clean(title).split(/:\s|\s[—–]\s/)[0];
    var bare = main.replace(/^(a|an|the)\s+/i, '');
    return bare || main;
  }

  // ------------------------------------------------------------------ form -> CSL-JSON
  function toCSL(st, id) {
    var type = TYPES[st.type] ? st.type : 'book', t = TYPES[type];
    var on = {};
    t.f.forEach(function (k) { on[k] = true; });
    var v = function (k) { return on[k] ? clean(st[k]) : ''; };
    var it = { id: id || 'item' };
    var authors = on.authors ? parseNames(st.authors) : [];
    var editors = on.editors ? parseNames(st.editors) : [];
    var translators = on.translators ? parseNames(st.translators) : [];
    if (authors.length) it.author = authors;
    if (editors.length) it.editor = editors;
    if (translators.length) it.translator = translators;
    var d = parseDate(st.date);
    if (d) it.issued = d.csl;
    var title = v('title'), desc = clean(st.description);
    var keepCase = type === 'post' || (type === 'entry' && !authors.length);
    if (type === 'post') title = title.replace(/\.$/, '');
    if (title) it.title = keepCase ? title : protect(headline(title));
    else if (desc) it.genre = desc;
    if (title && on.shortTitle) {
      var sh = v('shortTitle') || autoShort(title);
      if (sh && sh !== title) it['title-short'] = keepCase ? sh : protect(headline(sh));
    }
    if (v('container')) it['container-title'] = protect(v('container'));
    if (v('volume')) it.volume = v('volume').replace(/^vol\.?\s*/i, '');
    if (v('issue')) it.issue = v('issue').replace(/^no\.?\s*/i, '');
    if (v('pages')) it.page = v('pages').replace(/^pp?\.\s*/i, '');
    if (v('articleNumber')) it.page = v('articleNumber').replace(/^article\s*/i, '');
    if (v('edition') && edNumber(v('edition')) !== '1') it.edition = edNumber(v('edition'));
    if (v('publisher')) it.publisher = v('publisher');
    var od = on.origDate ? parseDate(st.origDate) : null;
    if (od && od.csl['date-parts']) it['original-date'] = od.csl;
    if (v('format')) it.medium = v('format');
    if (v('database')) it.archive = v('database');
    var doi = on.doi ? normDoi(st.doi) : '';
    if (doi) it.DOI = doi;
    else if (v('url')) it.URL = v('url').replace(/^(?!https?:\/\/)(www\.)/i, 'https://$1');
    var acc = on.accessed ? parseDate(st.accessed) : null;
    if (acc && acc.csl['date-parts']) it.accessed = acc.csl;

    switch (type) {
      case 'book': it.type = 'book'; break;
      case 'chapter': it.type = 'chapter'; break;
      case 'journal': it.type = 'article-journal'; break;
      case 'magazine': it.type = 'article-magazine'; break;
      case 'news': it.type = 'article-newspaper'; break;
      case 'blog': it.type = 'post-weblog'; break;
      case 'webpage':
        it.type = 'webpage';
        // A page by the organization that runs the site is listed under that owner (CMOS 18, 14.104).
        if (authors.length === 1 && authors[0].literal && !it.publisher) { it.publisher = authors[0].literal; delete it.author; }
        if (it.publisher && it['container-title'] && sameName(it.publisher, it['container-title'])) delete it.publisher;
        break;
      case 'report':
        it.type = 'report';
        if (v('reportType')) it.genre = v('reportType');
        if (v('reportNumber')) it.number = v('reportNumber').replace(/^no\.\s*/i, '');
        break;
      case 'thesis': it.type = 'thesis'; it.genre = v('thesisType') || 'PhD diss.'; break;
      case 'conference':
        // A paper reads "paper presented at ..."; a lecture, poster, or keynote is named before the event.
        var kind = v('presentationType').toLowerCase();
        it.type = !kind || kind === 'paper' ? 'paper-conference' : 'speech';
        if (it.type === 'speech') it.genre = kind;
        if (v('event')) it['event-title'] = v('event');
        if (v('place')) it['event-place'] = v('place');
        break;
      case 'video':
        // A short online video takes its title in quotation marks, then the platform and running time (CMOS 18, 14.165).
        it.type = 'webpage'; it.genre = (v('platform') || 'Online') + ' video';
        if (v('duration')) it.dimensions = runTime(v('duration'));
        break;
      case 'post':
        it.type = 'post';
        if (v('postType')) it.genre = (v('platform') ? v('platform') + ' ' : '') + v('postType');
        else if (v('platform')) it['container-title'] = v('platform');
        break;
      case 'archival':
        it.type = 'manuscript';
        if (v('repository')) it.archive = v('repository');
        if (v('collection')) it.archive_collection = v('collection');
        if (v('place')) it['archive-place'] = v('place');
        if (v('boxFolder')) it.archive_location = v('boxFolder');
        break;
      case 'entry':
        // A signed entry is cited like a chapter (CMOS 18, 14.132); an unsigned one by the work's name (14.130-31).
        it.type = authors.length ? 'chapter' : 'entry-dictionary';
        break;
      case 'ai': it.type = 'ai'; break;
    }
    return it;
  }

  // ------------------------------------------------------------------ formatting
  var STYLE = '', LOCALE = '';
  function setup(style, locale) { STYLE = style; LOCALE = locale; engine = null; }
  var engine = null, store = {};
  function getEngine() {
    if (!engine) {
      if (typeof CSL === 'undefined') throw new Error('citeproc-js is not loaded');
      engine = new CSL.Engine({ retrieveLocale: function () { return LOCALE; }, retrieveItem: function (id) { return store[id]; } }, STYLE, 'en-US');
    }
    return engine;
  }
  // Mirrors the bibliography layout of chicago-notes-bibliography.csl: which items it prints.
  function inBibliography(it) {
    if (it.type === 'ai' || it.type === 'post') return false;
    if (/^entry/.test(it.type)) return !!it.author;
    if (it.archive || it['archive-place'] || it['container-title'] || it.DOI || it.number || it.publisher || it.URL) return true;
    return !/^(interview|personal_communication|document|manuscript|paper-conference|speech)$/.test(it.type);
  }

  // Fixes the style file cannot make from the data alone.
  function afterNote(item, st, html, full) {
    var out = html;
    // A post's handle follows the name in the full note: Pete Souza (@petesouza), ... (CMOS 18, 14.106).
    var h = clean(st.handle).replace(/^@?/, '@');
    if (full && st.type === 'post' && h !== '@' && item.author && item.author.length) {
      var nm = esc(displayName(item.author[0]));
      if (out.indexOf(nm) === 0) out = nm + ' (' + h + ')' + out.slice(nm.length);
    }
    // An untitled letter reads "Abigail Adams to Thomas Jefferson, June 6, 1786".
    if (isLetter(st)) out = out.replace(/, (to\s)/i, ' $1');
    // An unsigned online entry leads with the dictionary: Merriam-Webster.com Dictionary, "salvation," accessed ... (CMOS 18, 14.131).
    if (full && st.type === 'entry' && !item.author) out = out.replace(/^(\u201C[\s\S]*?),\u201D (<i>[\s\S]*?<\/i>), /, '$2, $1,\u201D ');
    return markDateKind(st, out, false);
  }
  function isLetter(st) { return st.type === 'archival' && /^to\s/i.test(clean(st.description)) && !clean(st.title); }
  function afterBib(item, st, html) {
    var out = html;
    // In the bibliography the letter is described: Adams, Abigail. Letter to Thomas Jefferson, June 6, 1786. ...
    if (isLetter(st)) out = out.replace(/\. To (\S)/, '. Letter to $1').replace(/(Letter to [^<]*?)\. ((?:January|February|March|April|May|June|July|August|September|October|November|December|\d{4})[^.]*?\d{4}\.)/, '$1, $2');
    var dt = dateText(st.date);
    if (st.type === 'conference' && clean(st.place) && dt) out = out.replace(esc(clean(st.place)) + '. ' + dt, esc(clean(st.place)) + ', ' + dt);
    if (st.type === 'video' && dt) out = out.replace(' video. ' + dt + '.', ' video, ' + dt + '.');
    return markDateKind(st, out, true);
  }
  // "Last modified April 17, 2017" for a page that gives a revision date (CMOS 18, 14.104).
  function markDateKind(st, html, bib) {
    if (st.type !== 'webpage' || clean(st.dateKind) !== 'modified') return html;
    var dt = dateText(st.date); if (!dt || !/\d{4}$/.test(dt)) return html;
    var i = html.indexOf(dt); if (i < 0) return html;
    if (!bib) return html.slice(0, i) + 'last modified ' + html.slice(i);
    // In the bibliography the date is its own sentence: Privacy & Terms. Last modified April 17, 2017.
    return html.slice(0, i).replace(/,\s$/, '. ') + 'Last modified ' + html.slice(i);
  }
  function stripTags(html) {
    return html.replace(/<[^>]+>/g, '').replace(/&#38;/g, '&').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#60;/g, '<').replace(/&#62;/g, '>');
  }
  function toMarkdown(html) { return stripTags(html.replace(/<\/?i>/g, '*')); }
  function pack(html) { return { html: html, text: stripTags(html), md: toMarkdown(html) }; }

  // AI-generated text is cited in a note only (CMOS 18, 14.112):
  // Text generated by ChatGPT, OpenAI, March 7, 2023, https://chat.openai.com/chat.
  // Response to "Explain how to make pizza dough ...," ChatGPT, OpenAI, March 7, 2023.
  function aiNote(st, full) {
    var tool = esc(clean(st.title) || 'AI tool'), dev = esc(clean(st.publisher)), dt = dateText(st.date), pr = clean(st.prompt).replace(/^"|"$/g, '');
    var url = clean(st.url) ? clean(st.url).replace(/^(?!https?:\/\/)(www\.)/i, 'https://$1') : '';
    var lead = pr ? 'Response to \u201C' + esc(pr) + ',\u201D ' + tool + ',' : 'Text generated by ' + tool + ',';
    var parts = [lead];
    if (dev) parts.push(dev + ',');
    parts.push(dt || 'n.d.');
    if (!full) parts = [lead, dt || 'n.d.'];
    var s = parts.join(' ');
    if (full && url) s += ', ' + esc(url);
    return s + '.';
  }

  // entries: [{ id, st }]. Returns, for each source, the full note, the shortened note,
  // and the bibliography entry (null for sources Chicago cites in notes only), plus
  // the bibliography order.
  function render(entries) {
    var eng = getEngine();
    store = {};
    // citeproc-js caches each item by id, so an edited source gets a new engine id:
    // the source's own id plus a hash of its content.
    var items = {}, key = {}, back = {}, stOf = {};
    entries.forEach(function (e) {
      var it = toCSL(e.st, e.id), k = e.id + '~' + hash(JSON.stringify(it) + JSON.stringify(e.st.handle || ''));
      it.id = k; items[e.id] = it; key[e.id] = k; back[k] = e.id; stOf[e.id] = e.st;
      if (it.type !== 'ai') store[k] = it;
    });
    var ids = entries.map(function (e) { return key[e.id]; }).filter(function (k) { return store[k] && hasContent(store[k]); });
    eng.updateItems(ids);
    var refs = {}, order = [];
    entries.forEach(function (e) {
      var it = items[e.id];
      if (it.type === 'ai') { if (clean(e.st.title) || clean(e.st.prompt)) refs[e.id] = { bib: null, ai: true }; return; }
      if (store[key[e.id]] && ids.indexOf(key[e.id]) !== -1) refs[e.id] = { bib: null };
    });
    if (ids.length) {
      eng.setOutputFormat('html');
      var bib = eng.makeBibliography();
      var printed = bib[0].entry_ids.map(function (x) { return x[0]; }).filter(function (k) { return inBibliography(store[k]); });
      if (printed.length !== bib[1].length) throw new Error('Bibliography entries did not line up with sources (' + printed.length + ' / ' + bib[1].length + ').');
      printed.forEach(function (k, n) {
        var id = back[k];
        refs[id].bib = pack(afterBib(items[id], stOf[id], bib[1][n].replace(/^\s*<div class="csl-entry">|<\/div>\s*$/g, '').trim()));
        order.push(id);
      });
    }
    function note(id, opt) {
      opt = opt || {};
      if (!refs[id]) return null;
      var st = stOf[id], full, short;
      if (refs[id].ai) { full = aiNote(st, true); short = aiNote(st, false); }
      else {
        var base = { id: key[id] }, loc = clean(opt.locator);
        if (loc) {
          var labels = { page: 'page', para: 'paragraph', section: 'section', chapter: 'chapter', volume: 'volume', line: 'line' };
          if (labels[opt.locType]) { base.locator = loc.replace(/^(pp?|paras?|secs?|chaps?|vols?|ll?)\.\s*/i, ''); base.label = labels[opt.locType]; }
          else base.suffix = ', ' + esc(loc);
        }
        eng.setOutputFormat('html');
        full = afterNote(items[id], st, eng.makeCitationCluster([base]), true);
        short = afterNote(items[id], st, eng.makeCitationCluster([Object.assign({ position: 1 }, base)]), false);
        if (isLetter(st) && items[id].author) {
          // A shortened note for a letter: Adams to Jefferson, June 6, 1786 (CMOS 18, 14.120).
          var a0 = items[id].author[0], to = clean(st.description).split(' ').pop(), dt = dateText(st.date);
          short = esc((a0.family || a0.literal) + ' to ' + to) + (dt ? ', ' + dt : '') + (base.locator ? ', ' + esc(base.locator) : base.suffix || '') + '.';
        }
      }
      // Quoted in: the original, then "quoted in" and the source you read (CMOS 18, 14.55).
      var orig = clean(opt.original);
      if (opt.secondary && orig) {
        orig = esc(orig.replace(/[.,]$/, ''));
        full = orig + ', quoted in ' + full;
        short = orig + ', quoted in ' + short;
      }
      return { full: full, short: short, fullText: stripTags(full), shortText: stripTags(short) };
    }
    // Several sources in one note, separated by semicolons (CMOS 18, 13.29).
    function group(list) {
      var parts = list.filter(function (id) { return refs[id]; }).map(function (id) { return note(id, {}).full.replace(/\.$/, ''); });
      return parts.length ? parts.join('; ') + '.' : '';
    }
    return { refs: refs, order: order, note: note, group: group, items: items };
  }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function hasContent(it) { return !!(it && (it.title || it.genre || it.author || it.editor || it['container-title'] || it.URL || it.DOI)); }

  // ------------------------------------------------------------------ checks
  var DATABASE_HOSTS = /ebscohost\.com|proquest\.com|gale\.com|galegroup\.com|infotrac|lexisnexis|nexisuni|search\.ebsco|ezproxy|libproxy|\.idm\.oclc\.org|login\.|openurl/i;
  function checks(st, opt) {
    opt = opt || {};
    var type = TYPES[st.type] ? st.type : 'book', t = TYPES[type], on = {}, out = [];
    t.f.forEach(function (k) { on[k] = true; });
    function add(level, msg, key) { out.push({ level: level, msg: msg, key: key || '' }); }
    var authors = on.authors ? lines(st.authors) : [], editors = on.editors ? lines(st.editors) : [];
    var title = clean(st.title), desc = clean(st.description);
    var empty = !authors.length && !title && !desc && !clean(st.container) && !clean(st.url) && !clean(st.doi) && !clean(st.prompt);
    if (empty) return out;
    if (type === 'ai') {
      if (!title) add('fix', 'Give the name of the tool, such as ChatGPT.', 'title');
      if (!clean(st.publisher)) add('check', 'Give the company that makes the tool, such as OpenAI.', 'publisher');
      if (!clean(st.date)) add('fix', 'Give the date you generated the text.', 'date');
      if (!clean(st.prompt)) add('note', 'If you quote or discuss the response, give the prompt you used, and Chicago puts it in the note.', 'prompt');
      add('note', NOTES_ONLY_MSG.ai + ' Check your instructor\'s policy on AI use.', '');
      return out;
    }
    if (!title && !desc) add('fix', type === 'archival' ? 'No title. Give the document\'s title, or describe it under "No title? Describe it", such as "to Thomas Jefferson" for a letter.' : 'No title. A work without one takes a short description instead: fill in "No title? Describe it".', 'title');
    authors.concat(editors).forEach(function (l) { if (looksLikePerson(l)) add('check', '"' + l + '" looks like a person written first name first. Write people as Surname, Given names; a name without a comma is treated as a group.', 'authors'); });
    if (!authors.length && !editors.length && (type === 'news' || type === 'magazine')) add('note', 'No author: the note begins with the title, and the bibliography entry with the name of the ' + (type === 'news' ? 'newspaper' : 'magazine') + '.', 'authors');
    else if (!authors.length && !editors.length && type !== 'entry' && type !== 'webpage' && type !== 'archival') add('note', 'No author, so the note and the bibliography entry begin with the title. If a group or organization wrote it, give that as the author instead.', 'authors');
    var d = parseDate(st.date);
    if (!clean(st.date) && type !== 'entry') add('note', type === 'webpage' ? 'No date. A page with no date of publication or revision takes the date you accessed it: fill in Accessed.' : 'No date: Chicago gives n.d. Use it only when the source really has none.', 'date');
    else if (d && d.level === 'raw') add('check', 'The date was not recognized and is printed as typed. Try 2019, October 31, 2019, or 10/31/2019.', 'date');
    if (type === 'webpage' && !clean(st.date) && !clean(st.accessed)) add('check', 'Give the date you accessed the page, since it shows no date of its own.', 'accessed');
    if (on.accessed && clean(st.accessed) && clean(st.date) && type === 'webpage') add('note', 'Chicago needs an access date only when the page has no date of its own. Keep it if your instructor asks for one.', 'accessed');
    if (on.shortTitle && title && !clean(st.shortTitle) && words(autoShort(title)) > 4) add('check', 'Shortened notes use a short title of up to four words from the main title. Type one under Short title.', 'shortTitle');
    if (on.shortTitle && clean(st.shortTitle) && words(st.shortTitle) > 4) add('check', 'A short title should be no more than four words.', 'shortTitle');
    if (type === 'journal' && !clean(st.volume)) add('check', 'Give the volume number. Chicago cites a journal article by volume and issue.', 'volume');
    if (type === 'journal' && !normDoi(st.doi) && !clean(st.url) && !clean(st.database)) add('note', 'For an article read online, add the DOI, or a stable URL, or the name of the database where you found it.', 'doi');
    if (on.doi && clean(st.doi) && !normDoi(st.doi)) add('fix', 'That does not look like a DOI. A DOI starts with 10. and contains a slash, such as 10.1086/685810.', 'doi');
    if (on.url && DATABASE_HOSTS.test(clean(st.url))) add('check', 'That looks like a library database link, which readers cannot open. Use the DOI or a stable URL, or give the database name instead.', 'url');
    if (/^(webpage|blog|video|post)$/.test(type) && !clean(st.url)) add('fix', 'This kind of source needs its URL so a reader can find it.', 'url');
    if (type === 'chapter' && !editors.length) add('check', 'A chapter in an edited book names the book\'s editors after the book title. Add them under Editors of the book.', 'editors');
    if (type === 'chapter' && !clean(st.container)) add('fix', 'Give the title of the book the chapter appears in.', 'container');
    if (type === 'thesis' && !clean(st.publisher)) add('fix', 'Give the university that awarded the degree.', 'publisher');
    if (type === 'post' && title.length > 280) add('check', 'Chicago quotes a post\'s text up to the first 280 characters. Cut it there.', 'title');
    if (type === 'post') add('note', NOTES_ONLY_MSG.post, '');
    if (type === 'entry' && !authors.length) add('note', NOTES_ONLY_MSG.entry + ' A signed entry in a scholarly encyclopedia does get one: give its author.', '');
    if (type === 'conference' && !clean(st.url)) add('note', NOTES_ONLY_MSG.conference, '');
    if (type === 'archival' && !clean(st.repository)) add('check', 'Give the library or archive that holds the document.', 'repository');
    if (authors.length >= 7) add('note', authors.length + ' authors: the bibliography lists the first three and et al.; notes give the first author and et al.', 'authors');
    else if (authors.length >= 3) add('note', authors.length + ' authors: notes give the first author and et al.; the bibliography lists them all.', 'authors');
    if (opt.quote && !clean(opt.locator)) add('check', 'A quotation should give the page, or another locator such as a paragraph or section if there are no pages.', 'locator');
    if (opt.secondary && !clean(opt.original)) add('fix', 'Give the original source you are quoting, as it should appear before "quoted in".', 'original');
    var order = { fix: 0, check: 1, note: 2 };
    out.sort(function (a, b) { return order[a.level] - order[b.level]; });
    return out;
  }

  // ------------------------------------------------------------------ list files and exports
  function listFile(name, saved, notesText) {
    return JSON.stringify({
      app: 'Chicago Citation Generator', format: 1, name: name || '', savedAt: new Date().toISOString(),
      sources: saved.map(function (x) {
        var fields = { type: x.st.type };
        TEXT_KEYS.forEach(function (k) { if (clean(x.st[k])) fields[k] = x.st[k]; });
        return { id: x.id, note: (notesText && notesText[x.id]) || '', fields: fields };
      })
    }, null, 2);
  }
  function parseListFile(text) {
    var j;
    try { j = JSON.parse(text); } catch (e) { return { error: 'That file is not a list file: it could not be read as JSON.' }; }
    if (!j || !Array.isArray(j.sources)) return { error: 'That file has no list of sources in it.' };
    if (j.app && /APA/.test(j.app)) return { error: 'That is a list file from the APA Citation Generator. Open it there instead.' };
    var items = [];
    j.sources.forEach(function (s, n) {
      var f = s && (s.fields || s.st);
      if (!f || typeof f !== 'object') return;
      var st = { type: TYPES[f.type] ? f.type : 'book' };
      TEXT_KEYS.forEach(function (k) { st[k] = typeof f[k] === 'string' ? f[k] : (Array.isArray(f[k]) ? f[k].join('\n') : ''); });
      items.push({ id: typeof s.id === 'string' && s.id ? s.id : 'src-' + Date.now() + '-' + n, st: st });
    });
    return { name: typeof j.name === 'string' ? j.name : '', items: items };
  }
  function mdText(name, mds) {
    return (name ? '# ' + name + '\n\n' : '') + '## Bibliography\n\n' + mds.join('\n\n') + '\n';
  }

  // A minimal Word file: "Bibliography" centered, then each entry single-spaced with a
  // blank line between entries and a half-inch hanging indent, Times New Roman 12.
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) { return new TextEncoder().encode(s); }
  function zip(files) {
    var parts = [], central = [], off = 0;
    function u16(n) { return [n & 255, (n >>> 8) & 255]; }
    function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = utf8(f.name), data = utf8(f.data), crc = crc32(data);
      var head = [].concat([0x50, 0x4b, 3, 4], u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(head), name, data);
      central.push(new Uint8Array([].concat([0x50, 0x4b, 1, 2], u16(20), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), name);
      off += head.length + name.length + data.length;
    });
    var csize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var end = new Uint8Array([].concat([0x50, 0x4b, 5, 6], u16(0), u16(0), u16(files.length), u16(files.length), u32(csize), u32(off), u16(0)));
    var all = parts.concat(central, [end]), len = all.reduce(function (a, b) { return a + b.length; }, 0), out = new Uint8Array(len), p = 0;
    all.forEach(function (b) { out.set(b, p); p += b.length; });
    return out;
  }
  function xesc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function runsXml(html) {
    var out = [], re = /<i>(.*?)<\/i>|([^<]+)|<[^>]+>/g, m;
    while ((m = re.exec(html))) {
      if (m[1] != null) out.push('<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">' + xesc(stripTags(m[1])) + '</w:t></w:r>');
      else if (m[2] != null) out.push('<w:r><w:t xml:space="preserve">' + xesc(stripTags(m[2])) + '</w:t></w:r>');
    }
    return out.join('');
  }
  function docxBytes(htmls) {
    var W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    var body = '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="480"/></w:pPr><w:r><w:t>Bibliography</w:t></w:r></w:p>'
      + htmls.map(function (h) { return '<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:after="240"/><w:ind w:left="720" w:hanging="720"/></w:pPr>' + runsXml(h) + '</w:p>'; }).join('');
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + W + '><w:body>' + body
      + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>';
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + W + '><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';
    return zip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'word/document.xml', data: doc },
      { name: 'word/styles.xml', data: styles }
    ]);
  }

  return {
    TYPES: TYPES, TEXT_KEYS: TEXT_KEYS, setup: setup, toCSL: toCSL, render: render, checks: checks, headline: headline, autoShort: autoShort,
    parseNames: parseNames, parseDate: parseDate, dateText: dateText, normDoi: normDoi, inBibliography: inBibliography,
    listFile: listFile, parseListFile: parseListFile, mdText: mdText, docxBytes: docxBytes, stripTags: stripTags, toMarkdown: toMarkdown
  };
})();
if (typeof module !== 'undefined') module.exports = CMS;
