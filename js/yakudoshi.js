// yakudoshi.js — 厄年表 (数え年・男女別)
(function (global) {
  'use strict';

  // 本厄 (数え年)
  const YAKUDOSHI_MAN   = [25, 42, 61];
  const YAKUDOSHI_WOMAN = [19, 33, 37, 61];

  // 大厄 (特に重い)
  const TAIYAKU_MAN   = new Set([42]);
  const TAIYAKU_WOMAN = new Set([33]);

  // 数え年 = 西暦年 - 生年 + 1 (元旦切替の簡易計算)
  function kazoeAge(birthDate, refDate) {
    return refDate.getFullYear() - birthDate.getFullYear() + 1;
  }

  // 現在年から見て向こう数年で本人が前厄/本厄/後厄に該当する年齢のリスト
  function upcoming(birthDate, refDate, gender, lookAheadYears) {
    lookAheadYears = lookAheadYears || 8;
    const cur = kazoeAge(birthDate, refDate);
    const list = gender === '女' ? YAKUDOSHI_WOMAN : YAKUDOSHI_MAN;
    const tai = gender === '女' ? TAIYAKU_WOMAN : TAIYAKU_MAN;
    const out = [];
    list.forEach(age => {
      [-1, 0, +1].forEach(off => {
        const a = age + off;
        const yearsAway = a - cur;
        if (yearsAway >= -1 && yearsAway <= lookAheadYears) {
          const year = birthDate.getFullYear() + a - 1;
          out.push({
            age: a,
            kind: off === 0 ? '本厄' : (off === -1 ? '前厄' : '後厄'),
            taiyaku: off === 0 && tai.has(age),
            yearsAway, year
          });
        }
      });
    });
    return { kazoeAge: cur, upcoming: out.sort((a,b) => a.yearsAway - b.yearsAway) };
  }

  global.Yakudoshi = { kazoeAge, upcoming, YAKUDOSHI_MAN, YAKUDOSHI_WOMAN };
})(typeof window !== 'undefined' ? window : globalThis);
