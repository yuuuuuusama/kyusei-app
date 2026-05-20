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
        // 判断書側で追加保持しているフィールドを復元
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

    // 同会・被同会
    $('o-doukai-toshi').textContent = K.STAR_NAMES[r.bottom.doukai.toshi];
    $('o-hidoukai-toshi').textContent = K.STAR_NAMES[r.bottom.hidoukai.toshi];
    $('o-doukai-tsuki').textContent = K.STAR_NAMES[r.bottom.doukai.tsuki];
    $('o-hidoukai-tsuki').textContent = K.STAR_NAMES[r.bottom.hidoukai.tsuki];

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

    // 内蔵法 — 蔵気/宿命 はそれぞれ年月(相談年盤+相談月盤) と 月日(相談月盤+相談日盤)
    $('o-kuraki-nm').innerHTML  = r.bottom.naizou.kuraki_toshigetsu;
    $('o-shukumei-nm').innerHTML = r.bottom.naizou.shukumei_toshigetsu;
    $('o-kuraki-md').innerHTML  = r.bottom.naizou.kuraki_getsubi;
    $('o-shukumei-md').innerHTML = r.bottom.naizou.shukumei_getsubi;
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
