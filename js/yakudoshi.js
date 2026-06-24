// yakudoshi.js — 気学の厄年 (男女共通)
//   本厄: 本命星が年盤の坎宮 (北、posIdx=1) に座する年 (9年周期)
//   前厄: 本厄の前年
//   後厄: 本厄の翌年
(function (global) {
  'use strict';
  const Kyusei = global.Kyusei;

  // 与えられた西暦年が、本命星 honmeisei にとって本厄か
  function isHonyakuYear(honmeisei, year) {
    const center = Kyusei.getYearStar(year);
    const pos = Kyusei.findPositionOfStar(center, honmeisei);
    return pos === 1; // 坎宮
  }

  // 与えられた year 以降で、本命星が坎宮に座する年を count 個返す
  function nextHonyakuYears(honmeisei, startYear, count) {
    const out = [];
    let y = startYear;
    while (out.length < count && y < startYear + 100) {
      if (isHonyakuYear(honmeisei, y)) out.push(y);
      y++;
    }
    return out;
  }

  // currentYear を起点に、前後の厄年候補 (前厄/本厄/後厄) を抽出
  // lookAheadYears: 何年先まで含めるか (デフォルト 18 = 厄年2サイクル)
  function upcoming(honmeisei, currentYear, lookAheadYears) {
    lookAheadYears = lookAheadYears || 18;
    const items = [];
    for (let y = currentYear - 1; y <= currentYear + lookAheadYears + 1; y++) {
      if (isHonyakuYear(honmeisei, y)) {
        if (y - 1 >= currentYear - 1) {
          items.push({ year: y - 1, kind: '前厄', yearsAway: y - 1 - currentYear, honyakuYear: y });
        }
        items.push({ year: y, kind: '本厄', yearsAway: y - currentYear, honyakuYear: y });
        if (y + 1 <= currentYear + lookAheadYears) {
          items.push({ year: y + 1, kind: '後厄', yearsAway: y + 1 - currentYear, honyakuYear: y });
        }
      }
    }
    const seen = new Set();
    const uniq = items.filter(i => {
      const k = i.year + ':' + i.kind;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return {
      honmeisei,
      currentYear,
      upcoming: uniq.sort((a, b) => a.yearsAway - b.yearsAway)
    };
  }

  global.Yakudoshi = { isHonyakuYear, nextHonyakuYears, upcoming };
})(typeof window !== 'undefined' ? window : globalThis);
