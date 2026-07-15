/**
 * Custom dropdown — progressively enhances native <select> elements into
 * theme-styled dropdowns so the opened option list can match each style.
 *
 * The underlying <select> stays in the DOM (hidden) so existing code that
 * reads `.value`, mutates its options, or listens for `change` keeps
 * working unchanged.
 */

function upgradeSelect(select) {
  if (select.dataset.dropdown === 'upgraded') return;
  select.dataset.dropdown = 'upgraded';
  select.hidden = true;

  const wrap = document.createElement('div');
  wrap.className = 'dropdown';
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dropdown-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');

  const label = document.createElement('span');
  label.className = 'dropdown-label';
  const caret = document.createElement('span');
  caret.className = 'dropdown-caret';
  btn.appendChild(label);
  btn.appendChild(caret);
  wrap.appendChild(btn);

  const list = document.createElement('div');
  list.className = 'dropdown-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  wrap.appendChild(list);

  const currentText = () => {
    const opt = select.selectedOptions[0];
    return opt ? opt.textContent : '';
  };

  const syncLabel = () => {
    label.textContent = currentText();
  };

  const buildItems = () => {
    list.innerHTML = '';
    const selected = select.value;
    for (const opt of select.options) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'dropdown-item';
      item.setAttribute('role', 'option');
      item.dataset.value = opt.value;
      item.textContent = opt.textContent;
      if (opt.value === selected) item.classList.add('is-selected');
      if (opt.disabled) {
        item.disabled = true;
        item.classList.add('is-disabled');
      }
      item.addEventListener('click', () => choose(opt.value));
      list.appendChild(item);
    }
  };

  const choose = (value) => {
    select.value = value;
    syncLabel();
    buildItems();
    close();
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const open = () => {
    list.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
    document.addEventListener('click', onDocClick, true);
  };

  const close = () => {
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('is-open');
    document.removeEventListener('click', onDocClick, true);
  };

  const toggle = () => {
    if (btn.classList.contains('is-open')) close();
    else open();
  };

  const onDocClick = (e) => {
    if (!wrap.contains(e.target)) close();
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // Rebuild when the underlying <select> options change (e.g. the MIDI
  // device list being repopulated) and keep the label in sync.
  new MutationObserver(() => {
    buildItems();
    syncLabel();
  }).observe(select, { childList: true, subtree: true });

  buildItems();
  syncLabel();
}

function init() {
  document.querySelectorAll('select').forEach(upgradeSelect);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
