// dt-picker.js
// 元号・和暦年 / 西暦・月・日・時・分 のプルダウン式日時入力
// 既存の datetime-local 互換 (id="<target>" の hidden 入力に値を書き込む)
//
// 和暦と西暦は双方向に同期する。改元は年の途中で起きるため、
// 年だけでなく月日まで見て元号を決める (例: 1989年1月5日は昭和64年、
// 同年1月8日から平成元年)。

(function (global) {
  'use strict';

  // gy: その元号の元年にあたる西暦年 / start・end: 改元日 (西暦の [年,月,日])
  const ERA = [
    { name: '令和', abbr: 'R', gy: 2019, start: [2019, 5, 1],   end: null },
    { name: '平成', abbr: 'H', gy: 1989, start: [1989, 1, 8],   end: [2019, 4, 30] },
    { name: '昭和', abbr: 'S', gy: 1926, start: [1926, 12, 25], end: [1989, 1, 7] },
    { name: '大正', abbr: 'T', gy: 1912, start: [1912, 7, 30],  end: [1926, 12, 24] },
    { name: '明治', abbr: 'M', gy: 1868, start: [1868, 1, 25],  end: [1912, 7, 29] }
  ];
  const ERA_BY_NAME = {};
  ERA.forEach(e => { ERA_BY_NAME[e.name] = e; });

  const key = (y, M, d) => y * 10000 + M * 100 + d;

  // 西暦の年月日 → 元号 (範囲外は null)
  function eraOf(y, M, d) {
    const k = key(y, M, d);
    for (const e of ERA) {                    // 新しい元号から順に見る
      if (k >= key(e.start[0], e.start[1], e.start[2])) return e;
    }
    return null;
  }

  // 元号 + 和暦年 → その和暦年が占める西暦の期間 (同じ西暦年の中の月日で表す)
  function spanOf(era, n) {
    const Y = era.gy + n - 1;
    const lo = (Y === era.gy)
      ? { M: era.start[1], d: era.start[2] }
      : { M: 1, d: 1 };
    const hi = (era.end && Y === era.end[0])
      ? { M: era.end[1], d: era.end[2] }
      : { M: 12, d: 31 };
    return { Y, lo, hi };
  }

  // 選べる西暦の範囲 [minY, maxY] に収まる和暦年の範囲。無ければ null
  function warekiRange(era, minY, maxY) {
    const eraLastY = era.end ? era.end[0] : maxY;
    const yLo = Math.max(era.gy, minY);
    const yHi = Math.min(eraLastY, maxY);
    if (yLo > yHi) return null;
    return { from: yLo - era.gy + 1, to: yHi - era.gy + 1 };
  }

  // 表示用。年だけでも引けるが、月日を渡せば改元をまたぐ年も正しく出る
  function toWareki(year, M, d) {
    const e = (M && d) ? eraOf(year, M, d) : eraOf(year, 12, 31);
    if (!e) return '';
    const n = year - e.gy + 1;
    return `${e.name}${n === 1 ? '元' : n}年`;
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

    const eraSel = document.createElement('select'); eraSel.className = 'era';
    const wySel  = document.createElement('select'); wySel.className  = 'wy';
    const ySel   = document.createElement('select'); ySel.className   = 'y';
    const MSel   = document.createElement('select'); MSel.className   = 'M';
    const dSel   = document.createElement('select'); dSel.className   = 'd';
    const hSel   = document.createElement('select'); hSel.className   = 'h';
    const miSel  = document.createElement('select'); miSel.className  = 'mi';

    eraSel.setAttribute('aria-label', '元号');
    wySel.setAttribute('aria-label', '和暦の年');
    ySel.setAttribute('aria-label', '西暦の年');

    // 元号: 選べる西暦の範囲に一年でもかかるものだけ並べる
    ERA.forEach(e => {
      if (warekiRange(e, minY, maxY)) eraSel.appendChild(makeOption(e.name, e.name, false));
    });
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

    // 利用者が選んだ月日を覚えておく。改元をまたぐ操作で一時的に端へ寄せても、
    // ここは書き換えないので元の月日に戻せる
    let wantMD = { M: cur.M, d: cur.d };
    function rememberMD() { wantMD = { M: +MSel.value, d: +dSel.value }; }

    // 日: 年月に応じて再生成
    function rebuildDays(prefer) {
      const y = +ySel.value, M = +MSel.value;
      const max = daysInMonth(y, M);
      const want = prefer || +dSel.value || cur.d;
      dSel.innerHTML = '';
      for (let d = 1; d <= max; d++) {
        dSel.appendChild(makeOption(d, d, d === Math.min(want, max)));
      }
    }

    // 和暦年: 元号ごとに実在する年だけ並べる (昭和は64年まで、平成は31年まで)
    function rebuildWarekiYears(era, prefer) {
      const r = warekiRange(era, minY, maxY);
      wySel.innerHTML = '';
      if (!r) return;
      const want = Math.min(Math.max(prefer || r.from, r.from), r.to);
      for (let n = r.from; n <= r.to; n++) {
        wySel.appendChild(makeOption(n, n === 1 ? '元' : n, n === want));
      }
    }

    function unitSpan(t) {
      const s = document.createElement('span');
      s.className = 'unit';
      s.textContent = t;
      return s;
    }

    function row(cls, nodes) {
      const s = document.createElement('span');
      s.className = 'dt-row ' + cls;
      nodes.forEach(n => s.appendChild(n));
      return s;
    }

    // 配置: 和暦の年 / 西暦の年 / 月日 / 時刻 の4つの受け皿。
    // 二通りの書き方が違うのは年だけなので、年同士を隣に並べる。
    // 受け皿の単位で折り返るため、狭い画面でも数字と単位が離れない
    container.innerHTML = '';
    container.appendChild(row('dt-row-wareki',  [eraSel, wySel, unitSpan('年')]));
    container.appendChild(row('dt-row-seireki', [ySel, unitSpan('年')]));
    container.appendChild(row('dt-row-md',      [MSel, unitSpan('月'), dSel, unitSpan('日')]));
    container.appendChild(row('dt-row-hm',      [hSel, unitSpan('時'), miSel, unitSpan('分')]));
    container.appendChild(hidden);

    rebuildDays();

    // 西暦 → 和暦。表示を合わせるだけで、西暦側には手を触れない
    function refreshWareki() {
      const y = +ySel.value, M = +MSel.value, d = +dSel.value;
      const e = eraOf(y, M, d);
      if (!e) return;
      const n = y - e.gy + 1;
      if (eraSel.value !== e.name || !wySel.options.length) {
        eraSel.value = e.name;
        rebuildWarekiYears(e, n);
      }
      wySel.value = String(n);
    }

    // 和暦 → 西暦。元号と和暦年から西暦年を決める。
    // その和暦年に含まれない月日だったときは、その和暦年の端へ寄せて表示する。
    // ただし wantMD (利用者が選んだ月日) は書き換えない。元号を変えた拍子に
    // 一時的に端へ寄っても、和暦年を選び直せば元の月日に戻る。
    // (例: 昭和50年6月15日 → 元号を平成へ → 平成31年は4月まで → 4月30日と出るが、
    //  続けて「3年」を選べば平成3年6月15日に戻る)
    function applyWareki() {
      const era = ERA_BY_NAME[eraSel.value];
      if (!era) return;
      const n = +wySel.value;
      if (!n) return;
      const sp = spanOf(era, n);
      let M = wantMD.M, d = wantMD.d;
      const k = M * 100 + d;
      if (k < sp.lo.M * 100 + sp.lo.d)      { M = sp.lo.M; d = sp.lo.d; }
      else if (k > sp.hi.M * 100 + sp.hi.d) { M = sp.hi.M; d = sp.hi.d; }
      ySel.value = String(sp.Y);
      MSel.value = String(M);
      rebuildDays(d);
      syncHidden();
      refreshWareki();
    }

    function syncHidden() {
      const y = ySel.value, M = pad2(MSel.value), d = pad2(dSel.value);
      const h = pad2(hSel.value), mi = pad2(miSel.value);
      hidden.value = `${y}-${M}-${d}T${h}:${mi}`;
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }

    eraSel.addEventListener('change', () => {
      const era = ERA_BY_NAME[eraSel.value];
      if (era) rebuildWarekiYears(era, +wySel.value);
      applyWareki();
    });
    wySel.addEventListener('change', applyWareki);

    ySel.addEventListener('change', () => { rebuildDays(); refreshWareki(); syncHidden(); });
    MSel.addEventListener('change', () => { rebuildDays(); rememberMD(); refreshWareki(); syncHidden(); });
    dSel.addEventListener('change', () => { rememberMD(); refreshWareki(); syncHidden(); });
    [hSel, miSel].forEach(el => el.addEventListener('change', syncHidden));

    // 初期同期
    refreshWareki();
    syncHidden();

    // 外部から hidden.value を変更したときの追従
    hidden.addEventListener('dt-picker-set', () => {
      const v = parseDtLocal(hidden.value);
      if (!v) return;
      ySel.value = v.y; MSel.value = v.M;
      rebuildDays(v.d);
      hSel.value = v.h; miSel.value = v.mi;
      wantMD = { M: v.M, d: v.d };
      refreshWareki();
    });

    return { hidden, eraSel, wySel, ySel, MSel, dSel, hSel, miSel };
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

  global.DtPicker = { setup, setupAll, toWareki, eraOf, ERA };
})(typeof window !== 'undefined' ? window : globalThis);
