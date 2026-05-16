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
    $('btn-print').addEventListener('click', () => window.print());
    $('btn-new').addEventListener('click', newRecord);
    $('btn-handan').addEventListener('click', (e) => {
      // 保存してから判断書へ
      if (!currentRecordId) {
        e.preventDefault();
        const r = save();
        if (r) location.href = 'handan.html?id=' + r.id;
      } else {
        // currentId 付きで遷移
        e.preventDefault();
        save();
        location.href = 'handan.html?id=' + currentRecordId;
      }
    });

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
    renderResult(r);
    return r;
  }

  // ===== 結果描画 =====
  function renderResult(r) {
    const K = Kyusei;

    // 上段4盤 (相談日): 変換後中宮で描画
    const cInt = r.consult.isInton;
    drawBan('ban-y', r.consult.displayYearCenter,  r.birth.honmeisei, r.consult.yearEto.branchIdx, false);
    drawBan('ban-m', r.consult.displayMonthCenter, r.birth.honmeisei, r.consult.monthEto.branchIdx, false);
    drawBan('ban-d', r.consult.displayDayCenter,   r.birth.honmeisei, r.consult.dayEto.branchIdx,  cInt);
    drawBan('ban-h', r.consult.displayHourCenter,  r.birth.honmeisei, r.consult.hourEto.branchIdx, cInt);
    // ボード下情報: 命式と同じく元の中宮を表示 (ボード自体の3x3グリッドが変換結果)
    $('ban-y-info').textContent = `${r.consult.yearEto.name} / ${K.STAR_NAMES[r.consult.yearCenter]}`;
    $('ban-m-info').textContent = `${r.consult.monthEto.name} / ${K.STAR_NAMES[r.consult.monthCenter]}`;
    $('ban-d-info').textContent = `${r.consult.dayEto.name} / ${K.STAR_NAMES[r.consult.dayCenter]}`;
    $('ban-h-info').textContent = `${r.consult.hourEto.name} / ${K.STAR_NAMES[r.consult.hourCenter]}`;

    // 下段4盤 (生年月日): 変換後中宮で描画
    const bInt = r.birth.isInton;
    drawBan('ban-by', r.birth.displayYearCenter,  r.birth.honmeisei, r.birth.yearEto.branchIdx, false);
    drawBan('ban-bm', r.birth.displayMonthCenter, r.birth.honmeisei, r.birth.monthEto.branchIdx, false);
    drawBan('ban-bd', r.birth.displayDayCenter,   r.birth.honmeisei, r.birth.dayEto.branchIdx,  bInt);
    drawBan('ban-bh', r.birth.displayHourCenter,  r.birth.honmeisei, r.birth.hourEto.branchIdx, bInt);
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
    $('m-naizou').innerHTML = r.bottom.naizou.kuraki_nengetsu;
    $('m-shukumei').value = r.bottom.naizou.shukumei_nengetsu;
  }

  // 3x3 盤の描画
  // periodBranchIdx: その盤の「期間の支」(年支/月支/日支/時支) のindex 0-11
  // isInton: 陰遁期間か (true なら12支の運行が逆になる)
  function drawBan(elId, centerStar, honmeiStar, periodBranchIdx, isInton) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = '';
    // ポジション index: 0:NW 1:N 2:NE 3:W 4:中宮 5:E 6:SW 7:S 8:SE
    const DRAW_ORDER = [8, 7, 6, 5, 4, 3, 2, 1, 0];
    const DIRS_KAKKA = { 0:'乾',1:'坎',2:'艮',3:'兌',4:'',5:'震',6:'坤',7:'離',8:'巽' };
    const DEFAULT_POS_STAR = Kyusei.DEFAULT_POSITION_STARS;
    const BRANCHES = window.Eto.BRANCHES;

    const stars = Kyusei.getPositionStars(centerStar);
    const honmeiPos = Kyusei.findPositionOfStar(centerStar, honmeiStar);
    const taichuPos = Kyusei.getTaichuPosition(honmeiPos);

    // 暗剣殺 (ア): 五黄が居るマスの真反対 (中宮=五黄の時は無し)
    // 破 (ハ): 中宮星(または五黄中宮時は中宮支)の本来の位置の真反対
    //   - 中宮 ≠ 五黄: 中宮星の後天定位の対冲
    //   - 中宮 = 五黄: 中宮支の本来の方位の対冲
    // 各干支の本来の方位 (position index 0:NW, 1:N, 2:NE, 3:W, 4:C, 5:E, 6:SW, 7:S, 8:SE)
    const BRANCH_NATURAL_POS = [1, 2, 2, 5, 8, 8, 7, 6, 6, 3, 0, 0];
    // 子=N(1), 丑=NE(2), 寅=NE(2), 卯=E(5), 辰=SE(8), 巳=SE(8),
    // 午=S(7), 未=SW(6), 申=SW(6), 酉=W(3), 戌=NW(0), 亥=NW(0)

    let ankenPos = null, haPos = null;
    // 暗剣殺: 五黄が居るマスの真反対 (中宮=五黄の盤ではなし)
    if (centerStar !== 5) {
      const gokoPos = Kyusei.findPositionOfStar(centerStar, 5);
      ankenPos = 8 - gokoPos;
    }
    // 破: 中宮支の本来の方位の真反対 (中宮支がない場合はなし)
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

      // 卦 (左上)
      const kakkaSpan = document.createElement('span');
      kakkaSpan.className = 'kakka';
      kakkaSpan.textContent = DIRS_KAKKA[pos];

      // 星 (中央大)
      const starSpan = document.createElement('span');
      starSpan.className = 'star';
      starSpan.textContent = Kyusei.STAR_NAMES[star];

      // 動的 12支 (右下):
      //   陽遁: 中宮(5)→乾(6)→兌(7)→艮(8)→離(9)→坎(1)→坤(2)→震(3)→巽(4) の順で +1
      //         offset = (defStar - 5 + 9) % 9
      //   陰遁: 中宮(5)→巽(4)→震(3)→坤(2)→坎(1)→離(9)→艮(8)→兌(7)→乾(6) の順で +1
      //         offset = (5 - defStar + 9) % 9
      let branchText = '';
      if (typeof periodBranchIdx === 'number') {
        const defStar = DEFAULT_POS_STAR[pos];
        const offset = isInton
          ? ((5 - defStar + 9) % 9)
          : ((defStar - 5 + 9) % 9);
        const branchIdx = ((periodBranchIdx + offset) % 12 + 12) % 12;
        branchText = BRANCHES[branchIdx];
      }
      const branchSpan = document.createElement('span');
      branchSpan.className = 'branch';
      branchSpan.textContent = branchText;

      cell.appendChild(kakkaSpan);
      cell.appendChild(starSpan);
      cell.appendChild(branchSpan);

      // 暗剣殺・破 マーク (右上)
      if (pos === ankenPos) {
        const m = document.createElement('span');
        m.className = 'mark anken';
        m.textContent = 'ア';
        cell.appendChild(m);
      }
      if (pos === haPos) {
        const m = document.createElement('span');
        m.className = 'mark ha';
        m.textContent = 'ハ';
        cell.appendChild(m);
      }

      el.appendChild(cell);
    });
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
      naizou: $('m-naizou').textContent,
      shukumei: $('m-shukumei').value
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
    // 内蔵・宿命 は compute() 内で常に最新の計算結果に上書きされる
    compute();
  }

  function newRecord() {
    if (currentRecordId && !confirm('現在のデータは保存されていません。新規作成しますか?')) return;
    currentRecordId = null;
    history.replaceState(null, '', location.pathname);
    ['f-name','f-gender','f-age','f-topic','m-shukumei'].forEach(id => $(id).value = '');
    $('m-naizou').textContent = '';
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
