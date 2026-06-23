// un-tables.js — 月運表 / 年運表 / 方位取り適日
(function (global) {
  'use strict';
  const Kyusei = global.Kyusei;
  const SolarTerms = global.SolarTerms;
  const Eto = global.Eto;
  const HouiAnalysis = global.HouiAnalysis;

  // 月運表: 相談月から months ヶ月分
  function monthFlow(consultDate, honmeisei, months) {
    months = months || 12;
    const out = [];
    const start = new Date(consultDate.getFullYear(), consultDate.getMonth(), 15);
    for (let i = 0; i < months; i++) {
      const dt = new Date(start.getFullYear(), start.getMonth() + i, 15);
      const sm = SolarTerms.getSetsuMonth(dt);
      const ye = Eto.getYearEto(sm.setsuYear);
      const me = Eto.getMonthEto(sm.setsuYear, sm.setsuMonth);
      const center = Kyusei.getMonthStar(ye.branchIdx, sm.setsuMonth);
      const pos = Kyusei.findPositionOfStar(center, honmeisei);
      const kyu = honmeisei === center ? '中央' : Kyusei.POSITION_TO_KYU_NAME[pos];
      // 同会 = 本命の年盤位置に来る月盤の星  ─ 簡易には本命位置の定位星
      const doukai = Kyusei.DEFAULT_POSITION_STARS[pos];
      out.push({
        date: dt,
        year: dt.getFullYear(),
        month: dt.getMonth() + 1,
        setsuMonth: sm.setsuMonth,
        center, centerName: Kyusei.STAR_NAMES[center],
        monthEto: me.name,
        pos, kyu,
        doukai, doukaiName: Kyusei.STAR_NAMES[doukai]
      });
    }
    return out;
  }

  // 年運表: 相談年から years 年分
  function yearFlow(consultDate, honmeisei, years) {
    years = years || 9;
    const baseSM = SolarTerms.getSetsuMonth(consultDate);
    const out = [];
    for (let i = 0; i < years; i++) {
      const sy = baseSM.setsuYear + i;
      const ye = Eto.getYearEto(sy);
      const center = Kyusei.getYearStar(sy);
      const pos = Kyusei.findPositionOfStar(center, honmeisei);
      const kyu = honmeisei === center ? '中央' : Kyusei.POSITION_TO_KYU_NAME[pos];
      const doukai = Kyusei.DEFAULT_POSITION_STARS[pos];
      out.push({
        year: sy,
        yearEto: ye.name,
        center, centerName: Kyusei.STAR_NAMES[center],
        pos, kyu,
        doukai, doukaiName: Kyusei.STAR_NAMES[doukai]
      });
    }
    return out;
  }

  // 方位取り適日: 向こう days 日で、年・月・日 3つ全て吉方が成立する日を抽出
  function findKichiDays(consultDate, honmeisei, days) {
    days = days || 30;
    const start = new Date(consultDate.getFullYear(), consultDate.getMonth(), consultDate.getDate());
    const result = [];
    for (let i = 0; i < days; i++) {
      const dt = new Date(start.getTime() + i * 86400000);
      const sm = SolarTerms.getSetsuMonth(dt);
      const ye = Eto.getYearEto(sm.setsuYear);
      const me = Eto.getMonthEto(sm.setsuYear, sm.setsuMonth);
      const de = Eto.getDayEto(dt);
      const yearCenter  = Kyusei.getYearStar(sm.setsuYear);
      const monthCenter = Kyusei.getMonthStar(ye.branchIdx, sm.setsuMonth);
      const dayCenter   = Kyusei.getDayStar(dt);
      const yA = HouiAnalysis.analyzeBoard(yearCenter,  ye.branchIdx, honmeisei);
      const mA = HouiAnalysis.analyzeBoard(monthCenter, me.branchIdx, honmeisei);
      const dA = HouiAnalysis.analyzeBoard(dayCenter,   de.branchIdx, honmeisei);
      const yBad = HouiAnalysis.getKyoushinByDir(yA);
      const mBad = HouiAnalysis.getKyoushinByDir(mA);
      const dBad = HouiAnalysis.getKyoushinByDir(dA);
      const yStars = Kyusei.getPositionStars(yearCenter);
      const mStars = Kyusei.getPositionStars(monthCenter);
      const dStars = Kyusei.getPositionStars(dayCenter);
      const dirs = [];
      HouiAnalysis.DIRS.forEach(d => {
        const sY = yStars[d.pos], sM = mStars[d.pos], sD = dStars[d.pos];
        const tripleK = HouiAnalysis.isRelationKichi(honmeisei, sY)
                     && HouiAnalysis.isRelationKichi(honmeisei, sM)
                     && HouiAnalysis.isRelationKichi(honmeisei, sD);
        const noBad = yBad[d.pos].length === 0
                   && mBad[d.pos].length === 0
                   && dBad[d.pos].length === 0;
        if (tripleK && noBad) dirs.push({ pos: d.pos, label: d.label });
      });
      if (dirs.length) result.push({ date: dt, dirs });
    }
    return result;
  }

  global.UnTables = { monthFlow, yearFlow, findKichiDays };
})(typeof window !== 'undefined' ? window : globalThis);
