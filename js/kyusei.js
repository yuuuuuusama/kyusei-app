// kyusei.js
// 九星 (一白〜九紫) の計算
// - 年盤本命星
// - 月盤中宮星
// - 日盤中宮星 (陽遁・陰遁、冬至/夏至付近の甲子日基準)
// - 時盤中宮星
// - 後天定位の中宮星指定による方位配置生成

(function (global) {
  'use strict';

  const STAR_NAMES = ['', '一白', '二黒', '三碧', '四緑', '五黄', '六白', '七赤', '八白', '九紫'];
  const STAR_COLORS = {
    1: '#fff', 2: '#f4e8d5', 3: '#a8d5a8', 4: '#a8d5a8',
    5: '#e8c4a8', 6: '#fff', 7: '#fff', 8: '#f4e8d5', 9: '#f8a8a8'
  };
  const STAR_ELEMENTS = ['', '水', '土', '木', '木', '土', '金', '金', '土', '火'];

  // 1〜9 の範囲に正規化
  function wrap9(n) {
    n = ((n - 1) % 9 + 9) % 9 + 1;
    return n;
  }

  // ---------- 年盤本命星 ----------
  // 西暦年 (立春後) → 本命星
  // 例: 1990 → 1+9+9+0=19 → 1+9=10 → 1+0=1 → 11-1=10 → 10-9=1 (一白)
  function getYearStar(setsuYear) {
    let s = 0;
    let y = Math.abs(setsuYear);
    while (y > 0) { s += y % 10; y = Math.floor(y / 10); }
    // 一桁になるまで繰り返し
    while (s > 9) {
      let t = 0, x = s;
      while (x > 0) { t += x % 10; x = Math.floor(x / 10); }
      s = t;
    }
    let star = 11 - s;
    if (star > 9) star -= 9;
    if (star < 1) star += 9;
    return star;
  }

  // ---------- 月盤中宮星 (=月本命星) ----------
  // 年支によって寅月の月星が決まり、以後毎月 -1 (9→1ループ)
  // 子・卯・午・酉年: 寅月=八白(8)
  // 丑・辰・未・戌年: 寅月=五黄(5)
  // 寅・巳・申・亥年: 寅月=二黒(2)
  function getMonthStar(yearBranchIdx, setsuMonth) {
    // yearBranchIdx: 0=子, 3=卯, 6=午, 9=酉 → group A
    //                1=丑, 4=辰, 7=未, 10=戌 → group B
    //                2=寅, 5=巳, 8=申, 11=亥 → group C
    const groupMod = yearBranchIdx % 3;
    const startStar = groupMod === 0 ? 8 : (groupMod === 1 ? 5 : 2);
    // setsuMonth: 2=寅,3=卯,...,11=亥,12=子,1=丑 を寅月起点に offset
    let offset;
    if (setsuMonth === 1) offset = 11; // 丑月
    else offset = setsuMonth - 2;       // 寅月=0
    return wrap9(startStar - offset);
  }

  // ---------- 日盤中宮星 ----------
  // 陽遁: 冬至直近の甲子日 → 一白 (1), 以降毎日 +1 (9→1)
  // 陰遁: 夏至直近の甲子日 → 九紫 (9), 以降毎日 -1 (1→9)
  // 「直近の甲子日」= 冬至/夏至に最も近い甲子日 (±30日内に必ず1つ存在)
  //
  // 与えられた date に対し:
  //   1. その date が含まれる「陽遁期間」または「陰遁期間」を特定
  //   2. 起点 (近い側の冬至 or 夏至 の甲子日) からの日数を計算
  //   3. 陽遁なら startStar + days, 陰遁なら startStar - days

  // 「上元甲子日」アンカー
  // 妙傳寺の万年暦における「日干支 = 甲子」かつ「九星運行の起点」となる日。
  // - 60干支サイクル中で 180 日 (= 9*60/gcd(9,60) = 180) ごとの上元甲子のみ採用
  // - 1900/1/1 (= 甲戌日 in user's ref) からの経過日数 mod 180 = 110 となる日
  // - これにより冬至甲子⇔夏至甲子が常に 180 日間隔となり、
  //   転換点で「九紫が二日連続」「一白が二日連続」のルールが自然に成立する
  const UPPER_KOSHI_180_OFFSET = 110;

  // centerDate に最も近い「上元甲子日」を返す (前後どちらでも)
  function findNearestUpperKoshi(centerDate) {
    const refUTC = Date.UTC(1900, 0, 1);
    const centerUTC = Date.UTC(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate());
    const days = Math.round((centerUTC - refUTC) / 86400000);
    const mod = ((days % 180) + 180) % 180;
    const forward = (UPPER_KOSHI_180_OFFSET - mod + 180) % 180;   // 0..179 (前方 = 未来側)
    const backward = (mod - UPPER_KOSHI_180_OFFSET + 180) % 180;  // 0..179 (後方 = 過去側)
    let offset;
    if (forward === 0 || backward === 0) offset = 0;
    else if (forward <= backward) offset = forward;
    else offset = -backward;
    const startUTC = centerUTC + offset * 86400000;
    const dt = new Date(startUTC);
    return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  }

  // 与えられた date に対する 陽/陰遁 起点甲子日 を取得
  // 規則: 冬至・夏至それぞれに最寄り (前後どちらでも近い方) の上元甲子日を起点とする
  //   陽遁: [冬至上元甲子, 夏至上元甲子) → 一白起点、+1進行
  //   陰遁: [夏至上元甲子, 次冬至上元甲子) → 九紫起点、-1進行
  //   転換点では同じ星 (九紫または一白) が前日と当日で連続する
  function getDayDontonStart(date) {
    const ST = global.SolarTerms;
    const y = date.getFullYear();
    const winter = ST.jdeToJSTDate(ST.solarTermJDE(y, 18));        // 冬至 (Dec)
    const summer = ST.jdeToJSTDate(ST.solarTermJDE(y, 6));         // 夏至 (Jun)
    const winterPrev = ST.jdeToJSTDate(ST.solarTermJDE(y - 1, 18));// 前年冬至
    const summerNext = ST.jdeToJSTDate(ST.solarTermJDE(y + 1, 6)); // 翌年夏至

    const koshiWinter = findNearestUpperKoshi(winter);
    const koshiSummer = findNearestUpperKoshi(summer);
    const koshiWinterPrev = findNearestUpperKoshi(winterPrev);
    const koshiSummerNext = findNearestUpperKoshi(summerNext);

    if (date < koshiSummer) {
      return { startDate: koshiWinterPrev, startStar: 1, direction: 1, mode: '陽遁' };
    } else if (date < koshiWinter) {
      return { startDate: koshiSummer, startStar: 9, direction: -1, mode: '陰遁' };
    } else {
      return { startDate: koshiWinter, startStar: 1, direction: 1, mode: '陽遁' };
    }
  }

  function getDayStar(date) {
    const start = getDayDontonStart(date);
    const refUTC = Date.UTC(start.startDate.getFullYear(), start.startDate.getMonth(), start.startDate.getDate());
    const targetUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.round((targetUTC - refUTC) / 86400000);
    return wrap9(start.startStar + start.direction * days);
  }

  // ---------- 時盤中宮星 ----------
  // 標準ルール (日支三合グループによる):
  //   陽遁: 子・卯・午・酉日 → 子刻=一白(1), 以後+1
  //         丑・辰・未・戌日 → 子刻=四緑(4)
  //         寅・巳・申・亥日 → 子刻=七赤(7)
  //   陰遁: 子・卯・午・酉日 → 子刻=九紫(9), 以後-1
  //         丑・辰・未・戌日 → 子刻=六白(6)
  //         寅・巳・申・亥日 → 子刻=三碧(3)
  function getHourStar(date) {
    const Eto = global.Eto;
    const hourEto = Eto.getHourEto(date);
    const hourBranchIdx = hourEto.branchIdx; // 0=子刻..11=亥刻

    // 23時以降は翌日扱い
    let effDate = date;
    if (date.getHours() === 23) {
      effDate = new Date(date.getTime() + 86400000);
    }
    const dayEto = Eto.getDayEto(effDate);
    const dayBranchMod3 = dayEto.branchIdx % 3;

    const donton = getDayDontonStart(effDate);
    let startStar;
    if (donton.direction === 1) {
      startStar = dayBranchMod3 === 0 ? 1 : (dayBranchMod3 === 1 ? 4 : 7);
    } else {
      startStar = dayBranchMod3 === 0 ? 9 : (dayBranchMod3 === 1 ? 6 : 3);
    }
    return wrap9(startStar + donton.direction * hourBranchIdx);
  }

  // ---------- 後天定位による方位配置 ----------
  // 後天定位 (中宮=5):
  //   SE 4 | S  9 | SW 2
  //   E  3 | C  5 | W  7
  //   NE 8 | N  1 | NW 6
  //
  // 9つのポジションを 0..8 で表す:
  //   0:NW(乾) 1:N(坎) 2:NE(艮)
  //   3:W (兌) 4:中宮  5:E(震)
  //   6:SW(坤) 7:S(離) 8:SE(巽)
  // 標準星: [6, 1, 8, 7, 5, 3, 2, 9, 4]
  const DEFAULT_POSITION_STARS = [6, 1, 8, 7, 5, 3, 2, 9, 4];

  // 中宮=centerStar の配置を返す (9要素の配列、各要素は星番号)
  function getPositionStars(centerStar) {
    const shift = centerStar - 5;
    return DEFAULT_POSITION_STARS.map(s => wrap9(s + shift));
  }

  // 星 → そのときの配置内での position index (0..8) を返す
  function findPositionOfStar(centerStar, targetStar) {
    const stars = getPositionStars(centerStar);
    return stars.indexOf(targetStar);
  }

  // 後天定位上で position index → 宮名 (八卦名)
  // position 0..8 = NW, N, NE, W, 中, E, SW, S, SE
  const POSITION_TO_KYU_NAME = ['乾宮','坎宮','艮宮','兌宮','中宮','震宮','坤宮','離宮','巽宮'];
  const POSITION_TO_DIRECTION = ['北西','北','北東','西','中央','東','南西','南','南東'];
  // 各 position の定位星 (旧 POSITION_TO_KYU_NAME に相当する九星表示も併設)
  const POSITION_TO_DEF_KYU_NAME = ['六白宮','一白宮','八白宮','七赤宮','中宮','三碧宮','二黒宮','九紫宮','四緑宮'];

  function positionToKyu(positionIdx) {
    return {
      kyu: POSITION_TO_KYU_NAME[positionIdx],
      direction: POSITION_TO_DIRECTION[positionIdx],
      positionIdx
    };
  }

  // 対冲宮: 中央以外の8宮に対して反対側 (positionIdx を 8 - idx)
  // 0(NW) ↔ 8(SE), 1(N) ↔ 7(S), 2(NE) ↔ 6(SW), 3(W) ↔ 5(E)
  function getTaichuPosition(positionIdx) {
    if (positionIdx === 4) return null;
    return 8 - positionIdx;
  }

  // その日付が陰遁期間 (夏至甲子〜冬至甲子) に属するか
  function isInton(date) {
    return getDayDontonStart(date).direction === -1;
  }

  global.Kyusei = {
    STAR_NAMES, STAR_COLORS, STAR_ELEMENTS,
    wrap9,
    getYearStar, getMonthStar, getDayStar, getHourStar,
    getDayDontonStart, isInton,
    getPositionStars, findPositionOfStar,
    positionToKyu, getTaichuPosition,
    POSITION_TO_KYU_NAME, POSITION_TO_DIRECTION, POSITION_TO_DEF_KYU_NAME,
    DEFAULT_POSITION_STARS
  };
})(typeof window !== 'undefined' ? window : globalThis);
