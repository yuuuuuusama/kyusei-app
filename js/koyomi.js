// koyomi.js — 旧暦・月齢・朔・節入りまでの日数
// Meeus "Astronomical Algorithms" Ch.49 (Moon) を簡易適用
(function (global) {
  'use strict';
  const ST = global.SolarTerms;
  const RAD = Math.PI / 180;

  // Mean phase JDE (k=0 は 2000-01-06 18:14 UT の新月)
  function meanNewMoonJDE(k) {
    const T = k / 1236.85;
    const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    let jde = 2451550.09766 + 29.530588861 * k
            + 0.00015437 * T2
            - 0.000000150 * T3
            + 0.00000000073 * T4;
    const M  = (2.5534 + 29.10535670 * k - 0.0000014 * T2) * RAD;
    const M2 = (201.5643 + 385.81693528 * k + 0.0107582 * T2) * RAD;
    const F  = (160.7108 + 390.67050284 * k - 0.0016118 * T2) * RAD;
    const O  = (124.7746 - 1.56375588 * k + 0.0020672 * T2) * RAD;
    const E  = 1 - 0.002516 * T - 0.0000074 * T2;
    jde += -0.40720 * Math.sin(M2)
         +  0.17241 * E * Math.sin(M)
         +  0.01608 * Math.sin(2*M2)
         +  0.01039 * Math.sin(2*F)
         +  0.00739 * E * Math.sin(M2 - M)
         -  0.00514 * E * Math.sin(M2 + M)
         +  0.00208 * E*E * Math.sin(2*M)
         -  0.00111 * Math.sin(M2 - 2*F)
         -  0.00057 * Math.sin(M2 + 2*F)
         +  0.00056 * E * Math.sin(2*M2 + M)
         -  0.00042 * Math.sin(3*M2)
         +  0.00042 * E * Math.sin(M + 2*F)
         +  0.00038 * E * Math.sin(M - 2*F)
         -  0.00024 * E * Math.sin(2*M2 - M)
         -  0.00017 * Math.sin(O)
         -  0.00007 * Math.sin(M2 + 2*M);
    return jde;
  }

  // 与えられた Date の直前の朔 (date を含む朔区間の起点) と次朔
  function newMoonInterval(date) {
    const yearFrac = date.getFullYear() + date.getMonth() / 12 + date.getDate() / 365.25;
    let k = Math.round((yearFrac - 2000) * 12.3685);
    let prevJDE = meanNewMoonJDE(k);
    let prevDate = ST.jdeToJSTDate(prevJDE);
    // 直前を確実に取る (prevDate <= date < nextDate)
    while (prevDate > date) {
      k -= 1;
      prevJDE = meanNewMoonJDE(k);
      prevDate = ST.jdeToJSTDate(prevJDE);
    }
    let nextJDE = meanNewMoonJDE(k + 1);
    let nextDate = ST.jdeToJSTDate(nextJDE);
    while (nextDate <= date) {
      k += 1;
      prevJDE = nextJDE;
      prevDate = nextDate;
      nextJDE = meanNewMoonJDE(k + 1);
      nextDate = ST.jdeToJSTDate(nextJDE);
    }
    return { k, prevJDE, prevDate, nextJDE, nextDate };
  }

  // 中気のk値 (春分0,穀雨2,小満4,夏至6,大暑8,処暑10,秋分12,霜降14,小雪16,冬至18,大寒20,雨水22)
  const CHUKI_K = [22, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
  const CHUKI_TO_OLDMONTH = { 22:1, 0:2, 2:3, 4:4, 6:5, 8:6, 10:7, 12:8, 14:9, 16:10, 18:11, 20:12 };

  // 朔区間 [prevDate, nextDate) 内の中気を探し、旧暦月を返す
  function findOldMonth(prevDate, nextDate) {
    const probeYears = [prevDate.getFullYear() - 1, prevDate.getFullYear(), prevDate.getFullYear() + 1];
    for (const k of CHUKI_K) {
      for (const y of probeYears) {
        const jde = ST.solarTermJDE(y, k);
        const t = ST.jdeToJSTDate(jde);
        if (t >= prevDate && t < nextDate) {
          return { month: CHUKI_TO_OLDMONTH[k], isLeap: false };
        }
      }
    }
    return { month: null, isLeap: true };
  }

  // 旧暦・月齢
  function getKyureki(date) {
    const iv = newMoonInterval(date);
    const dPrev = new Date(iv.prevDate.getFullYear(), iv.prevDate.getMonth(), iv.prevDate.getDate());
    const dToday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const oldDay = Math.round((dToday - dPrev) / 86400000) + 1;
    const om = findOldMonth(iv.prevDate, iv.nextDate);
    // 旧暦年: 旧暦11月以降または特殊扱いで年が変わる ── 簡易には冬至を境に
    const oldYear = (om.month && om.month >= 11)
      ? iv.prevDate.getFullYear()
      : (om.month && om.month <= 2 ? iv.prevDate.getFullYear() : iv.prevDate.getFullYear());
    const moonAge = (date.getTime() - iv.prevDate.getTime()) / 86400000;
    let phase;
    if (moonAge < 1.5) phase = '新月';
    else if (moonAge < 6.5) phase = '三日月';
    else if (moonAge < 8.5) phase = '上弦';
    else if (moonAge < 13.5) phase = '十日月';
    else if (moonAge < 15.5) phase = '満月';
    else if (moonAge < 21.5) phase = '居待月';
    else if (moonAge < 23.5) phase = '下弦';
    else phase = '有明月';
    return {
      year: oldYear,
      month: om.month,
      isLeap: om.isLeap,
      day: oldDay,
      moonAge: Math.round(moonAge * 10) / 10,
      phase
    };
  }

  // 次の節入り (節月起点となる節気のみ、12個)
  const SETSU_LIST = [
    { k: 21, name: '立春' }, { k: 23, name: '啓蟄' },
    { k: 1,  name: '清明' }, { k: 3,  name: '立夏' },
    { k: 5,  name: '芒種' }, { k: 7,  name: '小暑' },
    { k: 9,  name: '立秋' }, { k: 11, name: '白露' },
    { k: 13, name: '寒露' }, { k: 15, name: '立冬' },
    { k: 17, name: '大雪' }, { k: 19, name: '小寒' }
  ];
  function nextSetsuiriInfo(date) {
    const y = date.getFullYear();
    const candidates = [];
    for (const baseY of [y - 1, y, y + 1, y + 2]) {
      for (const s of SETSU_LIST) {
        const jde = ST.solarTermJDE(baseY, s.k);
        const t = ST.jdeToJSTDate(jde);
        if (t > date) candidates.push({ name: s.name, date: t });
      }
    }
    candidates.sort((a, b) => a.date - b.date);
    if (!candidates.length) return null;
    const next = candidates[0];
    const days = Math.ceil((next.date - date) / 86400000);
    return { name: next.name, date: next.date, days };
  }

  global.Koyomi = { getKyureki, nextSetsuiriInfo, newMoonInterval };
})(typeof window !== 'undefined' ? window : globalThis);
