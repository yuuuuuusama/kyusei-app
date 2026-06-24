// dai-un.js — 大運の位相 (旺気/相気/休気/囚気/死気)
(function (global) {
  'use strict';
  const Kyusei = global.Kyusei;
  const SolarTerms = global.SolarTerms;

  const PRODUCES = { '木':'火','火':'土','土':'金','金':'水','水':'木' };
  const CONTROLS = { '木':'土','土':'水','水':'火','火':'金','金':'木' };

  // 本命星×年盤中宮 → 位相
  function phaseOf(honmeisei, yearCenter) {
    const a = Kyusei.STAR_ELEMENTS[honmeisei];
    const b = Kyusei.STAR_ELEMENTS[yearCenter];
    if (!a || !b) return null;
    if (a === b) return { name: '旺気', kind: 'good', desc: '気が旺んな最盛期。攻めの一年。新規・拡大に向く。' };
    if (PRODUCES[b] === a) return { name: '相気', kind: 'good', desc: '助けられて伸びる年。次期飛躍の基礎づくりに最良。' };
    if (PRODUCES[a] === b) return { name: '休気', kind: 'neutral', desc: '与え疲れる年。休養と他者への奉仕に。蓄積を消耗。' };
    if (CONTROLS[b] === a) return { name: '囚気', kind: 'bad', desc: '抑え込まれる年。守りと忍耐。新規より整理。' };
    if (CONTROLS[a] === b) return { name: '死気', kind: 'bad', desc: '反発・葛藤の年。攻めは避け、内省と充電を。' };
    return null;
  }

  // 向こう years 年の位相変化
  function phaseSeries(consultDate, honmeisei, years) {
    years = years || 9;
    const baseSM = SolarTerms.getSetsuMonth(consultDate);
    const out = [];
    let prev = null;
    for (let i = 0; i < years; i++) {
      const sy = baseSM.setsuYear + i;
      const center = Kyusei.getYearStar(sy);
      const p = phaseOf(honmeisei, center);
      out.push({ year: sy, center, centerName: Kyusei.STAR_NAMES[center], phase: p,
                 transition: !!(prev && p && prev.name !== p.name) });
      prev = p;
    }
    return out;
  }

  global.DaiUn = { phaseOf, phaseSeries };
})(typeof window !== 'undefined' ? window : globalThis);
