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

  // 中気の刻は何度も引くので憶えておく。章（十二〜十三か月）を組むたびに
  // 同じ年の同じ節気を引き直していては、いたずらに時を食う。
  const termCache = new Map();
  function solarTermJDE(year, k) {
    const key = year + '|' + k;
    let v = termCache.get(key);
    if (v === undefined) { v = ST.solarTermJDE(year, k); termCache.set(key, v); }
    return v;
  }

  // その日の 0時
  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // 朔区間 [prevDate, nextDate) 内の中気を探し、旧暦月を返す
  //
  // 比べるのは瞬刻ではなく**日**。旧暦は日で建てるので、朔と同じ日に来た中気は
  // その日（＝新しい月の一日）のものとして数える。
  //
  // 瞬刻で比べていたため 2025年に食い違いが出た。処暑は 8月23日 5:36、
  // その日の朔は 8月23日 15:07。日で見れば処暑は七月一日に入るので、
  // 7月25日から始まる月は中気を持たず閏六月になる。瞬刻で見ると処暑が朔より
  // 前に来るぶん前の月に数えられ、閏六月が七月と読まれていた。
  // そのため 2025年7月25日〜8月22日の六曜が、暦本と一日ぶんずれていた。
  function findOldMonth(prevDate, nextDate) {
    const probeYears = [prevDate.getFullYear() - 1, prevDate.getFullYear(), prevDate.getFullYear() + 1];
    const from = startOfDay(prevDate).getTime();
    const to = startOfDay(nextDate).getTime();
    for (const k of CHUKI_K) {
      for (const y of probeYears) {
        const jde = solarTermJDE(y, k);
        const t = startOfDay(ST.jdeToJSTDate(jde)).getTime();
        if (t >= from && t < to) {
          return { month: CHUKI_TO_OLDMONTH[k], isLeap: false };
        }
      }
    }
    return { month: null, isLeap: true };
  }

  // その日が属する朔区間。**日で引く**。
  //
  // その日の終わりで問えば、その日の途中に来る朔も「その日＝一日」に入る。
  // 瞬刻のまま問うていたため、朔が午後に来る日は、昼までは前の月の三十日、
  // 午後からは新しい月の一日と、**同じ日なのに見る時刻で答えが変わって**いた。
  function lunationOfDay(date) {
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    return newMoonInterval(end);
  }

  // 冬至（k=18）を含む朔区間。その月が十一月になる。
  function winterSolsticeLunation(year) {
    return lunationOfDay(ST.jdeToJSTDate(solarTermJDE(year, 18)));
  }

  // 次の朔区間
  function nextLunation(iv) {
    return lunationOfDay(new Date(
      iv.nextDate.getFullYear(), iv.nextDate.getMonth(), iv.nextDate.getDate()
    ));
  }

  // その朔区間の旧暦月。
  //
  // 冬至を含む月を十一月とし、次の冬至を含む月までを一つながりに組んで番号を振る。
  // そのあいだに月が**十三**あれば閏月を置く。中気を持たない最初の月が閏月で、
  // 番号は前の月と同じ（閏六月など）。
  //
  // **中気を持たない月が、いつでも閏月になるわけではない。** 定気法では、月が十二しか
  // 無い年にも中気を落とす月が現れる。そこを閏月と読んでいたため、実際には閏月の無い
  // 1965年に閏八月が立ち、以後の月がひと月ずつずれていた。
  //
  // 閏月の番号が決まらないと六曜も出せない（六曜は 旧暦の月＋日 で決まるため）。
  // 以前は閏月のあいだ六曜が空欄になっていた。
  function oldMonthOf(iv) {
    const start = startOfDay(iv.prevDate).getTime();

    // この月が入る章（冬至の月から次の冬至の月まで）の始まりを探す。
    // 冬至は年の暮れに来るので、遡るのはたかだか一度。
    let headYear = iv.prevDate.getFullYear();
    let head = winterSolsticeLunation(headYear);
    while (startOfDay(head.prevDate).getTime() > start) {
      headYear -= 1;
      head = winterSolsticeLunation(headYear);
    }
    const tailStart = startOfDay(winterSolsticeLunation(headYear + 1).prevDate).getTime();

    // 章の月を並べ、中気の有無を控える
    const months = [];
    let cursor = head;
    for (let i = 0; i < 14; i++) {
      const from = startOfDay(cursor.prevDate).getTime();
      if (from >= tailStart) break;
      months.push({ start: from, hasChuki: !findOldMonth(cursor.prevDate, cursor.nextDate).isLeap });
      cursor = nextLunation(cursor);
    }
    if (!months.length) return { month: null, isLeap: true };

    // 十三あれば、中気を持たない最初の月が閏月
    let leapAt = -1;
    if (months.length === 13) {
      for (let i = 1; i < months.length; i++) {
        if (!months[i].hasChuki) { leapAt = i; break; }
      }
    }

    let number = 11;
    for (let i = 0; i < months.length; i++) {
      const isLeap = i === leapAt;
      const value = isLeap ? (number === 1 ? 12 : number - 1) : number;
      if (months[i].start === start) return { month: value, isLeap };
      if (!isLeap) number = number === 12 ? 1 : number + 1;
    }
    return { month: null, isLeap: true };
  }

  // 旧暦・月齢
  function getKyureki(date) {
    // 暦は日で建て、月齢は瞬刻で数える。引く区間を分ける。
    const iv = lunationOfDay(date);
    const dPrev = startOfDay(iv.prevDate);
    const dToday = startOfDay(date);
    const oldDay = Math.round((dToday - dPrev) / 86400000) + 1;
    const om = oldMonthOf(iv);
    // 旧暦年: 旧暦11月以降または特殊扱いで年が変わる ── 簡易には冬至を境に
    const oldYear = (om.month && om.month >= 11)
      ? iv.prevDate.getFullYear()
      : (om.month && om.month <= 2 ? iv.prevDate.getFullYear() : iv.prevDate.getFullYear());
    // 月齢は日に丸めず、いまの瞬刻から数える
    const moonAge = (date.getTime() - newMoonInterval(date).prevDate.getTime()) / 86400000;
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
