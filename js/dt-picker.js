// dt-picker.js
// 年・月・日・時・分 のプルダウン式日時入力
// 既存の datetime-local 互換 (id="<target>" の hidden 入力に値を書き込む)

(function (global) {
  'use strict';

  const ERA = [
    { name: '令和', start: 2019, abbr: 'R' },
    { name: '平成', start: 1989, abbr: 'H' },
    { name: '昭和', start: 1926, abbr: 'S' },
    { name: '大正', start: 1912, abbr: 'T' },
    { name: '明治', start: 1868, abbr: 'M' }
  ];

  function toWareki(year) {
    for (const e of ERA) {
      if (year >= e.start) {
        const y = year - e.start + 1;
        return `${e.name}${y === 1 ? '元' : y}年`;
      }
    }
    return '';
  }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  // datetime-local 文字列 "YYYY-MM-DDTHH:MM" → 各要素
  function parseDtLocal(s) {
    if (!s) return null;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return null;
    return {
      y: +m[1], M: +m[2], d: +m[3], h: +m[4], mi: +m[5]
    };
  }

  function makeOption(value, label, selected) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    if (selected) o.selected = true;
    return o;
  }

  // 1つの .dt-picker をセットアップ
  function setup(container, options) {
    options = options || {};
    const targetId = container.dataset.target;

    // hidden input が無ければ作る
    let hidden = document.getElementById(targetId);
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = targetId;
      container.appendChild(hidden);
    }

    // 既存値を取得 (or デフォルト)
    let cur = parseDtLocal(hidden.value);
    if (!cur) {
      const def = options.defaultDate || new Date();
      cur = {
        y: def.getFullYear(),
        M: def.getMonth() + 1,
        d: def.getDate(),
        h: def.getHours(),
        mi: def.getMinutes()
      };
    }

    // 年: 範囲
    const minY = options.minYear || 1900;
    const maxY = options.maxYear || (new Date().getFullYear() + 5);

    const ySel = document.createElement('select'); ySel.className = 'y';
    const MSel = document.createElement('select'); MSel.className = 'M';
    const dSel = document.createElement('select'); dSel.className = 'd';
    const hSel = document.createElement('select'); hSel.className = 'h';
    const miSel = document.createElement('select'); miSel.className = 'mi';

    // 年: 新しい年が上に
    for (let y = maxY; y >= minY; y--) {
      ySel.appendChild(makeOption(y, y, y === cur.y));
    }
    // 月
    for (let m = 1; m <= 12; m++) {
      MSel.appendChild(makeOption(m, m, m === cur.M));
    }
    // 時: 0-23
    for (let h = 0; h <= 23; h++) {
      hSel.appendChild(makeOption(h, pad2(h), h === cur.h));
    }
    // 分: 1分刻み
    for (let mi = 0; mi <= 59; mi++) {
      miSel.appendChild(makeOption(mi, pad2(mi), mi === cur.mi));
    }

    // 日: 年月に応じて再生成
    function rebuildDays() {
      const y = +ySel.value, M = +MSel.value;
      const max = daysInMonth(y, M);
      const prev = +dSel.value || cur.d;
      dSel.innerHTML = '';
      for (let d = 1; d <= max; d++) {
        dSel.appendChild(makeOption(d, d, d === Math.min(prev, max)));
      }
    }

    // 和暦表示
    const warekiSpan = document.createElement('span');
    warekiSpan.className = 'wareki';
    function updateWareki() {
      warekiSpan.textContent = '(' + toWareki(+ySel.value) + ')';
    }

    function unitSpan(t) {
      const s = document.createElement('span');
      s.className = 'unit';
      s.textContent = t;
      return s;
    }

    // 配置
    container.innerHTML = '';
    container.appendChild(ySel);
    container.appendChild(unitSpan('年'));
    container.appendChild(MSel);
    container.appendChild(unitSpan('月'));
    container.appendChild(dSel);
    container.appendChild(unitSpan('日'));
    container.appendChild(hSel);
    container.appendChild(unitSpan('時'));
    container.appendChild(miSel);
    container.appendChild(unitSpan('分'));
    container.appendChild(warekiSpan);
    container.appendChild(hidden);

    rebuildDays();
    updateWareki();

    function syncHidden() {
      const y = ySel.value, M = pad2(MSel.value), d = pad2(dSel.value);
      const h = pad2(hSel.value), mi = pad2(miSel.value);
      hidden.value = `${y}-${M}-${d}T${h}:${mi}`;
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }

    ySel.addEventListener('change', () => { rebuildDays(); updateWareki(); syncHidden(); });
    MSel.addEventListener('change', () => { rebuildDays(); syncHidden(); });
    [dSel, hSel, miSel].forEach(el => el.addEventListener('change', syncHidden));

    // 初期同期
    syncHidden();

    // 外部から hidden.value を変更したときの追従
    hidden.addEventListener('dt-picker-set', () => {
      const v = parseDtLocal(hidden.value);
      if (!v) return;
      ySel.value = v.y; MSel.value = v.M;
      rebuildDays(); dSel.value = v.d;
      hSel.value = v.h; miSel.value = v.mi;
      updateWareki();
    });

    return { hidden, ySel, MSel, dSel, hSel, miSel };
  }

  function setupAll(rootDoc) {
    const root = rootDoc || document;
    const pickers = root.querySelectorAll('.dt-picker');
    pickers.forEach(p => {
      // birth picker は古い日付も選べるように
      const opts = {};
      if (p.dataset.target === 'f-birth') {
        opts.minYear = 1900;
        opts.defaultDate = new Date(1990, 0, 1, 12, 0);
      }
      setup(p, opts);
    });
  }

  global.DtPicker = { setup, setupAll, toWareki };
})(typeof window !== 'undefined' ? window : globalThis);
