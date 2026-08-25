// kantei-ext.js — 追加鑑定項目 (㉒〜㉛) と入力補助 (A-10)
// 既存の app.js / kantei.js を変更せず、詳細鑑定の追加カードを描画する拡張モジュール。
// app.js の renderDetail() から window.KanteiExt.render(r) が呼ばれる。
(function (global) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const Kyusei = global.Kyusei;
  const Eto = global.Eto;

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  const STAR = (n) => (Kyusei && Kyusei.STAR_NAMES[n]) || '';
  const KYU_NAME = (pos) => (Kyusei && Kyusei.POSITION_TO_KYU_NAME[pos]) || '';

  // 本命星が中宮(centerStar)の盤で座する宮名を返す (中宮なら「中央」)
  function honmeiKyu(centerStar, honmeisei) {
    if (honmeisei === centerStar) return '中央';
    const pos = Kyusei.findPositionOfStar(centerStar, honmeisei);
    return KYU_NAME(pos);
  }

  let _lastR = null;

  // ============================================================
  // ㉒ 姓名判断 (五格)
  // ============================================================
  function renderSeimei() {
    const el = $('o-seimei');
    if (!el) return;
    const SD = global.SeimeiData;
    if (!SD) { el.innerHTML = '<div class="ext-empty">(姓名判断データ未読込)</div>'; return; }
    const raw = ($('f-name') ? $('f-name').value : '').trim();
    if (!raw) {
      el.innerHTML = '<div class="ext-empty">「相談者氏名」を入力すると五格を自動算出します。姓と名の間に空白を入れると天格・人格・地格まで判定します（例: 山田 太郎）。</div>';
      return;
    }
    const parts = raw.split(/[\s　]+/).filter(Boolean);
    let sei, mei;
    if (parts.length >= 2) { sei = parts[0]; mei = parts.slice(1).join(''); }
    else { sei = ''; mei = parts[0]; }

    const chipFortune = (f) => {
      if (!f) return '';
      const k = f.kind || '';
      const cls = k === '大吉' ? 'f-daikichi' : k === '吉' ? 'f-kichi' : k === '半吉' ? 'f-hankichi' : k === '凶' ? 'f-kyo' : '';
      return `<span class="seimei-f ${cls}">${esc(k)}</span>`;
    };

    let html = '';
    if (sei) {
      const g = SD.gokaku(sei, mei);
      const row = (label, o, note) =>
        `<tr><th>${label}</th><td class="sm-num">${o && o.n != null ? o.n : '—'}</td>`
        + `<td>${o && o.fortune ? chipFortune(o.fortune) + ' <span class="sm-txt">' + esc(o.fortune.text || '') + '</span>' : '—'}</td>`
        + `<td class="sm-note">${note}</td></tr>`;
      html += '<table class="ks-table seimei-table"><thead><tr><th>格</th><th>画数</th><th>吉凶</th><th>意味</th></tr></thead><tbody>';
      html += row('天格', g.tenkaku, '家系・先祖から受け継ぐ運');
      html += row('人格', g.jinkaku, '性格・才能・中年運（最重要）');
      html += row('地格', g.chikaku, '幼年〜青年期・家庭運');
      html += row('外格', g.gaikaku, '対人・social・外的環境');
      html += row('総格', g.soukaku, '一生を通じた総合運（晩年）');
      html += '</tbody></table>';
      if (g.unknown && g.unknown.length) {
        html += `<div class="ext-note">※ 画数未収録の文字: ${esc(g.unknown.join('、'))}（総画から除外して計算）</div>`;
      }
    } else {
      const c = SD.count(mei);
      const f = SD.fortune(c.total);
      html += `<div class="seimei-single"><b>総画数: ${c.total}</b> ${chipFortune(f)} <span class="sm-txt">${esc(f && f.text || '')}</span></div>`;
      html += '<div class="ext-note">姓と名を空白で区切ると、天格・人格・地格・外格まで判定します。</div>';
      if (c.unknown && c.unknown.length) {
        html += `<div class="ext-note">※ 画数未収録の文字: ${esc(c.unknown.join('、'))}</div>`;
      }
    }
    el.innerHTML = html;
  }

  // ============================================================
  // ㉓ 納音
  // ============================================================
  function renderNacchin(r) {
    const el = $('o-nacchin');
    if (!el) return;
    const ND = global.NacchinData;
    if (!ND) { el.innerHTML = '<div class="ext-empty">(納音データ未読込)</div>'; return; }
    const pillars = [
      { label: '年柱(本命)', eto: r.birth.yearEto, main: true },
      { label: '日柱', eto: r.birth.dayEto }
    ];
    let html = '';
    pillars.forEach(p => {
      const n = ND.get(p.eto.stemIdx, p.eto.branchIdx);
      if (!n) return;
      html += `<div class="nacchin-card${p.main ? ' main' : ''}">`
        + `<div class="nc-head"><span class="nc-eto">${esc(p.eto.name)}</span> <span class="nc-lbl">${esc(p.label)}</span></div>`
        + `<div class="nc-name">${esc(n.name)}<span class="nc-yomi">（${esc(n.reading)}）</span> <span class="nc-elem">五行:${esc(n.element)}</span></div>`
        + `<div class="nc-text">${esc(n.text)}</div></div>`;
    });
    el.innerHTML = html || '<div class="ext-empty">(該当なし)</div>';
  }

  // ============================================================
  // ㉔ 本命星別 開運指針
  // ============================================================
  function renderKaiun(r) {
    const el = $('o-kaiun');
    if (!el) return;
    const KS = global.KaiunShishin;
    if (!KS) { el.innerHTML = '<div class="ext-empty">(開運指針データ未読込)</div>'; return; }
    const d = KS.get(r.birth.honmeisei);
    if (!d) { el.innerHTML = '<div class="ext-empty">(該当なし)</div>'; return; }
    const chips = (arr, cls) => (arr || []).map(x => `<span class="kaiun-chip ${cls}">${esc(x)}</span>`).join('');
    const row = (label, arr, cls) => `<tr><th>${label}</th><td>${chips(arr, cls)}</td></tr>`;
    let html = `<div class="kaiun-head"><b>${esc(d.name)}</b>（五行:${esc(d.element)}）　<span class="kaiun-kw">${esc(d.keyword || '')}</span></div>`;
    html += '<table class="ks-table kaiun-table"><tbody>';
    html += row('ラッキーカラー', d.colors, 'c-color');
    html += row('吉方位', d.directions, 'c-dir');
    html += row('吉数', d.numbers, 'c-num');
    html += row('開運アイテム', d.items, 'c-item');
    html += row('開運の食', d.foods, 'c-food');
    html += '</tbody></table>';
    if (d.action) html += `<div class="kaiun-action">✦ ${esc(d.action)}</div>`;
    el.innerHTML = html;
  }

  // ============================================================
  // ㉕ 事象別アドバイス
  // ============================================================
  function renderJishou(r) {
    const el = $('o-jishou');
    if (!el) return;
    const JD = global.JishouData;
    if (!JD) { el.innerHTML = '<div class="ext-empty">(事象別データ未読込)</div>'; return; }
    const star = r.birth.honmeisei;
    let html = `<div class="ext-note">本命星「${STAR(star)}」の傾向にもとづくテーマ別の指針です。</div>`;
    html += '<table class="ks-table jishou-table"><tbody>';
    JD.THEMES.forEach(t => {
      const text = JD.advice(t.key, star);
      html += `<tr><th class="js-theme">${esc(t.label)}</th><td class="js-text">${esc(text)}</td></tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // ============================================================
  // ㉖ 健康・身体の象意
  // ============================================================
  function renderKenkou(r) {
    const el = $('o-kenkou');
    if (!el) return;
    const KD = global.KenkouData;
    if (!KD) { el.innerHTML = '<div class="ext-empty">(健康象意データ未読込)</div>'; return; }
    const d = KD.get(r.birth.honmeisei);
    if (!d) { el.innerHTML = '<div class="ext-empty">(該当なし)</div>'; return; }
    const list = (arr) => '<ul class="ext-ul">' + (arr || []).map(x => `<li>${esc(x)}</li>`).join('') + '</ul>';
    let html = `<div class="kenkou-head"><b>${esc(d.name)}</b>（五行:${esc(d.element)}）</div>`;
    html += `<div class="kenkou-organs"><b>対応する身体・臓腑:</b> ${(d.organs || []).map(o => `<span class="kaiun-chip c-organ">${esc(o)}</span>`).join('')}</div>`;
    html += '<div class="kenkou-cols">';
    html += `<div class="kk-col"><div class="kk-cap">なりやすい不調傾向</div>${list(d.tendencies)}</div>`;
    html += `<div class="kk-col"><div class="kk-cap">養生・アドバイス</div>${list(d.care)}</div>`;
    html += '</div>';
    html += '<div class="ext-note">※ 気学の象意にもとづく養生の目安であり、診断・医療行為ではありません。</div>';
    el.innerHTML = html;
  }

  // ============================================================
  // ㉗ 9年運気グラフ
  // ============================================================
  const PHASE_SCORE = { '旺気': 5, '相気': 4, '休気': 3, '囚気': 2, '死気': 1 };
  function renderUnkiGraph(r, consult) {
    const el = $('o-unki-graph');
    if (!el) return;
    const DU = global.DaiUn;
    if (!DU) { el.innerHTML = '<div class="ext-empty">(大運データ未読込)</div>'; return; }
    const series = DU.phaseSeries(consult, r.birth.honmeisei, 9);
    const W = 40, H = 150, PAD = 26, GAP = 6, TOP = 20;
    const n = series.length;
    const chartW = n * W;
    const svgW = chartW + PAD * 2;
    const svgH = TOP + H + 54;
    const baseY = TOP + H + 8;
    const pts = [];
    let bars = '', labels = '';
    series.forEach((s, i) => {
      const score = s.phase ? (PHASE_SCORE[s.phase.name] || 3) : 3;
      const kind = s.phase ? s.phase.kind : 'neutral';
      const bh = (score / 5) * H;
      const x = PAD + i * W + GAP / 2;
      const bw = W - GAP;
      const y = baseY - bh;
      bars += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" class="ug-bar ug-${kind}"></rect>`;
      bars += `<text x="${x + bw/2}" y="${y - 4}" class="ug-phase">${esc(s.phase ? s.phase.name : '—')}</text>`;
      labels += `<text x="${x + bw/2}" y="${baseY + 16}" class="ug-year">${s.year}</text>`;
      labels += `<text x="${x + bw/2}" y="${baseY + 30}" class="ug-center">${esc(s.centerName)}</text>`;
      pts.push([x + bw/2, y]);
    });
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    let html = `<div class="ug-wrap"><svg viewBox="0 0 ${svgW} ${svgH}" class="unki-graph" preserveAspectRatio="xMidYMid meet">`;
    html += `<line x1="${PAD}" y1="${baseY}" x2="${svgW - PAD/2}" y2="${baseY}" class="ug-axis"></line>`;
    html += bars;
    html += `<path d="${path}" class="ug-line" fill="none"></path>`;
    pts.forEach(p => { html += `<circle cx="${p[0]}" cy="${p[1]}" r="2.5" class="ug-dot"></circle>`; });
    html += labels;
    html += '</svg></div>';
    html += '<div class="ug-legend"><span class="ug-key ug-good"></span>旺気・相気(伸)　<span class="ug-key ug-neutral"></span>休気(調整)　<span class="ug-key ug-bad"></span>囚気・死気(守)</div>';
    el.innerHTML = html;
  }

  // ============================================================
  // ㉘ 今日・今月の過ごし方
  // ============================================================
  function renderKyou(r, consult) {
    const el = $('o-kyou');
    if (!el) return;
    const KZ = global.KyuZasuruData;
    const honmeisei = r.birth.honmeisei;
    const W = ['日','月','火','水','木','金','土'][consult.getDay()];
    const dateStr = `${consult.getFullYear()}/${consult.getMonth()+1}/${consult.getDate()}(${W})`;

    const block = (title, center, eto) => {
      const kyu = honmeiKyu(center, honmeisei);
      const z = (KZ && kyu !== '中央') ? KZ.get(kyu) : null;
      const centerTxt = `${eto ? eto.name + ' / ' : ''}中宮 ${STAR(center)}`;
      let inner = `<div class="kyou-kyu">本命星の位置: <b>${esc(kyu)}</b></div>`;
      if (kyu === '中央') {
        inner += '<div class="kyou-text">本命星が中宮に入る＝八方塞がり気味。動かず現状維持・種まきに徹すると吉。</div>';
      } else if (z) {
        inner += `<div class="kyou-text">${esc(z)}</div>`;
      }
      return `<div class="kyou-block"><div class="kyou-cap">${esc(title)}</div><div class="kyou-meta">${esc(centerTxt)}</div>${inner}</div>`;
    };

    let html = `<div class="kyou-date">基準日: <b>${esc(dateStr)}</b></div>`;
    html += '<div class="kyou-cols">';
    html += block('今日の過ごし方（日盤）', r.consult.dayCenter, r.consult.dayEto);
    html += block('今月の過ごし方（月盤）', r.consult.monthCenter, r.consult.monthEto);
    html += '</div>';
    const KS = global.KaiunShishin;
    if (KS) { const d = KS.get(honmeisei); if (d && d.action) html += `<div class="kaiun-action">✦ 今日の一手: ${esc(d.action)}</div>`; }
    el.innerHTML = html;
  }

  // ============================================================
  // ㉙ 家族・グループ相性マップ
  // ============================================================
  let kazokuList = []; // {name, star}
  function setupKazoku() {
    const add = $('btn-kazoku-add');
    const clr = $('btn-kazoku-clear');
    const sel = $('kazoku-star');
    if (sel && !sel.options.length && global.Aishou) {
      sel.appendChild(new Option('本命星を選択', ''));
      global.Aishou.ALL_STARS.forEach(s => sel.appendChild(new Option(s.name, String(s.v))));
    }
    if (add) add.addEventListener('click', () => {
      const name = ($('kazoku-name') ? $('kazoku-name').value.trim() : '') || `家族${kazokuList.length + 1}`;
      const star = sel ? parseInt(sel.value, 10) : NaN;
      if (!star) { alert('本命星を選択してください'); return; }
      kazokuList.push({ name, star });
      if ($('kazoku-name')) $('kazoku-name').value = '';
      renderKazoku(_lastR);
    });
    if (clr) clr.addEventListener('click', () => { kazokuList = []; renderKazoku(_lastR); });
  }
  function renderKazoku(r) {
    const el = $('o-kazoku');
    if (!el || !global.Aishou) return;
    const AS = global.Aishou;
    // 相談者を先頭に
    const people = [];
    if (r) {
      const selfName = ($('f-name') && $('f-name').value.trim()) || '相談者';
      people.push({ name: selfName, star: r.birth.honmeisei, self: true });
    }
    kazokuList.forEach(k => people.push(k));
    if (people.length < 2) {
      el.innerHTML = '<div class="ext-note">相談者を計算し、家族・関係者の本命星を追加すると、全員の相性マトリクスを表示します。</div>';
      return;
    }
    let html = '<div class="kazoku-scroll"><table class="ks-table kazoku-table"><thead><tr><th>＼</th>';
    people.forEach(p => { html += `<th>${esc(p.name)}<br><small>${STAR(p.star)}</small></th>`; });
    html += '</tr></thead><tbody>';
    people.forEach(a => {
      html += `<tr><th>${esc(a.name)}<br><small>${STAR(a.star)}</small></th>`;
      people.forEach(b => {
        if (a === b) { html += '<td class="kz-self">—</td>'; return; }
        const rel = AS.relate(a.star, b.star);
        const cls = rel.kind === 'good' ? 'kz-good' : rel.kind === 'bad' ? 'kz-bad' : 'kz-neutral';
        html += `<td class="${cls}"><span class="kz-name">${esc(rel.name)}</span></td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    html += '<div class="ext-note">縦の人から見た横の人への関係（五行の比和・相生・相剋）。緑=吉/相生・比和、赤=注意/相剋。</div>';
    el.innerHTML = html;
  }

  // ============================================================
  // ㉚ 祐気取りガイド (静的)
  // ============================================================
  let _yukiRendered = false;
  function renderYuki() {
    const el = $('o-yuki');
    if (!el || _yukiRendered) return;
    const YD = global.YukiData;
    if (!YD) { el.innerHTML = '<div class="ext-empty">(祐気取りデータ未読込)</div>'; return; }
    const G = YD.GENERAL || {};
    let html = '<div class="yuki-general">';
    const gi = (label, v) => v ? `<div class="yg-item"><span class="yg-lbl">${label}</span><span class="yg-val">${esc(v)}</span></div>` : '';
    html += gi('祐気取りとは', G.intro);
    html += gi('いつ行く', G.when);
    html += gi('距離と回数', G.count);
    html += gi('効果の期間', G.period);
    html += gi('得られる作用', G.effect);
    html += gi('注意', G.caution);
    html += '</div>';
    html += '<div class="yuki-methods">';
    (YD.METHODS || []).forEach(m => {
      html += `<div class="yuki-method"><div class="ym-head">${esc(m.label)}</div>`;
      if (m.what) html += `<div class="ym-what">${esc(m.what)}</div>`;
      if (m.steps && m.steps.length) html += '<ol class="ym-steps">' + m.steps.map(s => `<li>${esc(s)}</li>`).join('') + '</ol>';
      if (m.note) html += `<div class="ym-note">コツ: ${esc(m.note)}</div>`;
      html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
    _yukiRendered = true;
  }

  // ============================================================
  // ㉛ 凶方位の対処法 (静的)
  // ============================================================
  let _kyohouiRendered = false;
  function renderKyohoui() {
    const el = $('o-kyohoui');
    if (!el || _kyohouiRendered) return;
    const KD = global.KyohouiData;
    if (!KD) { el.innerHTML = '<div class="ext-empty">(凶方位データ未読込)</div>'; return; }
    let html = '<table class="ks-table kyohoui-table"><thead><tr><th>凶方位</th><th>意味</th><th>作用</th><th>対処法</th></tr></thead><tbody>';
    KD.ORDER.forEach(k => {
      const d = KD.get(k);
      if (!d) return;
      html += `<tr><th class="kh-name">${esc(d.label)}</th><td>${esc(d.meaning)}</td><td>${esc(d.effect)}</td><td class="kh-remedy">${esc(d.remedy)}</td></tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
    _kyohouiRendered = true;
  }

  // ============================================================
  // 自動判断 — 全体の計算結果からの自動所見（AI は使っていない）
  // ============================================================
  const VERDICT = {
    good:    { label: '伸展期', text: '全体に運気は上向き。攻めに転じてよい好機で、新規・拡大・人脈づくりに向く時期です。' },
    neutral: { label: '調整期', text: '整えと充電の時期。大きく広げるより、内実を固め足場を整えると次の伸びにつながります。' },
    bad:     { label: '守勢期', text: '守りと整理の時期。大きな決断・移動は慎重に。無理をせず力を蓄えるのが結果的に吉です。' }
  };
  function clip(s, n) { s = (s || '').toString(); return s.length > n ? s.slice(0, n) + '…' : s; }

  function renderSougouShindan(r, consult) {
    const el = $('o-sougou-shindan');
    if (!el) return;
    const honmeisei = r.birth.honmeisei;
    const DU = global.DaiUn;
    const KZ = global.KyuZasuruData;

    // 本年の位相 → 総評トーン
    let phase = null;
    if (DU) phase = DU.phaseOf(honmeisei, r.consult.yearCenter);
    const kind = phase ? phase.kind : 'neutral';
    const v = VERDICT[kind] || VERDICT.neutral;

    let html = `<div class="ss-verdict ss-${kind}"><span class="ss-badge">${esc(v.label)}</span>`
      + `<span class="ss-lead">${esc(v.text)}</span></div>`;

    const items = [];
    // 基本
    items.push(`<b>基本</b> 本命星 <em>${STAR(honmeisei)}</em>／月命星 ${STAR(r.birth.getsumeisei)}／宮傾斜 ${esc(r.bottom.keisha)}`);
    // 本年の運気
    if (phase) items.push(`<b>本年の運気</b> <em>${esc(phase.name)}</em> — ${esc(phase.desc)}`);
    // 年同会・月同会
    const toshiPos = r.bottom.doukai.toshiPos, tsukiPos = r.bottom.doukai.tsukiPos;
    if (typeof toshiPos === 'number') {
      const kyu = KYU_NAME(toshiPos);
      const z = (KZ && kyu) ? KZ.get(kyu) : null;
      items.push(`<b>年同会</b> ${esc(kyu)}（同会星 ${STAR(r.bottom.doukai.toshi)}）${z ? ' — ' + esc(clip(z, 46)) : ''}`);
    }
    if (typeof tsukiPos === 'number' && tsukiPos !== toshiPos) {
      const kyu = KYU_NAME(tsukiPos);
      const z = (KZ && kyu) ? KZ.get(kyu) : null;
      items.push(`<b>月同会</b> ${esc(kyu)}（同会星 ${STAR(r.bottom.doukai.tsuki)}）${z ? ' — ' + esc(clip(z, 46)) : ''}`);
    }
    // 厄年
    const YK = global.Yakudoshi;
    if (YK && global.SolarTerms) {
      try {
        const sm = global.SolarTerms.getSetsuMonth(consult);
        const yi = YK.upcoming(honmeisei, sm.setsuYear, 3);
        const now = yi.upcoming.find(x => x.yearsAway === 0);
        if (now) items.push(`<b>厄年</b> 本年は<em class="ss-warn">${esc(now.kind)}</em>に該当（本厄年=${now.honyakuYear}）。参拝・お祓いの検討を。`);
      } catch (e) {}
    }
    // 姓名判断(総格)
    const SD = global.SeimeiData;
    const nameRaw = ($('f-name') ? $('f-name').value : '').trim();
    if (SD && nameRaw) {
      const parts = nameRaw.split(/[\s　]+/).filter(Boolean);
      let so;
      if (parts.length >= 2) so = SD.gokaku(parts[0], parts.slice(1).join('')).soukaku;
      else { const c = SD.count(parts[0]); so = { n: c.total, fortune: SD.fortune(c.total) }; }
      if (so && so.fortune) items.push(`<b>姓名（総格）</b> ${so.n}画 <em>${esc(so.fortune.kind)}</em> — ${esc(so.fortune.text)}`);
    }
    // 開運の一手
    const KS = global.KaiunShishin;
    if (KS) { const d = KS.get(honmeisei); if (d && d.action) items.push(`<b>開運の一手</b> ${esc(d.action)}`); }

    html += '<ul class="ss-list">' + items.map(x => `<li>${x}</li>`).join('') + '</ul>';
    html += '<div class="ss-foot">※ 計算結果からの自動所見です。最終的な総合判断は下欄に鑑定者がご記入ください。</div>';
    el.innerHTML = html;
  }

  // ============================================================
  // メイン: 計算結果ごとに全カードを描画
  // ============================================================
  function render(r, birth, consult) {
    _lastR = r;
    if (!consult) consult = new Date($('f-consult') && $('f-consult').value || Date.now());
    try { renderSougouShindan(r, consult); } catch (e) { console.warn('sougou-shindan', e); }
    try { renderSeimei(); } catch (e) { console.warn('seimei', e); }
    try { renderNacchin(r); } catch (e) { console.warn('nacchin', e); }
    try { renderKaiun(r); } catch (e) { console.warn('kaiun', e); }
    try { renderJishou(r); } catch (e) { console.warn('jishou', e); }
    try { renderKenkou(r); } catch (e) { console.warn('kenkou', e); }
    try { renderUnkiGraph(r, consult); } catch (e) { console.warn('unki', e); }
    try { renderKyou(r, consult); } catch (e) { console.warn('kyou', e); }
    try { renderKazoku(r); } catch (e) { console.warn('kazoku', e); }
    renderYuki();
    renderKyohoui();
    updateKazoedoshi(r, consult);
  }

  // ============================================================
  // A-10: 入力補助 (今日ボタン・数え年・姓名の即時反映)
  // ============================================================
  function updateKazoedoshi(r, consult) {
    const el = $('o-kazoe');
    if (!el) return;
    const by = r.birth.date.getFullYear();
    const cy = consult.getFullYear();
    const kazoe = cy - by + 1;
    el.textContent = kazoe > 0 ? `数え ${kazoe}` : '';
  }

  function setupInputHelpers() {
    // 「今日」ボタン: 相談日を現在時刻に
    const btn = $('btn-today');
    if (btn) btn.addEventListener('click', () => {
      const h = $('f-consult');
      if (!h) return;
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      h.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      h.dispatchEvent(new Event('dt-picker-set'));
      h.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // 氏名を変えたら姓名判断だけ即時更新 (計算不要)
    const nameEl = $('f-name');
    if (nameEl) nameEl.addEventListener('input', () => { try { renderSeimei(); } catch (e) {} });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupInputHelpers();
    setupKazoku();
    renderYuki();
    renderKyohoui();
  });

  global.KanteiExt = { render, renderSeimei, renderKazoku };
})(typeof window !== 'undefined' ? window : globalThis);
