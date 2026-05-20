// handan.js
// 判断書ページ用のJS

(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const K = window.Kyusei;
  const Kantei = window.Kantei;
  const Storage = window.Storage;

  let currentRecordId = null;
  let currentRecord = null;

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      const rec = Storage.get(id);
      if (rec) {
        currentRecordId = id;
        currentRecord = rec;
        if (rec.handan) {
          $('m-soudan').value = rec.handan.soudan || '';
          $('m-honnin').value = rec.handan.honnin || '';
          $('m-nengetsu').value = rec.handan.nengetsu || '';
          $('m-naizou').value = rec.handan.naizou || '';
          $('m-sougou').value = rec.handan.sougou || '';
        }
        recalc();
      } else {
        $('o-meta').textContent = '※ 該当する鑑定データが見つかりません';
      }
    } else {
      $('o-meta').textContent = '※ 鑑定書ページから「判断書へ」ボタンで遷移してください';
    }
    $('btn-recalc').addEventListener('click', recalc);
    $('btn-save').addEventListener('click', save);
    $('btn-print').addEventListener('click', () => window.print());
    $('btn-back').addEventListener('click', (e) => {
      if (currentRecordId) {
        e.preventDefault();
        location.href = 'index.html?id=' + currentRecordId;
      }
    });
  });

  function recalc() {
    if (!currentRecord) return;
    if (!currentRecord.birth) {
      $('o-meta').textContent = '※ 生年月日が登録されていません';
      return;
    }
    const birth = new Date(currentRecord.birth);
    const consult = new Date(currentRecord.consult || Date.now());
    const r = Kantei.computeKantei(birth, consult);

    $('o-meta').textContent = `${currentRecord.name || '(無名)'} | 生年: ${formatDate(birth)} | 相談: ${formatDate(consult)} | 本命: ${K.STAR_NAMES[r.birth.honmeisei]} 月命: ${K.STAR_NAMES[r.birth.getsumeisei]}`;

    // 同会・被同会 (九星 + 宮)
    // 年同会・月同会: 本命星が該当盤で座する宮 + 同会星
    // 年被同会・月被同会: 本命星の定位/年盤位置に座する星 + 宮
    const fmtStarKyu = (starIdx, posIdx) => {
      const star = K.STAR_NAMES[starIdx] || '';
      const kyu = (typeof posIdx === 'number') ? K.POSITION_TO_KYU_NAME[posIdx] : '';
      return kyu ? `${star} ${kyu}` : star;
    };
    const fmtDoukai = (starIdx, posIdx) => {
      const star = K.STAR_NAMES[starIdx] || '';
      const kyu = (typeof posIdx === 'number') ? K.POSITION_TO_KYU_NAME[posIdx] : '';
      return kyu ? `本命星 ${kyu}に座する時 — ${star}` : star;
    };
    $('o-doukai-toshi').textContent   = fmtDoukai(r.bottom.doukai.toshi,    r.bottom.doukai.toshiPos);
    $('o-hidoukai-toshi').textContent = fmtStarKyu(r.bottom.hidoukai.toshi, r.bottom.hidoukai.toshiPos);
    $('o-doukai-tsuki').textContent   = fmtDoukai(r.bottom.doukai.tsuki,    r.bottom.doukai.tsukiPos);
    $('o-hidoukai-tsuki').textContent = fmtStarKyu(r.bottom.hidoukai.tsuki, r.bottom.hidoukai.tsukiPos);

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

    // 内蔵法
    $('o-kuraki-nm').innerHTML  = r.bottom.naizou.kuraki_toshigetsu;
    $('o-shukumei-nm').innerHTML = r.bottom.naizou.shukumei_toshigetsu;
    $('o-kuraki-md').innerHTML  = r.bottom.naizou.kuraki_getsubi;
    $('o-shukumei-md').innerHTML = r.bottom.naizou.shukumei_getsubi;

    // 生月 性格と運勢
    renderSeigetsu(birth);
    // 生日 性格と運勢
    renderSeinichi(r.birth.dayEto.branch);
    // 本命星・月命星 象意
    renderKyuseiMeaning(r.birth.honmeisei, r.birth.getsumeisei);
    // 十干
    renderKan(r.birth);
    // 星まつり
    renderSeimatsuri(r.birth.honmeisei, r.consult.yearCenter);
    // 二十八宿
    renderShuku(consult);
    // 本命殺気
    renderSakki(r.birth.honmeisei);
    // 方位象意
    renderHoui();
    // 五行表
    renderGogyou();
    // 秘図
    renderHizu();
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

  function renderKyuseiMeaning(honmeisei, getsumeisei) {
    const KMD = window.KyuseiMeaningData;
    if (!KMD) return;
    function fmt(starIdx, label) {
      const m = KMD.get(starIdx);
      if (!m) return '';
      const kw = m.keywords.map(k => `<li>${escapeHtml(k)}</li>`).join('');
      return `<div class="kyusei-meaning"><h4>${label}：${escapeHtml(m.name)} (${escapeHtml(m.kyu)})</h4>` +
             `<div class="kyusei-meta">${escapeHtml(m.season)}・${escapeHtml(m.element)}・${escapeHtml(m.person)}・${escapeHtml(m.direction)}　／　神仏: ${escapeHtml(m.kami || '')}</div>` +
             `<ul>${kw}</ul></div>`;
    }
    $('o-honmei-meaning').innerHTML = fmt(honmeisei, '本命星');
    $('o-getsumei-meaning').innerHTML = fmt(getsumeisei, '月命星');
  }

  function renderKan(birthData) {
    const KD = window.KanData;
    if (!KD) return;
    // 生年/生月/生日/生時 の天干 (eto.name の1文字目)
    const rows = [
      { label: '生年', name: birthData.yearEto.name },
      { label: '生月', name: birthData.monthEto.name },
      { label: '生日', name: birthData.dayEto.name },
      { label: '生時', name: birthData.hourEto.name }
    ];
    let html = '<table class="kan-table" style="width:100%;border-collapse:collapse;font-size:11px;font-family:var(--font-jp);">';
    html += '<thead><tr style="background:#f8f0d8;"><th>区分</th><th>干支</th><th>天</th><th>地</th><th>人</th><th>性情</th><th>体</th><th>物</th><th>動の吉凶</th></tr></thead><tbody>';
    rows.forEach(row => {
      const kan = row.name && row.name.length > 0 ? row.name.charAt(0) : '';
      const d = KD.get(kan);
      if (d) {
        html += `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.name)}</td>` +
                `<td>${escapeHtml(d.ten)}</td><td>${escapeHtml(d.chi)}</td><td>${escapeHtml(d.jin)}</td>` +
                `<td>${escapeHtml(d.seijou)}</td><td>${escapeHtml(d.body)}</td><td>${escapeHtml(d.mono)}</td>` +
                `<td>${escapeHtml(d.kichikyo)}</td></tr>`;
      } else {
        html += `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.name)}</td><td colspan="7">—</td></tr>`;
      }
    });
    html += '</tbody></table>';
    $('o-kan-block').innerHTML = html;
  }

  function renderSeimatsuri(honmeisei, consultYearCenter) {
    const SMD = window.SeimatsuriData;
    if (!SMD) return;
    const idx = SMD.getYouseiIndex(honmeisei, consultYearCenter);
    let html = '';
    if (idx !== null) {
      const cur = SMD.get(idx);
      if (cur) {
        html += `<div class="seimatsuri-current"><b>本年の曜星: ${escapeHtml(cur.star)}（${escapeHtml(cur.period)}）</b><div>${escapeHtml(cur.text)}</div></div>`;
      }
    }
    html += '<table class="seimatsuri-table" style="width:100%;border-collapse:collapse;font-size:11px;font-family:var(--font-jp);margin-top:6px;">';
    html += '<thead><tr style="background:#f8f0d8;"><th>曜星</th><th>運気</th><th>説明</th></tr></thead><tbody>';
    SMD.list.forEach((it, i) => {
      const cur = (i === idx) ? ' style="background:#fff4d6;"' : '';
      html += `<tr${cur}><td>${escapeHtml(it.star)}</td><td>${escapeHtml(it.period)}</td><td>${escapeHtml(it.text)}</td></tr>`;
    });
    html += '</tbody></table>';
    $('o-seimatsuri').innerHTML = html;
  }

  function renderShuku(consult) {
    const ND = window.NijuhasshukuData;
    if (!ND) return;
    const s = ND.getShuku(consult);
    $('o-shuku').innerHTML = `<b>${escapeHtml(s.name)}宿</b>：${escapeHtml(s.text)}`;
  }

  function renderSakki(honmeisei) {
    const HD = window.HouiData;
    if (!HD) return;
    const s = HD.getSakki(honmeisei);
    if (s) {
      $('o-sakki-byouki').textContent = s.byouki;
      $('o-sakki-shippai').textContent = s.shippai;
      $('o-sakki-jisatsu').textContent = s.jisatsu;
    }
  }

  function renderHoui() {
    const HD = window.HouiData;
    if (!HD) return;
    const tbody = $('o-houi-tbody');
    tbody.innerHTML = '';
    const POS_NAME = { 1:'北/坎', 2:'南西/坤', 3:'東/震', 4:'南東/巽', 5:'中央', 6:'北西/乾', 7:'西/兌', 8:'北東/艮', 9:'南/離' };
    for (let i = 1; i <= 9; i++) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="background:#f8f0d8;font-weight:bold;text-align:center;">${i}<br>${POS_NAME[i]}</td>` +
                     `<td>${escapeHtml(HD.getAnken(i))}</td>` +
                     `<td>${escapeHtml(HD.getKichi(i))}</td>` +
                     `<td>${escapeHtml(HD.getKasou(i))}</td>`;
      tbody.appendChild(tr);
    }
  }

  function renderGogyou() {
    const GD = window.GogyouData;
    if (!GD) return;
    const head = $('o-gogyou-head');
    const tbody = $('o-gogyou-tbody');
    head.innerHTML = '<th style="background:#f8f0d8;padding:2px 4px;border:1px solid #888;">行</th>' +
      GD.cols.map(c => `<th style="background:#f8f0d8;padding:2px 4px;border:1px solid #888;">${escapeHtml(c)}</th>`).join('');
    tbody.innerHTML = '';
    Object.keys(GD.rows).forEach(elt => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="background:#f8f0d8;padding:2px 4px;border:1px solid #888;font-weight:bold;">${escapeHtml(elt)}</td>` +
        GD.rows[elt].map(v => `<td style="padding:2px 4px;border:1px solid #888;">${escapeHtml(v)}</td>`).join('');
      tbody.appendChild(tr);
    });
  }

  function renderHizu() {
    const HD = window.HizuData;
    if (!HD) return;
    const block = $('o-hizu-block');
    let html = '';
    HD.keys.forEach(key => {
      const h = HD.get(key);
      if (!h) return;
      html += `<details class="hizu-item" style="margin:4px 0;border:1px solid #ccc;">`;
      html += `<summary style="background:#f8f0d8;padding:4px 8px;font-family:var(--font-jp);cursor:pointer;">${escapeHtml(h.title)}${h.note ? ' <span style="color:#666;font-size:10px;">('+escapeHtml(h.note)+')</span>' : ''}</summary>`;
      html += '<div style="padding:6px;">';
      html += '<table class="hizu-table" style="width:100%;border-collapse:collapse;font-size:10px;font-family:var(--font-jp);">';
      // 3x3 layout: 4-9-2 / 3-5-7 / 8-1-6
      const layout = [[4,9,2],[3,5,7],[8,1,6]];
      for (const row of layout) {
        html += '<tr>';
        for (const p of row) {
          const v = h.cells[p] || '';
          html += `<td style="border:1px solid #888;padding:4px;vertical-align:top;width:33.3%;"><b>${p}</b><br>${escapeHtml(v)}</td>`;
        }
        html += '</tr>';
      }
      html += '</table></div></details>';
    });
    block.innerHTML = html;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  }

  function save() {
    if (!currentRecordId) {
      alert('まず鑑定書ページで保存してから判断書を編集してください');
      return;
    }
    currentRecord.handan = {
      soudan: $('m-soudan').value,
      honnin: $('m-honnin').value,
      nengetsu: $('m-nengetsu').value,
      naizou: $('m-naizou').value,
      sougou: $('m-sougou').value
    };
    Storage.upsert(currentRecord);
    flash('保存しました');
  }

  function formatDate(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function flash(msg) {
    const d = document.createElement('div');
    d.textContent = msg;
    d.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#2b1a0e;color:#fff;padding:8px 16px;border-radius:6px;z-index:1000;';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1500);
  }
})();
