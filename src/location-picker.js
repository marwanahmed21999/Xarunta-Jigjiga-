// Wiederverwendbare Gobolka -> Degmo -> Magaalo -> Kebele Auswahl
import { supabase } from './supabase-config.js';

async function loadZones(zoneSel) {
  const { data, error } = await supabase.from('locations').select('id,name').eq('level', 'zone').order('name');
  if (error || !data) { zoneSel.innerHTML = '<option value="">Fehler beim Laden</option>'; return; }
  zoneSel.innerHTML = '<option value="">-- Zone wählen --</option>' + data.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
}

async function loadChildren(parentId, level) {
  const { data, error } = await supabase.from('locations').select('id,name').eq('level', level).eq('parent_id', parentId).order('name');
  if (error) return [];
  return data || [];
}

function resetSelect(sel, placeholder) {
  sel.innerHTML = '<option value="">' + placeholder + '</option>';
  sel.disabled = true;
}

/**
 * zoneSel, woredaSel, citySel: <select> elements (empty at start, will be filled)
 * kebeleWrap: a container element whose innerHTML will be replaced with either
 *             a <select> (real kebele list) or a <input type=text> (fallback)
 * kebeleFieldId: the id to give that inner select/input
 * kebeleLabelHtml: optional label markup to keep inside kebeleWrap (e.g. '<label>Kebele *</label>')
 */
export function wireLocationCascade({ zoneSel, woredaSel, citySel, kebeleWrap, kebeleFieldId, kebeleLabelHtml = '' }) {
  function resetKebele() {
    kebeleWrap.innerHTML = kebeleLabelHtml + `<select id="${kebeleFieldId}" disabled><option value="">-- zuerst Stadt wählen --</option></select>`;
  }

  loadZones(zoneSel);
  resetKebele();

  zoneSel.addEventListener('change', async (e) => {
    resetSelect(woredaSel, '-- zuerst Zone wählen --');
    resetSelect(citySel, '-- zuerst Woreda wählen --');
    resetKebele();
    if (!e.target.value) return;
    const data = await loadChildren(e.target.value, 'woreda');
    woredaSel.innerHTML = '<option value="">-- Woreda wählen --</option>' + data.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    woredaSel.disabled = false;
  });

  woredaSel.addEventListener('change', async (e) => {
    resetSelect(citySel, '-- zuerst Woreda wählen --');
    resetKebele();
    if (!e.target.value) return;
    const data = await loadChildren(e.target.value, 'city');
    citySel.innerHTML = '<option value="">-- Stadt wählen --</option>' + data.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    citySel.disabled = false;
  });

  citySel.addEventListener('change', async (e) => {
    resetKebele();
    if (!e.target.value) return;
    const data = await loadChildren(e.target.value, 'kebele');
    if (data.length > 0) {
      kebeleWrap.innerHTML = kebeleLabelHtml + `<select id="${kebeleFieldId}"><option value="">-- Kebele wählen --</option>` + data.map(l => `<option value="${l.name}">${l.name}</option>`).join('') + '</select>';
    } else {
      kebeleWrap.innerHTML = kebeleLabelHtml + `<input type="text" id="${kebeleFieldId}" placeholder="Kebele-Nummer/Name eintragen">`;
    }
  });
}

export function readLocation({ zoneSel, woredaSel, citySel, kebeleFieldId }) {
  const kebeleEl = document.getElementById(kebeleFieldId);
  const zoneName = zoneSel.selectedOptions[0] ? zoneSel.selectedOptions[0].textContent : '';
  const woredaName = woredaSel.selectedOptions[0] ? woredaSel.selectedOptions[0].textContent : '';
  const cityName = citySel.selectedOptions[0] ? citySel.selectedOptions[0].textContent : '';
  const kebeleName = kebeleEl ? (kebeleEl.tagName === 'SELECT' ? (kebeleEl.selectedOptions[0] ? kebeleEl.selectedOptions[0].textContent : '') : kebeleEl.value.trim()) : '';
  const complete = !!(zoneSel.value && woredaSel.value && citySel.value && kebeleName);
  const full = [zoneName, woredaName, cityName, kebeleName].filter(Boolean).join(' / ');
  return { zoneName, woredaName, cityName, kebeleName, complete, full };
}
