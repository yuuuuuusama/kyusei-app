// kimon.js — 鬼門(艮宮=pos 2)・裏鬼門(坤宮=pos 6) の年月判断
(function (global) {
  'use strict';
  const Kyusei = global.Kyusei;
  const HouiAnalysis = global.HouiAnalysis;

  function analyze(centerStar, periodBranchIdx, honmeisei) {
    const stars = Kyusei.getPositionStars(centerStar);
    const ha = HouiAnalysis.analyzeBoard(centerStar, periodBranchIdx, honmeisei);
    const bad = HouiAnalysis.getKyoushinByDir(ha);
    return {
      kimon:    { pos: 2, star: stars[2], starName: Kyusei.STAR_NAMES[stars[2]], bad: bad[2] || [] },
      urakimon: { pos: 6, star: stars[6], starName: Kyusei.STAR_NAMES[stars[6]], bad: bad[6] || [] }
    };
  }

  // 五黄が鬼門・裏鬼門にあるかなど特に注意の判定
  function severity(info) {
    const all = (info.kimon.bad || []).concat(info.urakimon.bad || []);
    if (all.indexOf('五黄殺') >= 0) return '要警戒';
    if (all.indexOf('暗剣殺') >= 0 || all.indexOf('歳/月破') >= 0) return '注意';
    if (info.kimon.star === 5 || info.urakimon.star === 5) return '要警戒';
    return '通常';
  }

  global.Kimon = { analyze, severity };
})(typeof window !== 'undefined' ? window : globalThis);
