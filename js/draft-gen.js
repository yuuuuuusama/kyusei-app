// draft-gen.js — 判断書ドラフト生成 (ローカル合成)
//   既存のデータ (KyuZasuruData / KeishaData / GemmeiData / DaiUn / Senjitsu etc.)
//   と Kantei 結果を組み合わせて、本人運気・年月運・内蔵・総合のドラフトを生成する。
(function (global) {
  'use strict';
  const Kyusei = global.Kyusei;
  const D = () => ({
    KZ: global.KyuZasuruData,
    KD: global.KeishaData,
    GD: global.GemmeiData,
    DU: global.DaiUn,
    SJ: global.Senjitsu,
    UT: global.UnTables,
    HA: global.HouiAnalysis,
    SK: global.ShichijuniKou,
    YK: global.Yakudoshi
  });

  function strip(s) { return (s || '').toString().replace(/<[^>]+>/g, ''); }
  function star(n) { return Kyusei.STAR_NAMES[n] || ''; }

  // ---- 本人運気 ----
  function draftHonnin(r) {
    const { KZ, KD, GD } = D();
    const lines = [];
    const honName = star(r.birth.honmeisei);
    const gemName = star(r.birth.getsumeisei);
    const keisha = r.bottom.keisha;
    lines.push(`本命星: ${honName}　月命星: ${gemName}　宮傾斜: ${keisha}`);
    lines.push('');
    if (KD) {
      const items = KD.get(keisha);
      if (items && items.length) {
        lines.push('【宮傾斜の象意】');
        items.slice(0, 4).forEach(t => lines.push('・' + t));
        lines.push('');
      }
    }
    if (GD) {
      const text = GD.get(r.birth.getsumeisei);
      if (text) {
        lines.push('【月命星(対外面)】');
        lines.push(text);
        lines.push('');
      }
    }
    lines.push('【所見(要編集)】');
    lines.push(`${honName}の本性に${keisha}が加わり、表向きの行動は${gemName}の質を帯びる。`);
    return lines.join('\n');
  }

  // ---- 年月運 ----
  function draftNengetsu(r) {
    const { KZ, DU } = D();
    const lines = [];
    const honName = star(r.birth.honmeisei);

    if (DU) {
      const p = DU.phaseOf(r.birth.honmeisei, r.consult.yearCenter);
      if (p) {
        lines.push(`【本年の位相: ${p.name}】`);
        lines.push(p.desc);
        lines.push('');
      }
    }

    const toshiKyu = (typeof r.bottom.doukai.toshiPos === 'number')
      ? Kyusei.POSITION_TO_KYU_NAME[r.bottom.doukai.toshiPos] : null;
    const tsukiKyu = (typeof r.bottom.doukai.tsukiPos === 'number')
      ? Kyusei.POSITION_TO_KYU_NAME[r.bottom.doukai.tsukiPos] : null;
    const toshiDoukai = star(r.bottom.doukai.toshi);
    const tsukiDoukai = star(r.bottom.doukai.tsuki);

    if (toshiKyu) {
      lines.push(`【年同会: ${honName} → ${toshiKyu} (同会星 ${toshiDoukai})】`);
      const z = KZ ? KZ.get(toshiKyu) : null;
      if (z) lines.push(z);
      lines.push('');
    }
    if (tsukiKyu && tsukiKyu !== toshiKyu) {
      lines.push(`【月同会: ${tsukiKyu} (同会星 ${tsukiDoukai})】`);
      const z = KZ ? KZ.get(tsukiKyu) : null;
      if (z) lines.push(z);
      lines.push('');
    }

    lines.push('【所見(要編集)】');
    lines.push('上記同会の象意を踏まえ、向こう三ヶ月の動き方を…');
    return lines.join('\n');
  }

  // ---- 内蔵法 ----
  function draftNaizou(r) {
    const lines = [];
    if (r.bottom.naizou) {
      const k1 = strip(r.bottom.naizou.kuraki_nengetsu);
      const s1 = strip(r.bottom.naizou.shukumei_nengetsu);
      const k2 = strip(r.bottom.naizou.kuraki_toshigetsu);
      const s2 = strip(r.bottom.naizou.shukumei_toshigetsu);
      const k3 = strip(r.bottom.naizou.kuraki_getsubi);
      const s3 = strip(r.bottom.naizou.shukumei_getsubi);
      if (k1 && k1 !== '—') lines.push(`蔵気(日時): ${k1}`);
      if (s1 && s1 !== '—') lines.push(`宿命(日時): ${s1}`);
      if (k2 && k2 !== '—') lines.push(`蔵気(年月): ${k2}`);
      if (s2 && s2 !== '—') lines.push(`宿命(年月): ${s2}`);
      if (k3 && k3 !== '—') lines.push(`蔵気(月日): ${k3}`);
      if (s3 && s3 !== '—') lines.push(`宿命(月日): ${s3}`);
    }
    lines.push('');
    lines.push('【所見(要編集)】');
    lines.push('蔵気は内面に潜む動機、宿命は人生の通奏低音として読む。今回のテーマは…');
    return lines.join('\n');
  }

  // ---- 総合(全体) ----
  function draftSougou(r) {
    const lines = [];
    const honName = star(r.birth.honmeisei);
    const { DU, YK } = D();
    lines.push('【総合】');
    if (DU) {
      const p = DU.phaseOf(r.birth.honmeisei, r.consult.yearCenter);
      if (p) lines.push(`本年は${p.name}の年。${p.desc}`);
    }
    if (YK) {
      const sm = global.SolarTerms.getSetsuMonth(r.consult.date);
      const yi = YK.upcoming(r.birth.honmeisei, sm.setsuYear, 3);
      const now = yi.upcoming.find(x => x.yearsAway === 0);
      if (now) lines.push(`なお本年は${now.kind}に該当(本厄年=${now.honyakuYear})。神社参拝・お祓いの検討を。`);
    }
    lines.push('');
    lines.push('【行動指針(要編集)】');
    lines.push(`${honName}本来の質を活かしつつ、今期は◯◯を中心に据え、◯月以降の節目で動きを集約する。`);
    return lines.join('\n');
  }

  global.DraftGen = { draftHonnin, draftNengetsu, draftNaizou, draftSougou };
})(typeof window !== 'undefined' ? window : globalThis);
