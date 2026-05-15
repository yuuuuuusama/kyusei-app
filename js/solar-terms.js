// solar-terms.js
// 24節気の正確な日時を計算する (JST)
// Meeus "Astronomical Algorithms" Ch.25 太陽の視黄経 + 二分法

(function (global) {
  'use strict';

  const RAD = Math.PI / 180;

  // 太陽の視黄経 (度) を求める (低精度: 誤差約0.01°)
  function sunApparentLongitude(jde) {
    const T = (jde - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const Mr = M * RAD;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
            + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
            + 0.000289 * Math.sin(3 * Mr);
    const trueLong = L0 + C;
    const omega = (125.04 - 1934.136 * T) * RAD;
    const apparent = trueLong - 0.00569 - 0.00478 * Math.sin(omega);
    return ((apparent % 360) + 360) % 360;
  }

  // 黄経差を [-180, 180] に正規化
  function normDiff(a) {
    a = ((a + 540) % 360) - 180;
    return a;
  }

  // Meeus 表27.B (西暦1000-3000) 春分点等の平均JDE
  function meanEquinoxOrSolsticeJDE(year, km) {
    const Y = (year - 2000) / 1000;
    const Y2 = Y * Y, Y3 = Y2 * Y, Y4 = Y3 * Y;
    if (km === 0) return 2451623.80984 + 365242.37404*Y + 0.05169*Y2 - 0.00411*Y3 - 0.00057*Y4;
    if (km === 1) return 2451716.56767 + 365241.62603*Y + 0.00325*Y2 + 0.00888*Y3 - 0.00030*Y4;
    if (km === 2) return 2451810.21715 + 365242.01767*Y - 0.11575*Y2 + 0.00337*Y3 + 0.00078*Y4;
    return                2451900.05952 + 365242.74049*Y - 0.06223*Y2 - 0.00823*Y3 + 0.00032*Y4;
  }

  // 二分法: 太陽の視黄経 = targetLong となる JDE を返す
  function findJDEForLongitude(initialJDE, targetLong) {
    let lo = initialJDE - 5;
    let hi = initialJDE + 5;
    // 初期範囲拡張: targetLong との符号を確認
    let dLo = normDiff(sunApparentLongitude(lo) - targetLong);
    let dHi = normDiff(sunApparentLongitude(hi) - targetLong);
    let safety = 0;
    while (dLo * dHi > 0 && safety++ < 20) {
      lo -= 5; hi += 5;
      dLo = normDiff(sunApparentLongitude(lo) - targetLong);
      dHi = normDiff(sunApparentLongitude(hi) - targetLong);
    }
    // 二分法
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const d = normDiff(sunApparentLongitude(mid) - targetLong);
      if (d < 0) lo = mid;
      else hi = mid;
      if (hi - lo < 1 / 86400) break; // 1秒精度
    }
    return (lo + hi) / 2;
  }

  // 西暦カレンダー年 calendarYear のk番目(0-23)節気のJDEを返す
  // k=0:春分(Mar), 1:清明, 2:穀雨, 3:立夏, 4:小満, 5:芒種,
  // k=6:夏至, 7:小暑, 8:大暑, 9:立秋, 10:処暑, 11:白露,
  // k=12:秋分, 13:寒露, 14:霜降, 15:立冬, 16:小雪, 17:大雪,
  // k=18:冬至(Dec), 19:小寒(Jan翌), 20:大寒, 21:立春, 22:雨水, 23:啓蟄
  //
  // 注意: 回帰年は春分起点。よって calendarYear年 の小寒〜啓蟄(k=19..23) は
  // 「前回の冬至」(=calendarYear-1 年の冬至) を起点に計算する必要がある。
  function solarTermJDE(calendarYear, k) {
    let baseYear, km, sub;
    if (k >= 19 && k <= 23) {
      baseYear = calendarYear - 1;
      km = 3; // 冬至
      sub = k - 18; // 1..5
    } else {
      baseYear = calendarYear;
      km = Math.floor(k / 6);
      sub = k - km * 6;
    }
    const targetLong = (k * 15) % 360;
    const baseJDE = meanEquinoxOrSolsticeJDE(baseYear, km) + sub * (365.2422 / 24);
    return findJDEForLongitude(baseJDE, targetLong);
  }

  // JDE -> JST の Date オブジェクト
  // ΔT (TT-UT) は近代では70秒前後、節入りの分単位精度には影響あり得るが
  // 1日単位の判定には十分なので、ここでは ΔT を 68 秒として補正
  function jdeToJSTDate(jde) {
    const deltaT = 68 / 86400; // days
    const jdUT = jde - deltaT;
    const jdJST = jdUT + 9 / 24; // JST = UT+9

    // Meeus Ch.7 Julian Day -> Calendar Date
    const jd = jdJST + 0.5;
    const Z = Math.floor(jd);
    const F = jd - Z;
    let A;
    if (Z < 2299161) {
      A = Z;
    } else {
      const alpha = Math.floor((Z - 1867216.25) / 36524.25);
      A = Z + 1 + alpha - Math.floor(alpha / 4);
    }
    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const E = Math.floor((B - D) / 30.6001);
    const dayFrac = B - D - Math.floor(30.6001 * E) + F;
    const month = E < 14 ? E - 1 : E - 13;
    const year = month > 2 ? C - 4716 : C - 4715;
    const day = Math.floor(dayFrac);
    const hoursDec = (dayFrac - day) * 24;
    const h = Math.floor(hoursDec);
    const mDec = (hoursDec - h) * 60;
    const m = Math.floor(mDec);
    const s = Math.round((mDec - m) * 60);
    return new Date(year, month - 1, day, h, m, s);
  }

  // 節気名 (k=0..23)
  const TERM_NAMES = [
    '春分','清明','穀雨','立夏','小満','芒種',
    '夏至','小暑','大暑','立秋','処暑','白露',
    '秋分','寒露','霜降','立冬','小雪','大雪',
    '冬至','小寒','大寒','立春','雨水','啓蟄'
  ];

  // 月の節入り (節) の k インデックス
  // 旧暦の月 → 該当する節 (節入り = その月の始まり)
  // 寅月(2月)=立春(21), 卯月(3月)=啓蟄(23), 辰月(4月)=清明(1), 巳月(5月)=立夏(3),
  // 午月(6月)=芒種(5),  未月(7月)=小暑(7),  申月(8月)=立秋(9), 酉月(9月)=白露(11),
  // 戌月(10月)=寒露(13), 亥月(11月)=立冬(15), 子月(12月)=大雪(17), 丑月(1月)=小寒(19)
  const SETSUIRI_K_BY_MONTH = {
    1: 19,  // 小寒 (前年から続く丑月)
    2: 21,  // 立春 (寅月)
    3: 23,  // 啓蟄 (卯月)
    4: 1,   // 清明 (辰月)
    5: 3,   // 立夏 (巳月)
    6: 5,   // 芒種 (午月)
    7: 7,   // 小暑 (未月)
    8: 9,   // 立秋 (申月)
    9: 11,  // 白露 (酉月)
    10: 13, // 寒露 (戌月)
    11: 15, // 立冬 (亥月)
    12: 17  // 大雪 (子月)
  };

  // 指定された西暦年と暦月の節入り日時(JST)
  // 暦月 1=寅月以前(丑月、前年12月相当の節)? いやここでは「節月」を返す
  // year=西暦, calendarMonth=1..12 (西暦月)
  // 各西暦月の節入りは: 1月=小寒, 2月=立春, 3月=啓蟄, ..., 12月=大雪
  function getSetsuiri(year, calendarMonth) {
    const k = SETSUIRI_K_BY_MONTH[calendarMonth];
    // 春分(k=0)〜啓蟄(k=23) が同じ西暦年でカバーされる前提で良いが、
    // 1月の小寒(k=19), 大寒(k=20) は前年の k 値が直前にあるため、
    // 西暦年=year の中の節気を返すには、k=19,20,21,22,23 は year の値で計算
    // k=1..17 も year で計算で OK
    const jde = solarTermJDE(year, k);
    return jdeToJSTDate(jde);
  }

  // 与えられた日時に対する「節月」(寅=2..丑=1) と「節月年」を返す
  // 立春前は前年扱い
  function getSetsuMonth(date) {
    const y = date.getFullYear();
    // 各月の節入り日時を取得し、その時刻と比較
    // date が立春以前 → 節月年 = y - 1, 節月 = 1 (丑月)
    // date が立春以降・啓蟄以前 → 節月年 = y, 節月 = 2 (寅月)
    // 以下同様

    // 立春 (年y)
    const risshun = getSetsuiri(y, 2);
    if (date < risshun) {
      // 前年の小寒以降 (節月年=y-1) or それ以前 (節月年=y-1, 節月=1)
      // 小寒(y) は 1月上旬。立春(y) より前で小寒(y)以降 → 節月=1, 年=y-1
      const shoukan_y = getSetsuiri(y, 1);
      if (date >= shoukan_y) {
        return { setsuYear: y - 1, setsuMonth: 1, monthBranchIdx: 1 }; // 丑月
      }
      // 小寒(y)より前 → 大雪(y-1)以降のはず → 節月=12 (子月)
      const taisetsu_prev = getSetsuiri(y - 1, 12);
      if (date >= taisetsu_prev) {
        return { setsuYear: y - 1, setsuMonth: 12, monthBranchIdx: 0 }; // 子月
      }
      // それより前 → 立冬(y-1)以降 → 11 (亥月)、と再帰的に判定すべきだが
      // 通常 date は y 年なので、ここはまれ。簡易には:
      for (let m = 11; m >= 1; m--) {
        const t = getSetsuiri(y - 1, m);
        if (date >= t) {
          return { setsuYear: y - 1, setsuMonth: m, monthBranchIdx: monthIdxFromCalMonth(m) };
        }
      }
      // 1月よりさらに前は y-2 へ (普通ありえないが念のため)
      return { setsuYear: y - 2, setsuMonth: 12, monthBranchIdx: 0 };
    }
    // 立春以降: その年内の各節入りと比較
    let lastMonth = 2, lastBranch = 2; // 寅月
    for (let m = 3; m <= 12; m++) {
      const t = getSetsuiri(y, m);
      if (date < t) {
        return { setsuYear: y, setsuMonth: lastMonth, monthBranchIdx: monthIdxFromCalMonth(lastMonth) };
      }
      lastMonth = m;
    }
    // 大雪以降 → 子月 (12月)、ただし小寒(y+1)以降は丑月(年=y, 月=1)
    const shoukan_next = getSetsuiri(y + 1, 1);
    if (date >= shoukan_next) {
      return { setsuYear: y, setsuMonth: 1, monthBranchIdx: 1 };
    }
    return { setsuYear: y, setsuMonth: 12, monthBranchIdx: 0 };
  }

  // 西暦月 → 月支 index (子=0, 丑=1, 寅=2, ..., 亥=11)
  function monthIdxFromCalMonth(m) {
    // 2月=寅(2), 3月=卯(3), ..., 12月=子(0), 1月=丑(1)
    if (m === 1) return 1;
    if (m === 12) return 0;
    return m; // 2->2(寅), 3->3(卯), ..., 11->11(亥)
  }

  global.SolarTerms = {
    sunApparentLongitude,
    solarTermJDE,
    jdeToJSTDate,
    getSetsuiri,
    getSetsuMonth,
    TERM_NAMES,
    SETSUIRI_K_BY_MONTH,
    monthIdxFromCalMonth
  };
})(typeof window !== 'undefined' ? window : globalThis);
