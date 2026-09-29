// yonban.js
// その日時の四盤（年盤・月盤・日盤・時盤）を組む。ウィジェットが JavaScriptCore で読む。
//
// 計算は鑑定アプリと同じ js/solar-terms.js・js/eto.js・js/kyusei.js を使う（先に読み込む）。
// 盤の並べ方（各宮の干支・暗剣殺・破）は js/app.js の drawBan と同じ決まり。
// drawBan を直したら、ここも合わせること（scripts/test-yonban.mjs が突き合わせる）。
//
// 盤変化（鑑定書で年月・月日・日時の中宮星が重なったときの変化）は当てない。
// 暦のとおりの四盤を出す。

(function (global) {
  'use strict';

  const SolarTerms = global.SolarTerms, Eto = global.Eto, Kyusei = global.Kyusei;

  // 十二支の本来の宮（子=坎 … 亥=乾）。drawBan の BRANCH_NATURAL_POS
  const BRANCH_NATURAL_POS = [1, 2, 2, 5, 8, 8, 7, 6, 6, 3, 0, 0];

  // 宮 0..8 = 北西, 北, 北東, 西, 中宮, 東, 南西, 南, 南東（kyusei.js と同じ）
  function board(kind, centerStar, periodEto, isInton) {
    const stars = Kyusei.getPositionStars(centerStar);
    const ankenPos = centerStar === 5 ? null : 8 - Kyusei.findPositionOfStar(centerStar, 5);
    const haPos = 8 - BRANCH_NATURAL_POS[periodEto.branchIdx];
    const cells = [];
    for (let pos = 0; pos < 9; pos++) {
      const defStar = Kyusei.DEFAULT_POSITION_STARS[pos];
      const offset = isInton ? ((5 - defStar + 9) % 9) : ((defStar - 5 + 9) % 9);
      const branchIdx = ((periodEto.branchIdx + offset) % 12 + 12) % 12;
      const stemIdx = ((periodEto.stemIdx + offset) % 10 + 10) % 10;
      cells.push({
        pos,
        star: stars[pos],
        starName: Kyusei.STAR_NAMES[stars[pos]],
        eto: Eto.STEMS[stemIdx] + Eto.BRANCHES[branchIdx],
        anken: pos === ankenPos,
        ha: pos === haPos,
        direction: Kyusei.POSITION_TO_DIRECTION[pos]
      });
    }
    return { kind, center: centerStar, centerName: Kyusei.STAR_NAMES[centerStar], eto: periodEto.name, cells };
  }

  // date の後で最初の節入り（月盤・年盤が替わる時刻）。1970 年からのミリ秒
  function nextSetsuiri(date) {
    for (let i = 0; i < 3; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() + i, 1);
      const t = SolarTerms.getSetsuiri(d.getFullYear(), d.getMonth() + 1);
      if (t > date) return t.getTime();
    }
    return null;
  }

  // ms: 1970 年からのミリ秒（端末の時刻）。端末の時間帯で読む
  function forTime(ms) {
    const date = new Date(ms);
    const sm = SolarTerms.getSetsuMonth(date);
    const yearEto = Eto.getYearEto(sm.setsuYear);
    const monthEto = Eto.getMonthEto(sm.setsuYear, sm.setsuMonth);
    const dayEto = Eto.getDayEto(date);
    const hourEto = Eto.getHourEto(date);
    const inton = Kyusei.isInton(date);
    return {
      year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(),
      donton: inton ? '陰遁' : '陽遁',
      nextSetsuiri: nextSetsuiri(date),
      boards: [
        board('年', Kyusei.getYearStar(sm.setsuYear), yearEto, false),
        board('月', Kyusei.getMonthStar(yearEto.branchIdx, sm.setsuMonth), monthEto, false),
        board('日', Kyusei.getDayStar(date), dayEto, inton),
        board('時', Kyusei.getHourStar(date), hourEto, inton)
      ]
    };
  }

  global.Yonban = { forTime, board };
})(typeof window !== 'undefined' ? window : globalThis);
