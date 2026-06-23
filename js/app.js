// app.js
// 鑑定書 UI 制御

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const Eto = window.Eto;
  const Kyusei = window.Kyusei;
  const SolarTerms = window.SolarTerms;
  const Kantei = window.Kantei;
  const Storage = window.Storage;

  let currentRecordId = null;

  // ===== 起動時 =====
  document.addEventListener('DOMContentLoaded', () => {
    // 1) プルダウン日時入力をセットアップ
    DtPicker.setupAll();

    // 2) 相談日 = 現在時刻
    const now = new Date();
    setDateInput('f-consult', now);

    // 3) URL ?id=... があれば履歴から読み込み
    const params = new URLSearchParams(location.search);
    const recId = params.get('id');
    if (recId) {
      const rec = Storage.get(recId);
      if (rec) loadRecord(rec);
    }

    // イベント
    $('btn-compute').addEventListener('click', compute);
    $('btn-save').addEventListener('click', save);
    $('btn-print').addEventListener('click', () => {
      // 印刷前に詳細カードを全展開 (印刷後は元に戻す)
      const cards = Array.from(document.querySelectorAll('details.detail-card'));
      const wasOpen = cards.map(d => d.open);
      cards.forEach(d => d.open = true);
      const restore = () => {
        cards.forEach((d, i) => d.open = wasOpen[i]);
        window.removeEventListener('afterprint', restore);
      };
      window.addEventListener('afterprint', restore);
      window.print();
    });
    $('btn-new').addEventListener('click', newRecord);

    // 入力変更で自動再計算
    ['f-birth', 'f-consult'].forEach(id => {
      $(id).addEventListener('change', compute);
    });
  });

  function toLocalDateTimeInput(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // hidden 入力に日時を設定し、プルダウンに反映
  function setDateInput(id, dateOrStr) {
    const el = $(id);
    if (!el) return;
    if (dateOrStr instanceof Date) {
      el.value = toLocalDateTimeInput(dateOrStr);
    } else {
      el.value = dateOrStr || '';
    }
    el.dispatchEvent(new Event('dt-picker-set'));
  }

  // 満年齢計算: 相談日時点の誕生日を過ぎているかで判定
  function calcAge(birth, ref) {
    if (!birth || isNaN(birth.getTime())) return null;
    if (!ref || isNaN(ref.getTime())) ref = new Date();
    let age = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
    return age < 0 ? 0 : age;
  }

  // ===== 計算 =====
  function compute() {
    const birthVal = $('f-birth').value;
    const consultVal = $('f-consult').value;
    if (!birthVal) { return; }
    const birth = new Date(birthVal);
    const consult = consultVal ? new Date(consultVal) : new Date();
    // 満年齢を相談日時点で自動算出して年齢欄に反映 (常に上書き)
    const age = calcAge(birth, consult);
    const ageEl = $('f-age');
    if (age !== null && ageEl) {
      ageEl.value = String(age);
      // iOS Safari など描画更新のため input/change イベントを発火
      ageEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const r = Kantei.computeKantei(birth, consult);
    _lastResult = r;
    renderResult(r);
    return r;
  }

  // ===== 結果描画 =====
  function renderResult(r) {
    const K = Kyusei;

    // 上段4盤 (相談日): 変換後中宮で描画
    const cInt = r.consult.isInton;
    drawBan('ban-y', r.consult.displayYearCenter,  r.birth.honmeisei, r.consult.yearEto,  false);
    drawBan('ban-m', r.consult.displayMonthCenter, r.birth.honmeisei, r.consult.monthEto, false);
    drawBan('ban-d', r.consult.displayDayCenter,   r.birth.honmeisei, r.consult.dayEto,   cInt);
    drawBan('ban-h', r.consult.displayHourCenter,  r.birth.honmeisei, r.consult.hourEto,  cInt);
    // ボード下情報: 命式と同じく元の中宮を表示 (ボード自体の3x3グリッドが変換結果)
    $('ban-y-info').textContent = `${r.consult.yearEto.name} / ${K.STAR_NAMES[r.consult.yearCenter]}`;
    $('ban-m-info').textContent = `${r.consult.monthEto.name} / ${K.STAR_NAMES[r.consult.monthCenter]}`;
    $('ban-d-info').textContent = `${r.consult.dayEto.name} / ${K.STAR_NAMES[r.consult.dayCenter]}`;
    $('ban-h-info').textContent = `${r.consult.hourEto.name} / ${K.STAR_NAMES[r.consult.hourCenter]}`;

    // 下段4盤 (生年月日): 変換後中宮で描画
    const bInt = r.birth.isInton;
    const ryunenYear  = Kantei.computeRyunenAgesOnPerimeter(r.birth.yearEto.branchIdx);
    const ryunenMonth = Kantei.computeRyunenAgesOnPerimeter(r.birth.monthEto.branchIdx);
    drawBan('ban-by', r.birth.displayYearCenter,  r.birth.honmeisei, r.birth.yearEto,  false, ryunenYear);
    drawBan('ban-bm', r.birth.displayMonthCenter, r.birth.honmeisei, r.birth.monthEto, false, ryunenMonth);
    drawBan('ban-bd', r.birth.displayDayCenter,   r.birth.honmeisei, r.birth.dayEto,   bInt);
    drawBan('ban-bh', r.birth.displayHourCenter,  r.birth.honmeisei, r.birth.hourEto,  bInt);
    $('ban-by-info').textContent = `${r.birth.yearEto.name} / ${K.STAR_NAMES[r.birth.yearCenter]}`;
    $('ban-bm-info').textContent = `${r.birth.monthEto.name} / ${K.STAR_NAMES[r.birth.monthCenter]}`;
    $('ban-bd-info').textContent = `${r.birth.dayEto.name} / ${K.STAR_NAMES[r.birth.dayCenter]}`;
    $('ban-bh-info').textContent = `${r.birth.hourEto.name} / ${K.STAR_NAMES[r.birth.hourCenter]}`;

    // 命式 (干支+九星 4本): 例「丙子四緑、乙未三碧、丙午三碧、乙未二黒」
    $('o-meishiki').textContent = [
      r.birth.yearEto.name + K.STAR_NAMES[r.birth.yearCenter],
      r.birth.monthEto.name + K.STAR_NAMES[r.birth.monthCenter],
      r.birth.dayEto.name + K.STAR_NAMES[r.birth.dayCenter],
      r.birth.hourEto.name + K.STAR_NAMES[r.birth.hourCenter]
    ].join('、');

    // 相談日九星: 相談日時の年月日時 干支+九星
    $('o-consult-summary').textContent = [
      r.consult.yearEto.name + K.STAR_NAMES[r.consult.yearCenter],
      r.consult.monthEto.name + K.STAR_NAMES[r.consult.monthCenter],
      r.consult.dayEto.name + K.STAR_NAMES[r.consult.dayCenter],
      r.consult.hourEto.name + K.STAR_NAMES[r.consult.hourCenter]
    ].join('、');

    // 下部宮位: 宮名 + 干支 + 九星 + (暗剣殺ア / 破ハ マーカー) を1行で
    function fmt(cell) {
      if (!cell) return '—';
      const parts = [cell.kyu];
      if (cell.branches) parts.push(cell.branches);
      if (cell.starName) parts.push(cell.starName);
      let html = parts.join(' ');
      const marks = [];
      if (cell.anken) marks.push('<span style="color:#d00;font-weight:bold;">ア</span>');
      if (cell.ha)    marks.push('<span style="color:#06c;font-weight:bold;">ハ</span>');
      if (marks.length) html += ' ' + marks.join('');
      return html;
    }
    $('o-honmei').innerHTML = fmt(r.bottom.honmei);
    $('o-taichu').innerHTML = fmt(r.bottom.taichu);
    $('o-migi').innerHTML = fmt(r.bottom.migi);
    $('o-hidari').innerHTML = fmt(r.bottom.hidari);
    $('o-hongu').innerHTML = fmt(r.bottom.hongu);
    $('o-chukyu').innerHTML = fmt(r.bottom.chukyu);
    $('o-toki').innerHTML = fmt(r.bottom.toki);
    $('o-tsuki').innerHTML = fmt(r.bottom.tsuki);
    $('o-toshi').innerHTML = fmt(r.bottom.toshi);
    $('o-kaiketsu').innerHTML = fmt(r.bottom.kaiketsu);
    $('o-jihonmei').innerHTML = fmt(r.bottom.jiHonmei);
    $('o-jihongu').innerHTML = fmt(r.bottom.jiHongu);

    // 十二支吉凶象意 (生年・生月・生日 干支)
    const EtoTable = window.EtoTable;
    function fillEtoRow(prefix, branchName, labelEl, label) {
      labelEl.textContent = `${label} ${branchName}`;
      const row = EtoTable[branchName];
      if (!row) return;
      Eto.BRANCHES.forEach((b, i) => {
        const cell = $(prefix + '-' + i);
        if (!cell) return;
        const info = row[b];
        if (!info) { cell.textContent = ''; cell.className = ''; return; }
        // ラベルがあれば 「ラベル+記号」、なければ記号のみ
        cell.innerHTML = info.label
          ? `<small style="display:block;font-size:8px;color:#666;line-height:1;">${info.label}</small>${info.symbol}`
          : info.symbol;
        cell.className = 'eto-sym-' + info.symbol;
      });
    }
    fillEtoRow('ey', r.birth.yearEto.branch,  $('eto-by-label'), '生年');
    fillEtoRow('em', r.birth.monthEto.branch, $('eto-bm-label'), '生月');
    fillEtoRow('ed', r.birth.dayEto.branch,   $('eto-bd-label'), '生日');

    // 解神 結果: 「刑/冲/害/破」が一つもなく、「三合/合」が一つ以上ある支を抽出
    (function fillKekka() {
      const kekkaEl = $('eto-kekka');
      if (!kekkaEl) return;
      const refs = [
        EtoTable[r.birth.yearEto.branch],
        EtoTable[r.birth.monthEto.branch],
        EtoTable[r.birth.dayEto.branch]
      ];
      const BAD = /[刑冲害破]/;
      const result = [];
      for (const b of Eto.BRANCHES) {
        let hasBad = false, hasGood = false;
        for (const row of refs) {
          if (!row) continue;
          const info = row[b];
          if (!info) continue;
          if (BAD.test(info.label)) hasBad = true;
          if (info.label === '三合' || info.label === '合') hasGood = true;
        }
        if (!hasBad && hasGood) result.push(b);
      }
      kekkaEl.textContent = result.join('、');
    })();

    // 干支吉凶の輪に生年/生月/生日の支を色付き丸で囲む
    document.querySelectorAll('.eto-wheel span[data-branch]').forEach(s => {
      s.classList.remove('eto-year', 'eto-month', 'eto-day');
    });
    const markBranch = (branchName, cls) => {
      const span = document.querySelector(`.eto-wheel span[data-branch="${branchName}"]`);
      if (span) span.classList.add(cls);
    };
    markBranch(r.birth.yearEto.branch,  'eto-year');
    markBranch(r.birth.monthEto.branch, 'eto-month');
    markBranch(r.birth.dayEto.branch,   'eto-day');

    // 内蔵 = 蔵気 (常に最新計算で上書き) — HTML マーカー入り
    $('o-naizou').innerHTML = r.bottom.naizou.kuraki_nengetsu;
    $('o-shukumei').innerHTML = r.bottom.naizou.shukumei_nengetsu;

    // ===== 判断 (旧 判断書) セクション =====
    renderHandan(r);
  }

  function renderHandan(r) {
    // 同会・被同会 (九星 + 宮)
    const fmtStarKyu = (starIdx, posIdx) => {
      const star = Kyusei.STAR_NAMES[starIdx] || '';
      const kyu = (typeof posIdx === 'number') ? Kyusei.POSITION_TO_KYU_NAME[posIdx] : '';
      return kyu ? `${star} ${kyu}` : star;
    };
    $('o-doukai-toshi').textContent   = fmtStarKyu(r.bottom.doukai.toshi,    r.bottom.doukai.toshiPos);
    $('o-hidoukai-toshi').textContent = fmtStarKyu(r.bottom.hidoukai.toshi,  r.bottom.hidoukai.toshiPos);
    $('o-doukai-tsuki').textContent   = fmtStarKyu(r.bottom.doukai.tsuki,    r.bottom.doukai.tsukiPos);
    $('o-hidoukai-tsuki').textContent = fmtStarKyu(r.bottom.hidoukai.tsuki,  r.bottom.hidoukai.tsukiPos);

    renderKyuZasuru(r.bottom.doukai.toshiPos, r.bottom.doukai.tsukiPos);

    // 本人運気 (宮傾斜)
    const keisha = r.bottom.keisha;
    const KD = window.KeishaData;
    $('o-keisha').textContent = KD ? KD.label(keisha) : keisha;
    const detailEl = $('o-keisha-detail');
    if (detailEl) {
      detailEl.innerHTML = '';
      const items = KD ? KD.get(keisha) : null;
      if (items && items.length) {
        items.forEach(text => {
          const li = document.createElement('li');
          li.textContent = text;
          detailEl.appendChild(li);
        });
      }
    }

    // 内蔵法 詳細
    $('o-kuraki-nm').innerHTML  = r.bottom.naizou.kuraki_toshigetsu;
    $('o-shukumei-nm').innerHTML = r.bottom.naizou.shukumei_toshigetsu;
    $('o-kuraki-md').innerHTML  = r.bottom.naizou.kuraki_getsubi;
    $('o-shukumei-md').innerHTML = r.bottom.naizou.shukumei_getsubi;

    const birth = new Date($('f-birth').value);
    const consult = new Date($('f-consult').value || Date.now());
    renderSeigetsu(birth);
    renderSeinichi(r.birth.dayEto.branch);
    renderSeimatsuri(r.birth.honmeisei, r.consult.yearCenter);
    renderShuku(consult);
    renderDetail(r, birth, consult);
  }

  // ========================================================
  // 詳細鑑定 ①〜⑩
  // ========================================================
  let aishouList = [];

  function renderDetail(r, birth, consult) {
    renderKyoushin(r);
    renderKichiCal(r, consult);
    renderHouiTori(r, consult);
    renderMonthFlow(r, consult);
    renderYearFlow(r, consult);
    renderEtoRel(r);
    renderRekichu(r, consult);
    renderKoyomi(consult);
    renderGogyou(r);
    setupAishouUI(r);
    renderAishou(r);
  }

  // ----- ① 凶神方位 -----
  function renderKyoushin(r) {
    const el = $('o-kyoushin');
    if (!el || !window.HouiAnalysis) return;
    const HA = window.HouiAnalysis;
    const honmeisei = r.birth.honmeisei;
    const boards = [
      { key:'年盤', center: r.consult.yearCenter,  bIdx: r.consult.yearEto.branchIdx },
      { key:'月盤', center: r.consult.monthCenter, bIdx: r.consult.monthEto.branchIdx },
      { key:'日盤', center: r.consult.dayCenter,   bIdx: r.consult.dayEto.branchIdx },
      { key:'時盤', center: r.consult.hourCenter,  bIdx: r.consult.hourEto.branchIdx }
    ];
    let html = '<table class="ks-table"><thead><tr><th>盤</th>';
    HA.DIRS.forEach(d => { html += `<th>${d.label}</th>`; });
    html += '</tr></thead><tbody>';
    boards.forEach(b => {
      const a = HA.analyzeBoard(b.center, b.bIdx, honmeisei);
      const map = HA.getKyoushinByDir(a);
      html += `<tr><th>${b.key}</th>`;
      HA.DIRS.forEach(d => {
        const names = map[d.pos];
        const cls = names.length ? 'bad' : '';
        html += `<td class="${cls}">${names.map(n=>`<span class="ks-mark">${n}</span>`).join('')}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    html += '<div class="ks-legend">※ 五黄殺・暗剣殺は移転や開業の凶方。本命殺・本命的殺は本人にとって特に凶。歳/月破は契約・開始に不利。</div>';
    el.innerHTML = html;
  }

  // ----- ② 吉方位カレンダー (3ヶ月) -----
  function renderKichiCal(r, consult) {
    const el = $('o-kichi-cal');
    if (!el || !window.HouiAnalysis || !window.SolarTerms) return;
    const HA = window.HouiAnalysis;
    const honmeisei = r.birth.honmeisei;
    let html = '<table class="ks-table"><thead><tr><th>月</th>';
    HA.DIRS.forEach(d => { html += `<th>${d.label}</th>`; });
    html += '</tr></thead><tbody>';
    const base = new Date(consult.getFullYear(), consult.getMonth(), 15);
    for (let i = 0; i < 3; i++) {
      const dt = new Date(base.getFullYear(), base.getMonth() + i, 15);
      const sm = SolarTerms.getSetsuMonth(dt);
      const ye = Eto.getYearEto(sm.setsuYear);
      const me = Eto.getMonthEto(sm.setsuYear, sm.setsuMonth);
      const yearCenter = Kyusei.getYearStar(sm.setsuYear);
      const monthCenter = Kyusei.getMonthStar(ye.branchIdx, sm.setsuMonth);
      const dirs = HA.getMonthKichihoui(monthCenter, me.branchIdx, yearCenter, ye.branchIdx, honmeisei);
      html += `<tr><th>${dt.getFullYear()}/${dt.getMonth()+1}</th>`;
      dirs.forEach(d => {
        if (d.kichi) {
          html += `<td class="kichi">吉<br><small>${d.starName||''}</small></td>`;
        } else if (d.bad.length) {
          html += `<td class="bad"><small>${d.bad[0]}</small></td>`;
        } else {
          html += `<td><small style="color:#888;">—</small></td>`;
        }
      });
      html += '</tr>';
    }
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // ----- ③ 方位取り適日 -----
  function renderHouiTori(r, consult) {
    const el = $('o-houi-tori');
    if (!el || !window.UnTables) return;
    const list = UnTables.findKichiDays(consult, r.birth.honmeisei, 30);
    if (!list.length) { el.innerHTML = '<div style="color:#888;">向こう30日に年・月・日3つ揃う吉方位は見当たりません。</div>'; return; }
    let html = '<ul class="houi-tori-list">';
    list.forEach(item => {
      const dt = item.date;
      const m = (dt.getMonth() + 1), d = dt.getDate();
      const W = ['日','月','火','水','木','金','土'][dt.getDay()];
      const dirs = item.dirs.map(x => x.label).join('・');
      html += `<li><span class="ht-date">${m}/${d}(${W})</span> <span class="ht-dirs">${dirs}</span></li>`;
    });
    html += '</ul>';
    el.innerHTML = html;
  }

  // ----- ④ 月運表 (12ヶ月) -----
  function renderMonthFlow(r, consult) {
    const el = $('o-month-flow');
    if (!el || !window.UnTables) return;
    const rows = UnTables.monthFlow(consult, r.birth.honmeisei, 12);
    let html = '<table class="ks-table mf-table"><thead><tr><th>月</th><th>干支</th><th>月盤中宮</th><th>本命位置</th><th>同会</th></tr></thead><tbody>';
    rows.forEach(row => {
      html += `<tr><td>${row.year}/${row.month}</td><td>${row.monthEto}</td><td>${row.centerName}</td><td>${row.kyu}</td><td>${row.doukaiName||''}</td></tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // ----- ⑤ 年運表 (9年) -----
  function renderYearFlow(r, consult) {
    const el = $('o-year-flow');
    if (!el || !window.UnTables) return;
    const rows = UnTables.yearFlow(consult, r.birth.honmeisei, 9);
    let html = '<table class="ks-table yf-table"><thead><tr><th>年</th><th>干支</th><th>年盤中宮</th><th>本命位置</th><th>同会</th></tr></thead><tbody>';
    rows.forEach((row, i) => {
      const cur = i === 0 ? ' class="current"' : '';
      html += `<tr${cur}><td>${row.year}</td><td>${row.yearEto}</td><td>${row.centerName}</td><td>${row.kyu}</td><td>${row.doukaiName||''}</td></tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // ----- ⑥ 干支相関 -----
  function renderEtoRel(r) {
    const el = $('o-eto-rel');
    if (!el || !window.EtoRelations) return;
    const cBranch = r.consult.dayEto.branch;
    const pairs = [
      { label: '生年 × 相談日', a: r.birth.yearEto.branch,  b: cBranch },
      { label: '生月 × 相談日', a: r.birth.monthEto.branch, b: cBranch },
      { label: '生日 × 相談日', a: r.birth.dayEto.branch,   b: cBranch }
    ];
    let html = '<table class="ks-table er-table"><thead><tr><th>組</th><th>支</th><th>関係</th></tr></thead><tbody>';
    pairs.forEach(p => {
      const rels = EtoRelations.relate(p.a, p.b);
      const labels = rels.length
        ? rels.map(x => `<span class="er-${x.kind}">${x.name}</span>`).join(' ')
        : '<span style="color:#888;">特になし</span>';
      html += `<tr><td>${p.label}</td><td>${p.a} ・ ${p.b}</td><td>${labels}</td></tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // ----- ⑦ 暦注 -----
  function renderRekichu(r, consult) {
    const el = $('o-rekichu');
    if (!el || !window.Rekichu || !window.Koyomi) return;
    const ky = Koyomi.getKyureki(consult);
    const rokuyou = Rekichu.rokuyou(ky.month, ky.day);
    const ju = Rekichu.junichoku(r.consult.monthEto.branchIdx, r.consult.dayEto.branchIdx);
    const rmean = Rekichu.ROKUYOU_MEANING[rokuyou] || '';
    const jmean = Rekichu.JUNICHOKU_MEANING[ju] || '';
    el.innerHTML = `
      <div class="rk-row"><span class="rk-label">六曜</span><span class="rk-name">${rokuyou}</span><span class="rk-mean">${escapeHtml(rmean)}</span></div>
      <div class="rk-row"><span class="rk-label">十二直</span><span class="rk-name">${ju}</span><span class="rk-mean">${escapeHtml(jmean)}</span></div>`;
  }

  // ----- ⑧ 旧暦・月齢・節入りまで -----
  function renderKoyomi(consult) {
    const el = $('o-koyomi');
    if (!el || !window.Koyomi) return;
    const ky = Koyomi.getKyureki(consult);
    const nx = Koyomi.nextSetsuiriInfo(consult);
    let html = '<div class="ky-grid">';
    html += `<div><span class="ky-lbl">旧暦</span><span class="ky-val">${ky.month||'?'}月${ky.day}日${ky.isLeap?'(閏)':''}</span></div>`;
    html += `<div><span class="ky-lbl">月齢</span><span class="ky-val">${ky.moonAge} (${ky.phase})</span></div>`;
    if (nx) {
      const dt = nx.date;
      html += `<div><span class="ky-lbl">次の節入り</span><span class="ky-val">${nx.name} ${dt.getMonth()+1}/${dt.getDate()} (あと${nx.days}日)</span></div>`;
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // ----- ⑨ 五行バランス -----
  function renderGogyou(r) {
    const el = $('o-gogyou');
    if (!el || !window.GogyouBalance) return;
    const c = GogyouBalance.count(r.birth.yearEto, r.birth.monthEto, r.birth.dayEto, r.birth.hourEto);
    const diag = GogyouBalance.diagnose(c);
    const comment = GogyouBalance.comment(diag);
    const max = Math.max(...diag.map(d => d.count), 1);
    let html = '<div class="go-bars">';
    const elemColor = { '木':'#6b8e3a', '火':'#a83232', '土':'#8b6b2e', '金':'#b8a060', '水':'#2a4359' };
    diag.forEach(d => {
      const w = Math.round((d.count / max) * 100);
      html += `<div class="go-row"><span class="go-elem" style="color:${elemColor[d.elem]};">${d.elem}</span>`
            + `<span class="go-bar"><span class="go-fill" style="width:${w}%;background:${elemColor[d.elem]};"></span></span>`
            + `<span class="go-cnt">${d.count}</span><span class="go-stat go-stat-${d.status}">${d.status}</span></div>`;
    });
    html += '</div>';
    html += `<div class="go-comment">${escapeHtml(comment)}</div>`;
    el.innerHTML = html;
  }

  // ----- ⑩ 相性診断 -----
  function setupAishouUI(r) {
    const sel = $('aishou-star');
    if (sel && !sel.dataset.ready && window.Aishou) {
      Aishou.ALL_STARS.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.v;
        opt.textContent = s.name;
        sel.appendChild(opt);
      });
      sel.dataset.ready = '1';
    }
    const btnAdd = $('btn-aishou-add');
    const btnClear = $('btn-aishou-clear');
    if (btnAdd && !btnAdd.dataset.bound) {
      btnAdd.addEventListener('click', () => {
        const name = $('aishou-name').value.trim();
        const star = parseInt($('aishou-star').value, 10);
        if (!star) { alert('本命星を選択してください'); return; }
        aishouList.push({ name: name || '相手', star });
        $('aishou-name').value = '';
        $('aishou-star').value = '';
        renderAishou(currentResult());
      });
      btnAdd.dataset.bound = '1';
    }
    if (btnClear && !btnClear.dataset.bound) {
      btnClear.addEventListener('click', () => {
        aishouList = [];
        renderAishou(currentResult());
      });
      btnClear.dataset.bound = '1';
    }
  }

  function renderAishou(r) {
    const el = $('o-aishou');
    if (!el || !window.Aishou || !r) return;
    if (!aishouList.length) {
      el.innerHTML = '<div style="color:#888;font-size:11px;">相手の本命星を追加すると、相生・相剋の関係を判定します。</div>';
      return;
    }
    let html = '<table class="ks-table ai-table"><thead><tr><th>相手</th><th>本命星</th><th>関係</th><th>所見</th><th></th></tr></thead><tbody>';
    const selfName = ($('f-name').value || '本人').trim() || '本人';
    aishouList.forEach((p, idx) => {
      const rel = Aishou.relate(r.birth.honmeisei, p.star);
      const star = Kyusei.STAR_NAMES[p.star];
      html += `<tr class="ai-${rel.kind}">`
           + `<td>${escapeHtml(p.name)}</td>`
           + `<td>${star}</td>`
           + `<td>${rel.name}</td>`
           + `<td>${escapeHtml(rel.desc)}</td>`
           + `<td class="no-print"><button type="button" class="btn danger ai-del" data-idx="${idx}" style="padding:2px 8px;font-size:11px;">×</button></td>`
           + `</tr>`;
    });
    html += `</tbody><tfoot><tr><td colspan="5" style="font-size:10px;color:#888;">基準: ${escapeHtml(selfName)} (${Kyusei.STAR_NAMES[r.birth.honmeisei]})</td></tr></tfoot></table>`;
    el.innerHTML = html;
    el.querySelectorAll('.ai-del').forEach(b => {
      b.addEventListener('click', () => {
        const i = parseInt(b.dataset.idx, 10);
        aishouList.splice(i, 1);
        renderAishou(currentResult());
      });
    });
  }

  // 直近の計算結果を保持して相性UIから再利用
  let _lastResult = null;
  function currentResult() { return _lastResult; }

  function renderKyuZasuru(toshiPos, tsukiPos) {
    const el = $('o-kyu-zasuru');
    if (!el) return;
    const KZ = window.KyuZasuruData;
    if (!KZ) { el.innerHTML = ''; return; }
    const toshiKyu = (typeof toshiPos === 'number') ? Kyusei.POSITION_TO_KYU_NAME[toshiPos] : null;
    const tsukiKyu = (typeof tsukiPos === 'number') ? Kyusei.POSITION_TO_KYU_NAME[tsukiPos] : null;
    let html = '';
    if (toshiKyu) {
      const text = KZ.get(toshiKyu);
      if (text) html += `<div class="zasuru-item"><b>年: 本命星 ${escapeHtml(toshiKyu)}に座するとき</b><div>${escapeHtml(text)}</div></div>`;
    }
    if (tsukiKyu && tsukiKyu !== toshiKyu) {
      const text = KZ.get(tsukiKyu);
      if (text) html += `<div class="zasuru-item" style="margin-top:4px;"><b>月: 本命星 ${escapeHtml(tsukiKyu)}に座するとき</b><div>${escapeHtml(text)}</div></div>`;
    }
    el.innerHTML = html;
  }

  function renderSeigetsu(birth) {
    const m = birth.getMonth() + 1;
    $('o-seigetsu-label').textContent = `${m}月生まれ`;
    const SD = window.SeigetsuData;
    const text = SD ? SD.get(m) : null;
    $('o-seigetsu-text').textContent = text || '(該当データなし)';
  }

  function renderSeinichi(branch) {
    $('o-seinichi-label').textContent = `生日 ${branch}の日`;
    const SD = window.SeinichiData;
    const text = SD ? SD.get(branch) : null;
    $('o-seinichi-text').textContent = text || '(該当データなし)';
  }

  function renderSeimatsuri(honmeisei, consultYearCenter) {
    const SMD = window.SeimatsuriData;
    if (!SMD) return;
    const idx = SMD.getYouseiIndex(honmeisei, consultYearCenter);
    let html = '';
    if (idx !== null) {
      const cur = SMD.get(idx);
      if (cur) {
        const kichi = cur.kichi ? `【${escapeHtml(cur.kichi)}】` : '';
        html = `<div class="seimatsuri-current"><b>本年の曜星: ${escapeHtml(cur.star)} ${kichi}（${escapeHtml(cur.period)}）</b><div>${escapeHtml(cur.text)}</div></div>`;
      }
    }
    $('o-seimatsuri').innerHTML = html;
  }

  function renderShuku(consult) {
    const ND = window.NijuhasshukuData;
    if (!ND) return;
    const s = ND.getShuku(consult);
    $('o-shuku').innerHTML = `<b>${escapeHtml(s.name)}宿</b>：${escapeHtml(s.text)}`;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  }

  // 3x3 盤の描画
  // periodEto: その盤の「期間の干支」(年/月/日/時 の eto 全体, または null)
  // isInton: 陰遁期間か (true なら12支の運行が逆になる)
  // ryunenAges: 任意。{ posIdx: [age, age, ...] } の形で、各方位に流年法の開始年齢を表示
  function drawBan(elId, centerStar, honmeiStar, periodEto, isInton, ryunenAges) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = '';
    const DRAW_ORDER = [8, 7, 6, 5, 4, 3, 2, 1, 0];
    const DIRS_KAKKA = { 0:'乾',1:'坎',2:'艮',3:'兌',4:'',5:'震',6:'坤',7:'離',8:'巽' };
    const DEFAULT_POS_STAR = Kyusei.DEFAULT_POSITION_STARS;
    const STEMS = window.Eto.STEMS;
    const BRANCHES = window.Eto.BRANCHES;
    // 流年法の外周12箇所のCSSクラス (時計回り NW隅 起点)
    const PERIMETER_CLASSES = [
      'nw-corner', 'top-1', 'top-2', 'ne-corner',
      'right-1', 'right-2', 'se-corner',
      'bottom-1', 'bottom-2', 'sw-corner',
      'left-1', 'left-2'
    ];

    const stars = Kyusei.getPositionStars(centerStar);
    const honmeiPos = Kyusei.findPositionOfStar(centerStar, honmeiStar);
    const taichuPos = Kyusei.getTaichuPosition(honmeiPos);

    const periodBranchIdx = periodEto ? periodEto.branchIdx : null;
    const periodStemIdx = periodEto ? periodEto.stemIdx : null;
    const BRANCH_NATURAL_POS = [1, 2, 2, 5, 8, 8, 7, 6, 6, 3, 0, 0];

    let ankenPos = null, haPos = null;
    if (centerStar !== 5) {
      const gokoPos = Kyusei.findPositionOfStar(centerStar, 5);
      ankenPos = 8 - gokoPos;
    }
    if (typeof periodBranchIdx === 'number') {
      const naturalPos = BRANCH_NATURAL_POS[periodBranchIdx];
      haPos = 8 - naturalPos;
    }

    DRAW_ORDER.forEach(pos => {
      const star = stars[pos];
      const cell = document.createElement('div');
      cell.className = 'ban-cell-inner';
      if (pos === 4) cell.classList.add('center');
      if (pos === honmeiPos) cell.classList.add('honmei');
      if (pos === taichuPos) cell.classList.add('taichu');

      const kakkaSpan = document.createElement('span');
      kakkaSpan.className = 'kakka';
      kakkaSpan.textContent = DIRS_KAKKA[pos];
      cell.appendChild(kakkaSpan);

      // 中央行: 九星 + 干支 (横並び)
      const mainRow = document.createElement('div');
      mainRow.className = 'cell-main';
      const starSpan = document.createElement('span');
      starSpan.className = 'star';
      starSpan.textContent = Kyusei.STAR_NAMES[star];
      mainRow.appendChild(starSpan);

      if (typeof periodBranchIdx === 'number') {
        const defStar = DEFAULT_POS_STAR[pos];
        const offset = isInton
          ? ((5 - defStar + 9) % 9)
          : ((defStar - 5 + 9) % 9);
        const branchIdx = ((periodBranchIdx + offset) % 12 + 12) % 12;
        const stemIdx = (typeof periodStemIdx === 'number')
          ? ((periodStemIdx + offset) % 10 + 10) % 10
          : null;
        const etoSpan = document.createElement('span');
        etoSpan.className = 'eto';
        etoSpan.textContent = (stemIdx !== null ? STEMS[stemIdx] : '') + BRANCHES[branchIdx];
        mainRow.appendChild(etoSpan);
      }
      cell.appendChild(mainRow);

      // ア/ハ マーク (中央行の真下)
      if (pos === ankenPos || pos === haPos) {
        const marks = document.createElement('div');
        marks.className = 'cell-marks';
        if (pos === ankenPos) {
          const m = document.createElement('span');
          m.className = 'mark anken';
          m.textContent = 'ア';
          marks.appendChild(m);
        }
        if (pos === haPos) {
          const m = document.createElement('span');
          m.className = 'mark ha';
          m.textContent = 'ハ';
          marks.appendChild(m);
        }
        cell.appendChild(marks);
      }

      el.appendChild(cell);
    });

    // 流年法 歳数 — 外周12箇所 (4隅 + 8接点) に配置
    if (ryunenAges) {
      for (let i = 0; i < 12; i++) {
        if (ryunenAges[i] === undefined) continue;
        const ageEl = document.createElement('span');
        ageEl.className = 'perimeter-age perim-' + PERIMETER_CLASSES[i];
        ageEl.textContent = ryunenAges[i];
        el.appendChild(ageEl);
      }
    }
  }

  // ===== 保存 / 読み込み =====
  function save() {
    const birthVal = $('f-birth').value;
    if (!birthVal) {
      alert('生年月日を入力してください');
      return null;
    }
    const record = {
      id: currentRecordId,
      name: $('f-name').value,
      gender: $('f-gender').value,
      age: $('f-age').value,
      topic: $('f-topic').value,
      consult: $('f-consult').value,
      birth: birthVal,
      handan: {
        honnin: $('m-honnin').value,
        nengetsu: $('m-nengetsu').value,
        naizou: $('m-naizou').value
      }
    };
    const saved = Storage.upsert(record);
    currentRecordId = saved.id;
    history.replaceState(null, '', '?id=' + saved.id);
    flash('保存しました');
    return saved;
  }

  function loadRecord(rec) {
    currentRecordId = rec.id;
    $('f-name').value = rec.name || '';
    $('f-gender').value = rec.gender || '';
    $('f-age').value = rec.age || '';
    $('f-topic').value = rec.topic || '';
    setDateInput('f-consult', rec.consult || '');
    setDateInput('f-birth', rec.birth || '');
    if (rec.handan) {
      $('m-honnin').value = rec.handan.honnin || '';
      $('m-nengetsu').value = rec.handan.nengetsu || '';
      $('m-naizou').value = rec.handan.naizou || '';
    }
    // 内蔵・宿命 は compute() 内で常に最新の計算結果に上書きされる
    compute();
  }

  function newRecord() {
    if (currentRecordId && !confirm('現在のデータは保存されていません。新規作成しますか?')) return;
    currentRecordId = null;
    history.replaceState(null, '', location.pathname);
    ['f-name','f-gender','f-age','f-topic','m-honnin','m-nengetsu','m-naizou'].forEach(id => {
      const el = $(id);
      if (el) el.value = '';
    });
    $('o-naizou').textContent = '';
    $('o-shukumei').textContent = '';
    setDateInput('f-birth', '');
    setDateInput('f-consult', new Date());
    document.querySelectorAll('.ban').forEach(b => b.innerHTML = '');
    document.querySelectorAll('.ban-sub').forEach(b => b.textContent = '');
    ['o-honmei','o-taichu','o-migi','o-hidari','o-hongu','o-chukyu','o-toki','o-tsuki','o-toshi','o-kaiketsu','o-jihonmei','o-jihongu','o-meishiki','o-consult-summary'].forEach(id => {
      const el = $(id);
      if (el) el.textContent = '';
    });
    // 12支吉凶テーブルもクリア
    ['ey','em','ed'].forEach(prefix => {
      for (let i = 0; i < 12; i++) {
        const el = $(prefix + '-' + i);
        if (el) { el.innerHTML = ''; el.className = ''; }
      }
    });
    ['eto-by-label','eto-bm-label','eto-bd-label'].forEach(id => {
      const el = $(id);
      if (el) el.textContent = id.includes('by') ? '生年' : (id.includes('bm') ? '生月' : '生日');
    });
    Eto.BRANCHES.forEach((_, i) => $('k-' + i).textContent = '');
  }

  function flash(msg) {
    const d = document.createElement('div');
    d.textContent = msg;
    d.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#2b1a0e;color:#fff;padding:8px 16px;border-radius:6px;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,.3);';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1600);
  }

})();
