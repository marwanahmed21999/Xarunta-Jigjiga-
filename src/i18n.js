// Gemeinsamer 4-Sprachen-Umschalter (Somali/Englisch/Amharisch/Deutsch)
// Nutzt dasselbe Muster wie die restlichen Seiten: .so/.en/.am/.de Klassen + body.lang-xx

export function initLangSwitcher() {
  window.setLang = function (l, btn) {
    document.body.className = l === 'so' ? '' : 'lang-' + l;
    document.querySelectorAll('.lb').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on');
    document.documentElement.lang = l;
    localStorage.setItem('jl', l);
  };

  const s = localStorage.getItem('jl');
  if (s && s !== 'so') {
    const b = document.getElementById('btn-' + s);
    if (b) window.setLang(s, b);
  } else {
    document.body.className = '';
    document.documentElement.lang = 'so';
    const b = document.getElementById('btn-so');
    if (b) { document.querySelectorAll('.lb').forEach(x => x.classList.remove('on')); b.classList.add('on'); }
  }
}

export function currentLang() {
  return localStorage.getItem('jl') || 'so';
}

export function t(dict) {
  return dict[currentLang()] || dict.so || dict.de || '';
}
