"""Rebuild index.html from the files in src/.

    python3 src/build.py

Needs Python 3. If Node's terser is available (npx terser), citeproc-js is minified
first; otherwise it is embedded as is and the page is simply larger.
"""
import json, pathlib, re, shutil, subprocess, tempfile

SRC = pathlib.Path(__file__).resolve().parent
ROOT = SRC.parent
V = SRC / 'vendor'

page = (SRC / 'page.html').read_text(encoding='utf-8')
cite = (V / 'citeproc.js').read_text(encoding='utf-8')
if shutil.which('npx'):
    with tempfile.TemporaryDirectory() as d:
        out = pathlib.Path(d) / 'c.min.js'
        r = subprocess.run(['npx', '--yes', 'terser@5', str(V / 'citeproc.js'), '-c', '-m', '--comments', '/Copyright|AGPL|CPAL|license/i', '-o', str(out)], capture_output=True, text=True)
        if r.returncode == 0:
            cite = out.read_text(encoding='utf-8')
            print('citeproc-js minified')
        else:
            print('terser failed; embedding citeproc-js unminified')
style = (V / 'chicago-notes-bibliography.csl').read_text(encoding='utf-8')
locale = (V / 'locales-en-US.xml').read_text(encoding='utf-8')
core = (SRC / 'core.js').read_text(encoding='utf-8')
ui = (SRC / 'ui.js').read_text(encoding='utf-8')


def js_str(s):
    return json.dumps(s, ensure_ascii=False).replace('</', '<\\/').replace('<!--', '<\\!--')


lic = cite[:cite.index('*/') + 2]
engine = (lic + '\n// citeproc-js, full source in src/vendor/citeproc.js and at https://github.com/Juris-M/citeproc-js\n'
          'var CSL = (function () { var module = { exports: {} };\n' + cite[len(lic):] + '\nreturn module.exports; })();')
data = ('// CSL style: Chicago Manual of Style 18th edition, notes and bibliography (citation-style-language/styles, chicago-notes-bibliography.csl), CC BY-SA 3.0.\n'
        'window.CMS_STYLE = ' + js_str(style) + ';\n'
        '// CSL locale: en-US (citation-style-language/locales), CC BY-SA 3.0.\n'
        'window.CMS_LOCALE = ' + js_str(locale) + ';')
for name, val in [('CITEPROC', engine), ('CORE', core), ('UI', ui)]:
    assert page.count('/*' + name + '*/') == 1, name
    assert '</script' not in val.lower(), name + ' contains a closing script tag'
    page = page.replace('/*' + name + '*/', val)
page = re.sub(r'<script type="application/xml" id="style-csl">/\*STYLE\*/</script>\n<script type="application/xml" id="locale-en-US">/\*LOCALE\*/</script>',
              lambda m: '<script id="styledata">' + data + '</script>', page)
assert 'id="styledata"' in page
(ROOT / 'index.html').write_text(page, encoding='utf-8')
print('index.html written,', len(page.encode('utf-8')), 'bytes')
