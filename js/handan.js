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
          $('m-honnin').value = rec.handan.honnin || '';
          $('m-nengetsu').value = rec.handan.nengetsu || '';
          $('m-naizou').value = rec.handan.naizou || '';
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
    const fmtStarKyu = (starIdx, posIdx) => {
      const star = K.STAR_NAMES[starIdx] || '';
      const kyu = (typeof posIdx === 'number') ? K.POSITION_TO_KYU_NAME[posIdx] : '';
      return kyu ? `${star} ${kyu}` : star;
    };
    $('o-doukai-toshi').textContent   = fmtStarKyu(r.bottom.doukai.toshi,    r.bottom.doukai.toshiPos);
    $('o-hidoukai-toshi').textContent = fmtStarKyu(r.bottom.hidoukai.toshi,  r.bottom.hidoukai.toshiPos);
    $('o-doukai-tsuki').textContent   = fmtStarKyu(r.bottom.doukai.tsuki,    r.bottom.doukai.tsukiPos);
    $('o-hidoukai-tsuki').textContent = fmtStarKyu(r.bottom.hidoukai.tsuki,  r.bottom.hidoukai.tsukiPos);

    // 本命星が座する宮の運気判断
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

    // 内蔵法
    $('o-kuraki-nm').innerHTML  = r.bottom.naizou.kuraki_toshigetsu;
    $('o-shukumei-nm').innerHTML = r.bottom.naizou.shukumei_toshigetsu;
    $('o-kuraki-md').innerHTML  = r.bottom.naizou.kuraki_getsubi;
    $('o-shukumei-md').innerHTML = r.bottom.naizou.shukumei_getsubi;

    // 生月 性格と運勢
    renderSeigetsu(birth);
    // 生日 性格と運勢
    renderSeinichi(r.birth.dayEto.branch);
    // 星まつり
    renderSeimatsuri(r.birth.honmeisei, r.consult.yearCenter);
    // 二十八宿
    renderShuku(consult);
  }

  function renderKyuZasuru(toshiPos, tsukiPos) {
    const el = $('o-kyu-zasuru');
    if (!el) return;
    const KZ = window.KyuZasuruData;
    if (!KZ) { el.innerHTML = ''; return; }
    const toshiKyu = (typeof toshiPos === 'number') ? K.POSITION_TO_KYU_NAME[toshiPos] : null;
    const tsukiKyu = (typeof tsukiPos === 'number') ? K.POSITION_TO_KYU_NAME[tsukiPos] : null;
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
      honnin: $('m-honnin').value,
      nengetsu: $('m-nengetsu').value,
      naizou: $('m-naizou').value
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
