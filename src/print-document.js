// Druckbare/PDF-fähige offizielle Bescheinigung – öffnet ein neues Fenster mit
// einem sauber formatierten Dokument und ruft automatisch den Druckdialog auf.
// Der Nutzer kann dort "Als PDF speichern" wählen (Browser-Standardfunktion).

export function printDocument({ title, subtitle, refLabel, refValue, fields, note }) {
  const win = window.open('', '_blank', 'width=800,height=1000');
  if (!win) { alert('Bitte Pop-ups für diese Seite erlauben, um das Dokument zu drucken.'); return; }

  const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const rows = fields.map(f => `<tr><td class="k">${esc(f.label)}</td><td class="v">${esc(f.value) || '—'}</td></tr>`).join('');

  win.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  body{font-family:'IBM Plex Sans',Arial,sans-serif;color:#0d1b3e;padding:48px;max-width:720px;margin:0 auto;background:#fff;}
  .flag{height:6px;display:flex;margin-bottom:28px;border-radius:3px;overflow:hidden;}
  .flag div{flex:1;} .g{background:#1a7a3c;} .w{background:#fff;border-top:1px solid #ddd;border-bottom:1px solid #ddd;} .r{background:#8b1a1a;}
  header{text-align:center;margin-bottom:26px;border-bottom:3px solid #c9963a;padding-bottom:18px;}
  header .org{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#a9761f;font-weight:700;margin-bottom:6px;}
  header h1{font-family:Georgia,serif;font-size:1.4rem;margin:0 0 6px;}
  header p{color:#5a6880;font-size:.85rem;margin:0;}
  .ref{background:#0d2d6b;color:#fff;padding:14px 20px;border-radius:8px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:1.15rem;letter-spacing:.06em;margin-bottom:26px;}
  .ref span{display:block;font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin-bottom:4px;font-family:'IBM Plex Sans',sans-serif;}
  table{width:100%;border-collapse:collapse;margin-bottom:30px;}
  td{padding:11px 4px;border-bottom:1px solid #e4e4e4;font-size:.92rem;vertical-align:top;}
  td.k{color:#5a6880;width:42%;font-weight:600;}
  .stamp{margin-top:70px;display:flex;justify-content:space-between;gap:40px;}
  .stamp div{flex:1;text-align:center;border-top:1px solid #333;padding-top:8px;font-size:.72rem;color:#5a6880;}
  .note{margin-top:36px;font-size:.72rem;color:#8a94a6;text-align:center;line-height:1.6;}
  @media print{ body{padding:0;} }
</style>
</head>
<body>
  <div class="flag"><div class="g"></div><div class="w"></div><div class="r"></div></div>
  <header>
    <div class="org">Xarunta Deegaanka Soomaalida · Dawlad Deegaanka Soomaalida</div>
    <h1>${esc(title)}</h1>
    ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
  </header>
  <div class="ref"><span>${esc(refLabel)}</span>${esc(refValue)}</div>
  <table>${rows}</table>
  <div class="stamp">
    <div>Unterschrift</div>
    <div>Stempel / Datum</div>
  </div>
  <div class="note">${note ? esc(note) + '<br>' : ''}Ausgedruckt am ${new Date().toLocaleString('de-DE')} über Xarunta Deegaanka Soomaalida.<br>Dieses Dokument ist eine Bestätigung der digitalen Einreichung, kein Ersatz für eine notariell beglaubigte Urkunde.</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { try { win.print(); } catch (e) {} }, 350);
}
