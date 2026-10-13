(function () {
  'use strict';
  var A = CMS;
  function $(id) { return document.getElementById(id); }
  A.setup(window.CMS_STYLE, window.CMS_LOCALE);

  // ------------------------------------------------------------------ what each type asks for
  var PERSON_HINT = 'One per line. People as Surname, Given names, with names as the source gives them (Satterfield, Susan). A group or organization as written (World Health Organization).';
  var LABELS = {
    authors: { video: 'Person or channel that posted it', post: 'Person or group that posted it', webpage: 'Author, or the organization that runs the site', report: 'Author or agency', archival: 'Writer or creator', entry: 'Author of the entry, if signed' },
    container: { journal: 'Journal', webpage: 'Site name', blog: 'Blog name', news: 'Newspaper', magazine: 'Magazine', chapter: 'Title of the book', entry: 'Dictionary or encyclopedia' },
    publisher: { thesis: 'University that awarded the degree', webpage: 'Owner or sponsor of the site, if not the author', ai: 'Company that makes it' },
    title: { post: 'Text of the post (up to the first 280 characters)', ai: 'Name of the tool', chapter: 'Title of the chapter', entry: 'Entry word or title', journal: 'Title of the article', news: 'Headline', magazine: 'Title of the article', webpage: 'Title of the page', blog: 'Title of the post', video: 'Title of the video', archival: 'Title of the document, if it has one' },
    platform: { video: 'Where it was posted', post: 'Platform' },
    duration: {},
    editors: { chapter: 'Editors of the book', book: 'Editors (if the book has editors instead of authors)', entry: 'Editors of the reference work' },
    place: { archival: 'City of the archive', conference: 'Where it was held' },
    date: { ai: 'Date you generated it', archival: 'Date of the document', entry: 'Date published or updated' }
  };
  var HINTS = {
    title: { _: 'Type it as it appears. Chicago puts it in headline style: major words capitalized, articles, prepositions, and and, but, or lowercase.', post: 'Copy the post\'s words exactly, emoji and hashtags included, up to the first 280 characters.', ai: 'The tool\'s name, such as ChatGPT.', entry: 'For a dictionary, the word as the dictionary prints it.', archival: 'Leave blank for a letter or other untitled item, and describe it below instead.' },
    container: { _: 'Keep the publication\'s own capitalization.', webpage: 'The name of the whole site.', chapter: 'The book\'s full title.', entry: 'Merriam-Webster.com Dictionary, Encyclopaedia Britannica, and so on.' },
    publisher: { _: 'The publisher\'s name as it appears on the title page. Chicago 18 leaves out the city.', thesis: '', webpage: 'Only if a company or organization other than the author owns the site, such as Google for Privacy & Terms.', ai: 'Such as OpenAI or Anthropic.' },
    url: { _: 'Only if there is no DOI, and only a link readers can open. Leave out library database links.', webpage: '', blog: '', video: '', post: '', ai: 'Only if the response can be reached at a public link.' },
    date: { _: 'Any common form: 2019, October 31, 2019, 10/31/2019, Spring 2020. Blank gives n.d.', journal: 'The year is enough for a journal article with a volume and issue.', book: 'The year is enough for a book.', chapter: 'The year the book was published.', thesis: 'The year the degree was awarded.', ai: 'The day you generated the text.', webpage: 'The date of publication or of the latest revision. If the page has none, leave this blank and fill in Accessed.' },
    authors: { _: PERSON_HINT, video: 'The person or channel name exactly as it appears where the video was posted.', post: 'The real name if known, Surname, Given names, or the account\'s name. Put the @handle in Handle.', webpage: 'A person, as Surname, Given names; or the organization that runs the site, as written.', entry: 'Leave blank for an unsigned dictionary or encyclopedia entry.' },
    editors: { _: '', chapter: 'Shown after the book title: ed. John D\'Agata.' }
  };
  function pick(table, type) { return table && (has(table, type) ? table[type] : table._); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  // Examples use placeholder names and example.org addresses. They show the form only.
  var SAMPLES = {
    book: { authors: 'Doe, Jane A.', date: '2021', title: 'Writing with Sources: A Practical Guide', edition: '3rd', publisher: 'Example University Press' },
    chapter: { authors: 'Rivera, Luis', date: '2020', title: 'Footnotes and the Historian\'s Craft', editors: 'Doe, Jane A.\nKim, Soo-Ah', container: 'Research Writing Across the Disciplines', pages: '45-62', publisher: 'Example University Press' },
    journal: { authors: 'Doe, Jane A.\nRivera, Luis', date: '2022', title: 'Reading Habits of First-Year College Students: A Mixed-Methods Study', container: 'Journal of Example Studies', volume: '14', issue: '2', pages: '115-31', doi: '10.1234/example.2022.0042' },
    magazine: { authors: 'Rivera, Luis', date: 'May 2023', title: 'The Quiet Return of Handwriting', container: 'Example Monthly' },
    news: { authors: 'Doe, Jane A.', date: 'June 14, 2024', title: 'City Council Approves New Library Hours', container: 'Example Tribune', url: 'https://www.example.com/2024/06/14/library-hours' },
    webpage: { authors: 'Example Health Institute', date: 'March 3, 2023', dateKind: 'modified', title: 'How to Read a Nutrition Label', container: 'Example Health', url: 'https://www.example.org/nutrition-labels' },
    blog: { authors: 'Rivera, Luis', date: 'September 12, 2024', title: 'Why Historians Still Love Footnotes', container: 'The Example History Blog', url: 'https://blog.example.org/2024/09/footnotes' },
    report: { authors: 'Example Department of Education', date: '2022', title: 'Community College Completion Rates, 2015–2020', reportType: 'Report', reportNumber: 'ED-2022-07', publisher: 'Example Department of Education', url: 'https://www.example.gov/reports/completion-2022' },
    thesis: { authors: 'Doe, Jane A.', date: '2019', title: 'Peer Tutoring and Persistence in First-Year Composition', shortTitle: 'Peer Tutoring', thesisType: 'PhD diss.', publisher: 'Example State University', database: 'ProQuest Dissertations and Theses Global' },
    conference: { authors: 'Doe, Jane A.', date: 'April 5, 2024', title: 'Teaching Citation as a Habit, Not a Format', shortTitle: 'Teaching Citation', event: 'Example Conference on College Writing', place: 'Albuquerque, NM' },
    video: { authors: 'Example Writing Center', date: 'August 28, 2023', title: 'How to Write a Footnote', platform: 'YouTube', duration: '6:42', url: 'https://www.youtube.com/watch?v=EXAMPLE0000' },
    post: { authors: 'Example Library', handle: '@ExampleLibrary', date: 'September 7, 2024', title: 'Extended hours start Monday: open until midnight through finals week', shortTitle: 'Extended hours', platform: 'X', url: 'https://x.com/ExampleLibrary/status/1234567890' },
    archival: { authors: 'Doe, Jane A.', description: 'to John Rivera', date: 'June 6, 1886', collection: 'Doe Family Papers', repository: 'Example State Historical Society', place: 'Santa Fe, NM' },
    entry: { title: 'footnote', container: 'Example Dictionary Online', url: 'https://www.example.org/dictionary/footnote', accessed: 'October 12, 2026' },
    ai: { title: 'ChatGPT', publisher: 'OpenAI', date: 'October 12, 2026', prompt: 'Explain the difference between a footnote and an endnote' }
  };

  var TIPS = [
    ['#h-type', 'The type decides which details Chicago asks for and how the note is put together. Pick the one that matches what you actually read: an article in a journal is a journal article even if you found it on a website.'],
    ['#h-who', 'Notes give names in normal order (Jane Doe); the bibliography inverts the first name (Doe, Jane). Notes give the first author and et al. for three or more authors. The bibliography lists up to six, or the first three and et al. for seven or more.'],
    ['#h-when', 'Books and journal articles take the year; newspapers, magazines, web pages, and posts take the full date. A web page with no date takes the date you accessed it instead.'],
    ['#h-what', 'Chicago capitalizes titles in headline style. Titles of whole works, such as books, journals, and reports, are italic; parts of something larger, such as articles, chapters, and web pages, go in quotation marks.'],
    ['#h-where', 'Chicago 18 leaves out the place of publication for books. Journals are cited by volume, issue, and year: 111, no. 2 (2016).'],
    ['#h-link', 'For an online source, end with a DOI, or else a URL readers can open, or else the name of the database. Chicago adds an access date only when a source shows no date of its own.'],
    ['#h-intext', 'Each note points to the exact place you used: usually a page. Superscript note numbers go after the punctuation at the end of the clause or sentence.'],
    ['#lab-full', 'The first time you cite a source, the note gives it in full. Number notes consecutively through the paper.'],
    ['#lab-short', 'After the first note, cite the source in shortened form: the author\'s surname, a short title, and the page. Chicago 18 prefers this to ibid.'],
    ['#lab-ref', 'Goes in the bibliography at the end of the paper, sorted by author, with a half-inch hanging indent. Some sources, such as social media posts and unsigned dictionary entries, are cited in notes only.'],
    ['#lab-checks', 'Fix means something is missing or wrong. Check means look again. Note is a reminder or a rule worth knowing.'],
    ['#lab-list', 'Add each source as you go. The bibliography sorts itself alphabetically by author and leaves out sources Chicago cites in notes only.'],
    ['#lab-file', 'Saves every source, with all its fields, to a .json file on your device. Open it here later, on any computer, to keep working. Nothing is uploaded.'],
    ['label[for="authors"]', PERSON_HINT],
    ['label[for="shortTitle"]', 'Up to four words from the main title, in the same order, without an opening A, An, or The: Curious Mind for A Curious Mind: The Secret to a Bigger Life.'],
    ['label[for="doi"]', 'A DOI (digital object identifier) is a permanent link. It usually appears on the first page of an article or on the publisher\'s page, and starts with 10.']
  ];

  // ------------------------------------------------------------------ state
  var K_DRAFT = 'cms-cite-draft-v1', K_LIST = 'cms-cite-list-v1', K_THEME = 'cms-cite-theme-v1';
  var saved = [], editingId = null, picked = {}, statusTimer = null, lastRender = null, usingSample = true, currentId = '__current';
  function sameSource(a, b) { return a.type === b.type && A.TEXT_KEYS.every(function (k) { return String(a[k] || '').trim() === String(b[k] || '').trim(); }); }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function currentType() { var r = document.querySelector('input[name="type"]:checked'); return r ? r.value : 'book'; }
  function read() {
    var st = { type: currentType() };
    A.TEXT_KEYS.forEach(function (k) { var el = $(k); st[k] = el ? el.value : ''; });
    return st;
  }
  function write(st) {
    var r = $('type-' + (A.TYPES[st.type] ? st.type : 'book')); if (r) r.checked = true;
    A.TEXT_KEYS.forEach(function (k) {
      var el = $(k); if (!el) return;
      if (el.tagName === 'SELECT') el.value = st[k] || el.options[0].value; else el.value = st[k] || '';
    });
  }
  function blank(type) { var st = { type: type }; A.TEXT_KEYS.forEach(function (k) { st[k] = ''; }); return st; }
  function sample(type) { return Object.assign(blank(type), SAMPLES[type] || {}); }
  function noteOpts() {
    var t = $('locType').value;
    return { locType: t, locator: t ? $('locator').value : '', quote: $('quote').checked, secondary: $('secondary').checked, original: $('original').value };
  }

  // ------------------------------------------------------------------ paint
  function dress() {
    var type = currentType(), t = A.TYPES[type], on = {};
    t.f.forEach(function (k) { on[k] = true; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-f]'), function (el) { el.hidden = !on[el.getAttribute('data-f')]; });
    ['s-who', 's-where'].forEach(function (id) { var any = Array.prototype.some.call($(id).querySelectorAll('[data-f]'), function (el) { return !el.hidden; }); $(id).hidden = !any; });
    Array.prototype.forEach.call(document.querySelectorAll('.form .row'), function (row) { if (row.querySelector('[data-f]')) row.hidden = !Array.prototype.some.call(row.querySelectorAll('[data-f]'), function (el) { return !el.hidden; }); });
    $('descWrap').hidden = type === 'ai' || type === 'post';
    function setText(id, v) { if ($(id)) $(id).textContent = v; }
    setText('authorsLabel', pick(LABELS.authors, type) || 'Authors');
    setText('containerLabel', pick(LABELS.container, type) || 'Published in');
    setText('publisherLabel', pick(LABELS.publisher, type) || 'Publisher');
    setText('titleLabel', pick(LABELS.title, type) || 'Title');
    setText('platformLabel', pick(LABELS.platform, type) || 'Platform');
    setText('editorsLabel', pick(LABELS.editors, type) || 'Editors');
    setText('placeLabel', pick(LABELS.place, type) || 'Place');
    setText('dateLabel', pick(LABELS.date, type) || 'Date published');
    setText('volumeLabel', type === 'book' ? 'Volume (of a multivolume work)' : 'Volume');
    setText('pagesLabel', type === 'chapter' ? 'Pages of the chapter' : 'Pages');
    setText('descLabel', type === 'archival' ? 'Untitled? Describe it' : 'No title? Describe it');
    ['title', 'container', 'publisher', 'url', 'date', 'authors', 'editors'].forEach(function (k) { setText(k + 'Hint', pick(HINTS[k], type) || ''); });
    $('authors').placeholder = type === 'video' ? 'Example Writing Center' : 'Surname, Given names (one per line)';
    $('platform').placeholder = type === 'video' ? 'YouTube' : 'Instagram';
    $('publisher').placeholder = { thesis: 'University of Chicago', webpage: 'Google', ai: 'OpenAI' }[type] || 'Example University Press';
    $('container').placeholder = { journal: 'Classical Philology', webpage: 'Privacy & Terms', blog: 'The Example Blog', news: 'New York Times', magazine: 'New Yorker', chapter: 'The Making of the American Essay', entry: 'Merriam-Webster.com Dictionary' }[type] || '';
    $('title').placeholder = { ai: 'ChatGPT', archival: 'Leave blank for a letter' }[type] || '';
    $('description').placeholder = type === 'archival' ? 'to Thomas Jefferson' : 'Map of Clovis, New Mexico, in 1910';
  }
  function setStatus(msg, bad) {
    var s = $('status'); s.textContent = msg; s.className = 'status' + (bad ? ' bad' : '');
    clearTimeout(statusTimer); if (!bad) statusTimer = setTimeout(function () { s.textContent = ''; }, 2600);
  }
  function render() {
    var st = read(), opts = noteOpts();
    $('locWrap').hidden = !$('locType').value;
    $('locatorLabel').textContent = { page: 'Page or page range', para: 'Paragraph number', section: 'Section', chapter: 'Chapter', volume: 'Volume (and page, as 2:45)', other: 'What to give' }[$('locType').value] || '';
    $('locator').placeholder = { page: '45 or 45-47', para: '5', section: '2.3', chapter: '3', volume: '2', other: 'at 1:02:15, or table 2' }[$('locType').value] || '';
    $('origWrap').hidden = !$('secondary').checked;
    // If the form holds a source that is already in the list, it is that source, not a second one.
    var same = editingId ? null : saved.filter(function (x) { return sameSource(x.st, st); })[0];
    var cur = same ? same.id : '__current';
    var entries = saved.filter(function (x) { return x.id !== editingId; }).map(function (x) { return { id: x.id, st: x.st }; });
    if (!same) entries.push({ id: '__current', st: st });
    var r;
    try { r = A.render(entries); } catch (e) { r = null; setStatus('Something went wrong formatting this source: ' + e.message, true); }
    lastRender = r; currentId = cur;
    var ref = r && r.refs[cur], n = ref ? r.note(cur, opts) : null;
    if (n) { $('full').innerHTML = n.full; $('short').innerHTML = n.short; $('full').className = $('short').className = 'note-out'; }
    else { $('full').className = 'ref empty'; $('full').textContent = 'Fill in a few details and the note appears here.'; $('short').textContent = ''; }
    var el = $('ref');
    if (ref && ref.bib) { el.className = 'ref'; el.innerHTML = ref.bib.html; }
    else if (ref) { el.className = 'ref none'; el.textContent = 'None. Chicago cites this kind of source in notes only.'; }
    else { el.className = 'ref empty'; el.textContent = ''; }
    $('refActions').hidden = !(ref && ref.bib);
    ['copyFull', 'copyShort', 'copyRef', 'copyRefPlain', 'addBtn'].forEach(function (id) { $(id).disabled = !ref; });
    $('noteHint').textContent = !n ? '' : opts.secondary ? 'Only the source you actually read goes in the bibliography.'
      : (st.authors && A.parseNames(st.authors).length >= 3) ? 'Three or more authors: notes give the first author and et al.'
      : '';
    var ul = $('checks'); ul.textContent = '';
    var cs = A.checks(st, opts);
    cs.forEach(function (x) {
      var li = document.createElement('li'), tag = document.createElement('span'), msg = document.createElement('span');
      tag.className = 'tag ' + x.level; tag.textContent = x.level; msg.textContent = x.msg;
      li.appendChild(tag); li.appendChild(msg); ul.appendChild(li);
    });
    $('allclear').hidden = !ref || cs.some(function (x) { return x.level !== 'note'; });
    $('addBtn').textContent = editingId ? 'Update in my list' : same ? 'Already in my list' : 'Add to my list';
    if (same) $('addBtn').disabled = true;
    renderSaved();
    store(K_DRAFT, { st: st, sample: usingSample });
  }
  // Sources with a bibliography entry first, in bibliography order; notes-only sources after.
  function listOrder() {
    var r = lastRender, order = r ? r.order.filter(function (id) { return id !== '__current'; }) : [];
    saved.forEach(function (x) { if (order.indexOf(x.id) === -1) order.push(x.id); });
    return order;
  }
  function renderSaved() {
    var r = lastRender, ul = $('saved');
    ul.textContent = '';
    listOrder().forEach(function (id) {
      var item = saved.filter(function (x) { return x.id === id; })[0]; if (!item) return;
      var li = document.createElement('li'), box = document.createElement('input'), txt = document.createElement('span'), row = document.createElement('div');
      box.type = 'checkbox'; box.checked = !!picked[id]; box.setAttribute('aria-label', 'Tick to cite together');
      box.addEventListener('change', function () { picked[id] = box.checked; paintGroup(); });
      txt.className = 'txt';
      var rf = r && r.refs[id];
      if (rf && rf.bib) txt.innerHTML = rf.bib.html;
      else if (rf) { txt.innerHTML = r.note(id, {}).full; var tg = document.createElement('span'); tg.className = 'tagline'; tg.textContent = 'Notes only: not in the bibliography'; txt.appendChild(tg); }
      else txt.textContent = item.id === editingId ? '(open in the form)' : '(empty source)';
      row.className = 'actions';
      [['Edit', function () { editingId = id; usingSample = false; write(item.st); dress(); render(); $('authors').focus(); }],
       ['Remove', function () { saved = saved.filter(function (x) { return x.id !== id; }); delete picked[id]; if (editingId === id) editingId = null; store(K_LIST, saved); render(); }]
      ].forEach(function (a) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn quiet small'; b.textContent = a[0]; b.addEventListener('click', a[1]); row.appendChild(b); });
      li.appendChild(box); li.appendChild(txt); li.appendChild(row); ul.appendChild(li);
    });
    $('savedCount').textContent = saved.length ? '(' + saved.length + ')' : '';
    $('savedEmpty').hidden = saved.length > 0;
    $('savedTools').hidden = saved.length === 0;
    $('saveFile').disabled = saved.length === 0;
    paintGroup();
  }
  function paintGroup() {
    var ids = listOrder().filter(function (id) { return picked[id] && saved.some(function (x) { return x.id === id; }); });
    $('group').innerHTML = ids.length >= 2 && lastRender ? lastRender.group(ids) : '<span class="hint">Tick two or more sources.</span>';
    $('copyGroup').disabled = ids.length < 2;
  }
  function bibEntries() {
    var r = lastRender; if (!r) return [];
    return r.order.filter(function (id) { return id !== '__current' && saved.some(function (x) { return x.id === id; }); }).map(function (id) { return r.refs[id].bib; });
  }

  // ------------------------------------------------------------------ clipboard
  function byHand(text) { var b = $('fallbackBox'); b.hidden = false; b.value = text; b.focus(); b.select(); setStatus('The clipboard is blocked here. The text is selected below: press Ctrl+C or Cmd+C.', true); }
  function copyText(text, ok) { $('fallbackBox').hidden = true; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { setStatus(ok); }, function () { byHand(text); }); else byHand(text); }
  function copyRich(html, text, ok) {
    $('fallbackBox').hidden = true;
    try {
      if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob(['<span>' + html + '</span>'], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]).then(function () { setStatus(ok); }, function () { copyText(text, ok); });
        return;
      }
    } catch (e) {}
    copyText(text, ok);
  }

  // ------------------------------------------------------------------ files
  var inViewer = !!(window.claude && typeof window.claude.use === 'function'), dl = Promise.resolve(null);
  if (inViewer) { try { dl = Promise.resolve(window.claude.use('downloads')).catch(function () { return null; }); } catch (e) {} }
  function fileSay(msg, bad) { var s = $('fileMsg'); s.textContent = msg; s.className = 'filemsg' + (bad ? ' bad' : ''); }
  function giveFile(name, data, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    if (inViewer) return dl.then(function (d) { return d ? d.save({ filename: name, data: blob }).then(function () { return true; }, function () { return false; }) : false; });
    try { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); return Promise.resolve(true); }
    catch (e) { return Promise.resolve(false); }
  }
  function saveListFile() {
    var notes = {}; if (lastRender) saved.forEach(function (x) { var n = lastRender.refs[x.id] && lastRender.note(x.id, {}); if (n) notes[x.id] = n.fullText; });
    giveFile('chicago-source-list.json', A.listFile('', saved, notes), 'application/json').then(function (ok) { fileSay(ok ? 'Saved chicago-source-list.json.' + (inViewer ? '' : ' Look in your downloads folder.') : 'The file could not be saved from this view.', !ok); });
  }
  function openListFile(text, name) {
    var res = A.parseListFile(text);
    if (res.error) { fileSay(res.error, true); return; }
    var have = {}, added = 0; saved.forEach(function (x) { have[x.id] = 1; });
    res.items.forEach(function (x) { if (!have[x.id]) { saved.push(x); added++; } });
    store(K_LIST, saved); render();
    fileSay('Opened ' + name + ': ' + added + ' source' + (added === 1 ? '' : 's') + ' added' + (added < res.items.length ? ', ' + (res.items.length - added) + ' already in your list' : '') + '.');
  }

  // ------------------------------------------------------------------ build and wire
  (function () {
    var box = $('types');
    Object.keys(A.TYPES).forEach(function (k) {
      var lab = document.createElement('label'); lab.className = 'chip';
      var inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'type'; inp.value = k; inp.id = 'type-' + k;
      var sp = document.createElement('span'); sp.textContent = A.TYPES[k].label;
      lab.appendChild(inp); lab.appendChild(sp); box.appendChild(lab);
      inp.addEventListener('change', function () { if (usingSample) write(sample(k)); dress(); render(); });
    });
  })();
  var pending = null;   // typing redraws at most every 60 ms, which keeps long lists smooth
  $('f').addEventListener('input', function (e) { if (e.target.name !== 'type' && A.TEXT_KEYS.indexOf(e.target.id) !== -1) usingSample = false; clearTimeout(pending); pending = setTimeout(render, 60); });
  $('f').addEventListener('change', function (e) { if (e.target.name !== 'type') render(); });
  $('f').addEventListener('submit', function (e) { e.preventDefault(); });
  ['date', 'origDate'].forEach(function (k) { $(k).addEventListener('blur', function () { var t = A.dateText($(k).value), p = A.parseDate($(k).value); if (p && p.level !== 'raw' && p.level !== 'range' && t) { $(k).value = t; render(); } }); });
  $('todayBtn').addEventListener('click', function () { var d = new Date(); $('accessed').value = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); usingSample = false; render(); });
  $('clearBtn').addEventListener('click', function () { usingSample = false; editingId = null; write(blank(currentType())); dress(); render(); ($('authors').offsetParent ? $('authors') : $('title')).focus(); });
  $('sampleBtn').addEventListener('click', function () { usingSample = true; editingId = null; write(sample(currentType())); dress(); render(); });
  $('copyFull').addEventListener('click', function () { var n = lastRender.note(currentId, noteOpts()); copyRich(n.full, n.fullText, 'Full note copied.'); });
  $('copyShort').addEventListener('click', function () { var n = lastRender.note(currentId, noteOpts()); copyRich(n.short, n.shortText, 'Shortened note copied.'); });
  $('copyRef').addEventListener('click', function () { var b = lastRender.refs[currentId].bib; copyRich(b.html, b.text, 'Bibliography entry copied with italics.'); });
  $('copyRefPlain').addEventListener('click', function () { copyText(lastRender.refs[currentId].bib.text, 'Bibliography entry copied as plain text.'); });
  $('addBtn').addEventListener('click', function () {
    var st = read();
    if (editingId) { saved.forEach(function (x) { if (x.id === editingId) x.st = st; }); editingId = null; setStatus('Updated in your list.'); }
    else { saved.push({ id: 'src-' + Date.now() + '-' + Math.floor(Math.random() * 1e6), st: st }); setStatus('Added to your list.'); }
    store(K_LIST, saved); render();
  });
  $('copyList').addEventListener('click', function () { var b = bibEntries(); copyRich(b.map(function (r) { return '<p>' + r.html + '</p>'; }).join(''), b.map(function (r) { return r.text; }).join('\n'), 'Bibliography copied, ' + b.length + ' entr' + (b.length === 1 ? 'y' : 'ies') + ' in Chicago order.'); });
  $('copyGroup').addEventListener('click', function () { var h = $('group').innerHTML; copyRich(h, A.stripTags(h), 'Note copied.'); });
  $('expDocx').addEventListener('click', function () { var b = bibEntries(); giveFile('bibliography.docx', new Blob([A.docxBytes(b.map(function (r) { return r.html; }))], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).then(function (ok) { fileSay(ok ? 'Exported bibliography.docx.' : 'The file could not be saved from this view.', !ok); }); });
  $('expMd').addEventListener('click', function () { var b = bibEntries(); giveFile('bibliography.md', A.mdText('', b.map(function (r) { return r.md; })), 'text/markdown').then(function (ok) { fileSay(ok ? 'Exported bibliography.md.' : 'The file could not be saved from this view.', !ok); }); });
  var clearArmed = false;
  $('clearList').addEventListener('click', function () {
    var b = $('clearList');
    if (!clearArmed) { clearArmed = true; b.textContent = 'Click again to empty the list'; setTimeout(function () { clearArmed = false; b.textContent = 'Empty the list'; }, 4000); return; }
    clearArmed = false; b.textContent = 'Empty the list'; saved = []; picked = {}; editingId = null; store(K_LIST, saved); render();
  });
  $('saveFile').addEventListener('click', saveListFile);
  $('openFile').addEventListener('click', function () { $('pickFile').click(); });
  $('pickFile').addEventListener('change', function () { var f = $('pickFile').files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { $('pickFile').value = ''; openListFile(String(rd.result), f.name); }; rd.readAsText(f); });

  // theme
  ['themeAuto', 'themeLight', 'themeDark'].forEach(function (id) {
    $(id).addEventListener('change', function () { var v = $(id).value; store(K_THEME, v); if (v === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', v); });
  });

  // tips
  var tipBox = document.createElement('div'), tipFor = null, tipPinned = false;
  tipBox.className = 'tipbox'; tipBox.id = 'tipBox'; tipBox.setAttribute('role', 'tooltip'); tipBox.hidden = true;
  document.body.appendChild(tipBox);
  TIPS.forEach(function (t) {
    var el = document.querySelector(t[0]); if (!el) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'tip'; b.textContent = '?'; b.tabIndex = -1; b.dataset.tip = t[1];
    b.setAttribute('aria-label', 'About ' + el.textContent.trim().replace(/\s*\(\d+\)$/, '')); b.setAttribute('aria-expanded', 'false');
    if (el.tagName === 'H2') { el.appendChild(b); return; }
    var row = document.createElement(el.parentNode.classList.contains('eyebrow') ? 'span' : 'div'); row.className = 'labrow';
    el.parentNode.insertBefore(row, el); row.appendChild(el); row.appendChild(b);
  });
  function placeTip() {
    if (!tipFor) return;
    var r = tipFor.getBoundingClientRect(), w = tipBox.offsetWidth, h = tipBox.offsetHeight, vw = document.documentElement.clientWidth;
    if (r.bottom < 0 || r.top > innerHeight) { hideTip(); return; }
    var top = r.top - h - 8; if (top < 8) top = r.bottom + 8;
    tipBox.style.left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, vw - w - 12)) + 'px'; tipBox.style.top = top + 'px';
  }
  function showTip(b, pin) { if (tipFor && tipFor !== b) hideTip(); tipBox.textContent = b.dataset.tip; tipBox.hidden = false; tipFor = b; tipPinned = !!pin; b.setAttribute('aria-expanded', 'true'); b.setAttribute('aria-describedby', 'tipBox'); placeTip(); }
  function hideTip() { if (!tipFor) return; tipFor.setAttribute('aria-expanded', 'false'); tipFor.removeAttribute('aria-describedby'); tipFor = null; tipPinned = false; tipBox.hidden = true; }
  function tipOf(e) { return e.target && e.target.closest ? e.target.closest('.tip') : null; }
  document.addEventListener('mouseover', function (e) { var b = tipOf(e); if (b && tipFor !== b) showTip(b, false); });
  document.addEventListener('mouseout', function (e) { var b = tipOf(e); if (b && tipFor === b && !tipPinned) hideTip(); });
  document.addEventListener('click', function (e) { var b = tipOf(e); if (!b) { hideTip(); return; } e.preventDefault(); if (tipFor === b && tipPinned) hideTip(); else showTip(b, true); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('scroll', placeTip, true); window.addEventListener('resize', placeTip);

  // boot
  var th = load(K_THEME); if (th === 'light' || th === 'dark') $(th === 'light' ? 'themeLight' : 'themeDark').checked = true;
  var list = load(K_LIST); if (Array.isArray(list)) saved = list.filter(function (x) { return x && x.st && A.TYPES[x.st.type]; });
  var draft = load(K_DRAFT);
  if (draft && draft.st && A.TYPES[draft.st.type]) { usingSample = !!draft.sample; write(draft.st); } else { usingSample = true; write(sample('book')); }
  dress(); render();
})();
