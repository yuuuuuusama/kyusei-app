// detail-nav.js
// 詳細鑑定 31項目の分類タブ + 検索。
// カードの表示/非表示だけを担い、中身の描画には一切触れない。

(function () {
  'use strict';

  const LS_KEY = 'kyusei.detailCat';

  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('detail-nav');
    if (!nav) return;

    const cards  = Array.from(document.querySelectorAll('details.detail-card[data-cat]'));
    const groups = Array.from(document.querySelectorAll('section.cat-group'));
    const chips  = Array.from(nav.querySelectorAll('.dn-chip'));
    const qInput = document.getElementById('dn-q');
    const qClear = document.getElementById('dn-clear');
    const countEl = document.getElementById('dn-count');
    const emptyEl = document.getElementById('dn-empty');
    const btnOpen  = document.getElementById('dn-open');
    const btnClose = document.getElementById('dn-close');

    if (!cards.length) return;

    // ── 検索用インデックス (見出し + hint + data-kw) ──
    const index = new Map();
    cards.forEach(card => {
      const sum = card.querySelector('summary');
      const text = [
        sum ? sum.textContent : '',
        card.getAttribute('data-kw') || ''
      ].join(' ');
      index.set(card, normalize(text));
    });

    // カタカナ→ひらがな、全角英数→半角、小文字化。
    // 「ホウイ」「ほうい」「HOUI」のどれで打っても当たるようにする。
    function normalize(s) {
      return String(s)
        .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
        .toLowerCase()
        .replace(/[\s　]+/g, '');
    }

    let activeCat = 'all';
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved && chips.some(c => c.dataset.cat === saved)) activeCat = saved;
    } catch (e) { /* プライベートブラウズ等では無視 */ }

    // ── 各分類の件数をチップに表示 ──
    chips.forEach(chip => {
      const cat = chip.dataset.cat;
      const n = cat === 'all' ? cards.length : cards.filter(c => c.dataset.cat === cat).length;
      const badge = chip.querySelector('.dn-n');
      if (badge) badge.textContent = n;
    });

    function apply() {
      const q = normalize(qInput ? qInput.value : '');
      const searching = q.length > 0;

      // 検索中は分類をまたいで探す (打った言葉がどこにあっても見つかるように)
      const cat = searching ? 'all' : activeCat;

      let shown = 0;
      const hits = [];
      cards.forEach(card => {
        const catOk = (cat === 'all') || (card.dataset.cat === cat);
        const qOk = !searching || index.get(card).includes(q);
        const visible = catOk && qOk;
        card.classList.toggle('is-hidden', !visible);
        if (visible) { shown++; hits.push(card); }
      });

      // 中身が全部消えた分類見出しは畳む
      groups.forEach(g => {
        const any = Array.from(g.querySelectorAll('details.detail-card'))
          .some(c => !c.classList.contains('is-hidden'));
        g.classList.toggle('is-hidden', !any);
      });

      // 絞り込んだ結果が少数なら開いて中身まで見せる
      if (searching && hits.length && hits.length <= 5) {
        hits.forEach(c => { c.open = true; });
      }

      chips.forEach(c => c.classList.toggle('is-on', c.dataset.cat === cat));
      if (qClear) qClear.hidden = !searching;
      if (emptyEl) emptyEl.hidden = shown > 0;
      if (countEl) {
        countEl.textContent = (shown === cards.length)
          ? `全${cards.length}項目`
          : `${shown} / ${cards.length}項目`;
      }
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        activeCat = chip.dataset.cat;
        try { localStorage.setItem(LS_KEY, activeCat); } catch (e) { /* 無視 */ }
        if (qInput && qInput.value) qInput.value = '';   // 分類を選び直したら検索は解除
        apply();
        // 選んだ分類の先頭が画面に来るようにする
        const first = document.querySelector('section.cat-group:not(.is-hidden)');
        if (first && activeCat !== 'all') {
          const top = first.getBoundingClientRect().top + window.scrollY - navHeight() - 8;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });

    // スティッキーなタブ帯の高さ (スクロール位置の補正用)
    function navHeight() {
      const header = document.querySelector('.app-header');
      return (header ? header.offsetHeight : 0) + nav.offsetHeight;
    }

    // 帯をヘッダーの真下に貼り付けるため、ヘッダーの実測高さを CSS へ渡す
    function syncHeaderHeight() {
      const header = document.querySelector('.app-header');
      if (!header) return;
      document.documentElement.style.setProperty('--h-app-header', header.offsetHeight + 'px');
    }
    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight);
    window.addEventListener('orientationchange', syncHeaderHeight);

    if (qInput) {
      qInput.addEventListener('input', apply);
      qInput.addEventListener('search', apply);   // iOS Safari の ✕ ボタン
    }
    if (qClear) {
      qClear.addEventListener('click', () => {
        qInput.value = '';
        apply();
        qInput.focus();
      });
    }
    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        cards.filter(c => !c.classList.contains('is-hidden')).forEach(c => { c.open = true; });
      });
    }
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        cards.filter(c => !c.classList.contains('is-hidden')).forEach(c => { c.open = false; });
      });
    }

    apply();
  });
})();
