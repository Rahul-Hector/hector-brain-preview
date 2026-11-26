/* Hector Brain behaviour, shared by every screen: panel ⇄ dock (⌘.), chats accordion, popovers, radios and switches,
   reasoning fold, sheet drawer, search (⌘K), tabs and filters, chat selection, chart tooltip, toast. */
(function () {
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // ---------- Panel ⇄ dock
  if (store('hm-d-collapsed') === '1') root.classList.add('collapsed');
  function setCollapsed(c) {
    root.classList.toggle('collapsed', c);
    var b = $('#collapse');
    b.setAttribute('aria-label', c ? 'Expand menu (⌘.)' : 'Collapse menu (⌘.)');
    b.setAttribute('aria-expanded', String(!c));
    store('hm-d-collapsed', c ? '1' : '0');
  }
  $('#collapse').addEventListener('click', function () { setCollapsed(!root.classList.contains('collapsed')); });
  setCollapsed(root.classList.contains('collapsed'));

  // ---------- Chats accordion
  var acc = $('.acc'), list = $('#chatlist');
  function setAcc(open) { acc.setAttribute('aria-expanded', String(open)); list.hidden = !open; store('hm-d-chats', open ? '1' : '0'); }
  if (store('hm-d-chats') === '0') setAcc(false);
  acc.addEventListener('click', function () { setAcc(acc.getAttribute('aria-expanded') !== 'true'); });

  // ---------- Toast
  var tt; window.HM = { toast: function (msg) {
    var el = $('#toast'); if (!el) return; el.textContent = msg; el.classList.add('show');
    clearTimeout(tt); tt = setTimeout(function () { el.classList.remove('show'); }, 1900);
  } };

  // ---------- Popovers: [data-pop="id"]; data-side = below (default) | up | right | left
  function closeAll() {
    $$('.pop.open').forEach(function (p) { p.classList.remove('open'); });
    $$('[data-pop][aria-expanded="true"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  }
  function openPop(b) {
    var p = document.getElementById(b.dataset.pop), r = b.getBoundingClientRect(), side = b.dataset.side;
    p.style.top = p.style.bottom = p.style.left = p.style.right = '';
    if (side === 'right') { p.style.left = r.right + 12 + 'px'; p.style.bottom = Math.max(12, innerHeight - r.bottom) + 'px'; }
    else if (side === 'up') { p.style.left = r.left + 'px'; p.style.bottom = innerHeight - r.top + 8 + 'px'; }
    else if (side === 'left-up') { p.style.right = innerWidth - r.right + 'px'; p.style.bottom = innerHeight - r.top + 8 + 'px'; }
    else if (side === 'left') { p.style.right = innerWidth - r.right + 'px'; p.style.top = r.bottom + 8 + 'px'; }
    else { p.style.left = r.left + 'px'; p.style.top = r.bottom + 8 + 'px'; }
    p.classList.add('open'); b.setAttribute('aria-expanded', 'true');
  }

  // ---------- Overlays: sheet drawer and search
  var scrim = $('#scrim'), openLayer = null;
  function showLayer(el) {
    closeAll(); openLayer = el; scrim.hidden = false; el.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add('open'); el.classList.add('open'); });
    var f = $('input', el) || $('button', el); if (f) f.focus({ preventScroll: true });
  }
  function hideLayer() {
    if (!openLayer) return; var el = openLayer; openLayer = null;
    scrim.classList.remove('open'); el.classList.remove('open');
    setTimeout(function () { scrim.hidden = true; el.hidden = true; }, 220);
  }
  scrim.addEventListener('click', hideLayer);

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pop]');
    if (b) { e.preventDefault(); var was = b.getAttribute('aria-expanded') === 'true'; closeAll(); if (!was) openPop(b); return; }

    var radio = e.target.closest('[role="radio"]');
    if (radio) {
      var g = radio.closest('[role="radiogroup"]');
      $$('[role="radio"]', g).forEach(function (r) { r.setAttribute('aria-checked', String(r === radio)); });
      if (g.dataset.label) $$(g.dataset.label).forEach(function (l) { l.textContent = radio.dataset.value || $('b', radio).textContent; });
      if (radio.dataset.toast) HM.toast(radio.dataset.toast);
      if (g.dataset.filter) filterRows(g.dataset.filter, radio.dataset.f);
      if (g.closest('.pop')) setTimeout(closeAll, 120);
      return;
    }
    var sw = e.target.closest('[role="switch"]');
    if (sw) { var on = sw.getAttribute('aria-checked') !== 'true'; sw.setAttribute('aria-checked', String(on)); var lbl = $('.sw-t', sw); if (lbl) lbl.textContent = on ? 'On' : 'Off'; return; }

    var tg = e.target.closest('[data-toggle]');
    if (tg) { var t = document.getElementById(tg.dataset.toggle), open = t.hidden; t.hidden = !open; tg.setAttribute('aria-expanded', String(open)); return; }

    if (e.target.closest('[data-open="sheet"]')) { e.preventDefault(); showLayer($('#sheet')); return; }
    if (e.target.closest('[data-open="search"]')) { e.preventDefault(); showLayer($('#search')); return; }
    if (e.target.closest('[data-close]')) { hideLayer(); return; }

    var vote = e.target.closest('.vote');
    if (vote) { var was2 = vote.classList.contains('voted'); $$('.vote', vote.parentNode).forEach(function (v) { v.classList.remove('voted'); }); if (!was2) { vote.classList.add('voted'); HM.toast('Thanks, noted'); } return; }

    var tab = e.target.closest('.tabs [role="tab"]');
    if (tab) {
      var bar = tab.closest('.tabs');
      $$('[role="tab"]', bar).forEach(function (x) { x.setAttribute('aria-selected', String(x === tab)); });
      if (bar.dataset.panes) $$(bar.dataset.panes + ' .pane').forEach(function (p) { p.hidden = p.dataset.pane !== tab.dataset.pane; });
      if (bar.dataset.filter) filterRows(bar.dataset.filter, tab.dataset.f);
      return;
    }

    var row = e.target.closest('.selecting .rowi');
    if (row) { e.preventDefault(); row.classList.toggle('sel'); updateSel(); return; }

    if (!e.target.closest('.pop')) closeAll();
    var tst = e.target.closest('[data-toast]'); if (tst) { e.preventDefault(); HM.toast(tst.dataset.toast); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAll(); hideLayer(); }
    var mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === '.') { e.preventDefault(); setCollapsed(!root.classList.contains('collapsed')); }
    if (mod && e.key.toLowerCase() === 'k' && $('#search')) { e.preventDefault(); showLayer($('#search')); }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); location.href = 'start.html'; }
  });

  // ---------- Row filters (tabs) and text search on list pages
  function filterRows(scope, f) {
    $$(scope + ' .rowi').forEach(function (r) { r.hidden = f !== 'all' && r.dataset.state !== f; });
  }
  $$('[data-search]').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var q = inp.value.trim().toLowerCase(), shown = 0;
      $$(inp.dataset.search + ' .rowi').forEach(function (r) { var hit = !q || r.textContent.toLowerCase().indexOf(q) > -1; r.hidden = !hit; if (hit) shown++; });
      $$(inp.dataset.search + ' .month').forEach(function (m) { var n = m.nextElementSibling, any = false; while (n && !n.classList.contains('month')) { if (!n.hidden) any = true; n = n.nextElementSibling; } m.hidden = !any; });
      var em = $('#noResults'); if (em) em.hidden = shown > 0;
    });
  });

  // ---------- Chat selection (All chats)
  var selBtn = $('#selectBtn'), selbar = $('#selbar'), clist = $('#clist');
  function updateSel() { if (!clist) return; $('#selCount').textContent = $$('.rowi.sel', clist).length + ' selected'; }
  function setSelecting(on) {
    clist.classList.toggle('selecting', on); selbar.hidden = !on; selBtn.hidden = on;
    if (!on) $$('.rowi.sel', clist).forEach(function (r) { r.classList.remove('sel'); });
    updateSel();
  }
  if (selBtn) { selBtn.addEventListener('click', function () { setSelecting(true); }); $('#selCancel').addEventListener('click', function () { setSelecting(false); }); }

  // ---------- Chart tooltip
  $$('.bars').forEach(function (bars) {
    var tip = $('.tip', bars.parentNode);
    $$('i', bars).forEach(function (bar) {
      bar.addEventListener('mouseenter', function () {
        var pr = bars.parentNode.getBoundingClientRect(), br = bar.getBoundingClientRect();
        tip.innerHTML = '<b>' + bar.dataset.v + ' credits</b> · ' + bar.dataset.d;
        tip.style.left = br.left - pr.left + br.width / 2 + 'px'; tip.style.top = br.top - pr.top - 8 + 'px'; tip.classList.add('show');
      });
      bar.addEventListener('mouseleave', function () { tip.classList.remove('show'); });
    });
  });
  // ---------- "How's this chat going?" check-in: one tap, then it thanks and leaves
  var rate = $('#rate');
  function rateGone() { rate.classList.add('gone'); setTimeout(function () { rate.hidden = true; }, 320); }
  if (rate) rate.addEventListener('click', function (e) {
    var b = e.target.closest('[data-rate]');
    if (b) { rate.classList.add('done'); rate.innerHTML = '<span class="rate-q">Thanks, that helps Hector Brain get better.</span>'; setTimeout(rateGone, 1800); return; }
    if (e.target.closest('.rate-x')) rateGone();
  });
  // ---------- "/" in the message box lists methods (our Skills); type to filter, up/down + Enter to pick, Esc to close
  var slash = $('#pop-slash');
  if (slash) {
    var opts = $$('.opt', slash), none = $('.none', slash), box = null, act = -1;
    function token(t) { var m = /(^|\s)\/([\w-]*)$/.exec(t.value.slice(0, t.selectionStart)); return m ? m[2] : null; }
    function shown() { return opts.filter(function (o) { return !o.hidden; }); }
    function mark(i) { var v = shown(); opts.forEach(function (o) { o.classList.remove('active'); }); act = v.length ? (i + v.length) % v.length : -1; if (act > -1) { v[act].classList.add('active'); v[act].scrollIntoView({ block: 'nearest' }); } }
    function closeSlash() { slash.classList.remove('open'); box = null; }
    function openSlash(t, q) {
      box = t; opts.forEach(function (o) { o.hidden = !!q && o.dataset.slash.indexOf(q.toLowerCase()) === -1; });
      none.hidden = shown().length > 0;
      var r = t.closest('.tray').getBoundingClientRect(), below = !t.closest('.compose');
      slash.style.left = r.left + 'px'; slash.style.right = '';
      if (below) { slash.style.top = r.bottom + 8 + 'px'; slash.style.bottom = ''; } else { slash.style.bottom = innerHeight - r.top + 8 + 'px'; slash.style.top = ''; }
      slash.classList.add('open'); mark(0);
    }
    function pick(o) {
      var t = box, end = t.selectionStart, start = t.value.slice(0, end).lastIndexOf('/');
      t.value = t.value.slice(0, start) + '/' + o.dataset.slash + ' ' + t.value.slice(end);
      var c = start + o.dataset.slash.length + 2; t.setSelectionRange(c, c); t.focus(); closeSlash();
      HM.toast('Method /' + o.dataset.slash + ' will run with this message');
    }
    $$('.tray textarea').forEach(function (t) {
      t.addEventListener('input', function () { var q = token(t); if (q === null) closeSlash(); else openSlash(t, q); });
      t.addEventListener('keydown', function (e) {
        if (!slash.classList.contains('open') || box !== t) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); mark(act + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); mark(act - 1); }
        else if ((e.key === 'Enter' || e.key === 'Tab') && act > -1) { e.preventDefault(); pick(shown()[act]); }
        else if (e.key === 'Escape') { e.stopPropagation(); closeSlash(); }
      });
      t.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== t) closeSlash(); }, 150); });
    });
    slash.addEventListener('mousedown', function (e) { if (e.target.closest('.opt')) e.preventDefault(); });
    slash.addEventListener('click', function (e) { var o = e.target.closest('.opt'); if (o && box) pick(o); });
  }
  // =====================================================================
  // Patterns (handoff): toast with Undo, dialogs, rename in place, pin, move, delete.
  // Rules live in docs/INTERACTIONS.md.
  // =====================================================================
  var toastEl = $('#toast'), toastT;
  HM.toast = function (msg, undo) {
    if (!toastEl) return;
    toastEl.innerHTML = '';
    var span = document.createElement('span'); span.textContent = msg; toastEl.appendChild(span);
    toastEl.classList.toggle('has-act', !!undo);
    if (undo) {
      var b = document.createElement('button'); b.textContent = 'Undo';
      b.addEventListener('click', function () { undo(); toastEl.classList.remove('show'); });
      toastEl.appendChild(b);
    }
    toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, undo ? 5000 : 1900);
  };

  // Which row a ⋯ menu was opened from (sidebar row, list row, or the top ⋯ = the open chat)
  var actRow = null;
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pop="pop-chat"], [data-pop="pop-wsmore"]');
    if (b) actRow = b.dataset.pop === 'pop-wsmore' ? $('.ph h1') : (b.closest('.item, .rowi') || $('.recent .item.on') || null);
  }, true);
  function titleEl(row) { if (!row) return null; if (row.tagName === 'H1') return row; return row.classList.contains('rowi') ? $('.t b', row) : row.querySelector(':scope > span'); }

  function renameRow(row) {
    var el = titleEl(row); if (!el) { HM.toast('Rename'); return; }
    var old = el.textContent, inp = document.createElement('input'), done = false;
    inp.className = 'rn'; inp.value = old; inp.setAttribute('aria-label', 'New name');
    el.replaceWith(inp); inp.focus(); inp.select();
    function finish(save) {
      if (done) return; done = true;
      var v = inp.value.trim(); el.textContent = save && v ? v : old; inp.replaceWith(el);
      if (save && v && v !== old) HM.toast('Renamed', function () { el.textContent = old; });
    }
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
    });
    inp.addEventListener('blur', function () { finish(true); });
    inp.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
  }

  function pinRow(row) {
    if (!row || !row.parentNode) { HM.toast('Pinned'); return; }
    var parent = row.parentNode, next = row.nextSibling;
    parent.insertBefore(row, parent.firstElementChild);
    var ic = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ic.setAttribute('class', 'pin-ic');
    ic.innerHTML = '<use href="sprite.svg#i-pinned"/>'; row.insertBefore(ic, row.firstChild);
    HM.toast('Pinned to the top', function () { ic.remove(); parent.insertBefore(row, next); });
  }

  // Dialogs: [data-dialog="id"] opens; [data-close] or Esc closes; [data-do] confirms
  function openDialog(id, name) {
    var d = document.getElementById(id); if (!d) return;
    if (name) $$('.nm', d).forEach(function (n) { n.textContent = name; });
    $$('input:not([readonly]), textarea', d).forEach(function (f) { f.value = ''; });
    $$('[data-required]', d).forEach(function (f) { f.dispatchEvent(new Event('input')); });
    showLayer(d);
  }
  $$('.modal [data-required]').forEach(function (f) {
    f.addEventListener('input', function () { var go = $('.btn.primary', f.closest('.modal')); if (go) go.disabled = !f.value.trim(); });
    f.addEventListener('keydown', function (e) { if (e.key === 'Enter' && f.tagName === 'INPUT') { var go = $('.btn.primary', f.closest('.modal')); if (go && !go.disabled) go.click(); } });
  });

  document.addEventListener('click', function (e) {
    var dl = e.target.closest('[data-dialog]');
    if (dl) { e.preventDefault(); closeAll(); openDialog(dl.dataset.dialog, dl.dataset.name); return; }

    var a = e.target.closest('[data-act]');
    if (a) {
      e.preventDefault(); closeAll();
      var row = actRow, act = a.dataset.act;
      if (act === 'rename') renameRow(row);
      else if (act === 'pin') pinRow(row);
      else if (act === 'delete') { var t = titleEl(row); openDialog('dlg-delete', a.dataset.name || (t ? t.textContent : 'this chat')); }
      return;
    }

    var d = e.target.closest('[data-do]');
    if (d) {
      var what = d.dataset.do;
      if (what === 'delete') {
        hideLayer();
        var r = actRow;
        if (r && !r.classList.contains('on')) { r.hidden = true; HM.toast('Deleted', function () { r.hidden = false; }); }
        else HM.toast('Deleted. In the app this opens a new chat.');
      } else if (what === 'demo-undo') { HM.toast('Moved to MCP Demo', function () {}); } else if (what === 'create-ws') { hideLayer(); HM.toast('Workspace created'); }
      else if (what === 'create-method') { hideLayer(); HM.toast('Method saved. Type / to run it.'); }
      else if (what === 'copy-link') {
        var inp = $('.linkrow input', d.closest('.modal'));
        try { navigator.clipboard.writeText(inp.value).catch(function () {}); } catch (err) {}
        d.textContent = 'Copied'; setTimeout(function () { d.textContent = 'Copy link'; }, 1500);
      }
      return;
    }
  });

  // Move to workspace: a radio list; confirms with a toast you can undo
  var mv = $('#pop-move');
  if (mv) mv.addEventListener('click', function (e) {
    var o = e.target.closest('[role="radio"]'); if (!o) return;
    var name = $('b', o).textContent;
    setTimeout(function () { HM.toast('Moved to ' + name, function () {}); }, 140);
  });
})();
