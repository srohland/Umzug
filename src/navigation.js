import { state } from './state.js';
import { killScanner } from './views/scanner.js';
import { renderList } from './views/list.js';
import { renderDetail } from './views/detail.js';
import { renderBoxForm } from './views/boxForm.js';
import { renderItemForm } from './views/itemForm.js';
import { renderScanner } from './views/scanner.js';
import { renderSearch } from './views/search.js';
import { renderSettings } from './views/settings.js';

export function navigate(v, opts = {}) {
  killScanner();
  state.view = v;
  if (opts.boxId !== undefined) state.selBox = opts.boxId;
  if (opts.itemId !== undefined) state.selItem = opts.itemId;
  if (v === 'new-box') state.tempBox = null;
  if (v === 'new-item') state.tempItem = null;
  render();
}

export function goBack() {
  killScanner();
  if (state.view === 'detail') navigate('list');
  else if (state.view === 'edit-box' || state.view === 'new-box') {
    state.tempBox = null;
    state.selBox ? navigate('detail', { boxId: state.selBox }) : navigate('list');
  } else if (state.view === 'edit-item' || state.view === 'new-item') {
    state.tempItem = null;
    navigate('detail', { boxId: state.selBox });
  } else navigate('list');
}

export function render() {
  const back = document.getElementById('back-btn');
  ['list', 'search', 'scan', 'settings'].forEach(n => {
    document.getElementById('nb-' + n)?.classList.toggle('on',
      n === 'list'
        ? ['list', 'detail', 'edit-box', 'new-box', 'edit-item', 'new-item'].includes(state.view)
        : state.view === n);
  });
  const hasBack = ['detail', 'edit-box', 'new-box', 'edit-item', 'new-item'].includes(state.view);
  back.style.display = hasBack ? 'flex' : 'none';

  const views = {
    list: renderList,
    detail: renderDetail,
    'edit-box': () => renderBoxForm(false),
    'new-box': () => renderBoxForm(true),
    'edit-item': () => renderItemForm(false),
    'new-item': () => renderItemForm(true),
    scan: renderScanner,
    search: renderSearch,
    settings: renderSettings,
  };
  (views[state.view] || renderList)();
}
