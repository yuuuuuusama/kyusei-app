// eto.js
// 十干十二支 (干支) の計算
// - 年干支: 立春境界
// - 月干支: 節入り境界
// - 日干支: 連続日カウント
// - 時干支: 23時境界 (子の刻=23-1時)

(function (global) {
  'use strict';

  const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

  // 1900-01-01 (JST) を 甲戌日 として基準。
  // → 妙傳寺で使われる万年暦の基準に合わせて
  // (国立天文台/中国系標準では庚子=36、また一部の暦では辛丑=37も使われる)
  // この基準では 2026/5/13 = 丁亥日、1996/7/8 = 丙午日 となる
  const DAY_REF_DATE = new Date(1900, 0, 1); // 1900-01-01 JST
  const DAY_REF_INDEX = 10; // 甲戌 = 60干支の11番目 (0始まりで10)

  function stemBranchFromIndex(idx) {
    const i = ((idx % 60) + 60) % 60;
    return {
      stemIdx: i % 10,
      branchIdx: i % 12,
      stem: STEMS[i % 10],
      branch: BRANCHES[i % 12],
      name: STEMS[i % 10] + BRANCHES[i % 12],
      index: i
    };
  }

  // 年干支: 立春境界。SolarTerms.getSetsuMonth で setsuYear を取得して使う
  function getYearEto(setsuYear) {
    // 1984年 = 甲子 (西暦year - 4) % 10 = stem, (year - 4) % 12 = branch
    // ただし 1984 は 甲子 として確認済み
    // 1984: (1984-4)%10 = 1980%10 = 0 (甲) OK
    //        (1984-4)%12 = 1980%12 = 0 (子) OK
    const stemIdx = ((setsuYear - 4) % 10 + 10) % 10;
    const branchIdx = ((setsuYear - 4) % 12 + 12) % 12;
    return {
      stemIdx, branchIdx,
      stem: STEMS[stemIdx],
      branch: BRANCHES[branchIdx],
      name: STEMS[stemIdx] + BRANCHES[branchIdx]
    };
  }

  // 月干支: 節月境界。setsuYear, setsuMonth(1..12, 1=丑,2=寅,...,12=子) を受け取る
  // ※ここの setsuMonth は SolarTerms.getSetsuMonth の戻り値仕様に合わせる:
  //   2..12 は寅..子 (西暦月そのまま)、1 は丑 (西暦1月)
  function getMonthEto(setsuYear, setsuMonth) {
    // 月支 index (子=0..亥=11)
    let branchIdx;
    if (setsuMonth === 1) branchIdx = 1; // 丑
    else if (setsuMonth === 12) branchIdx = 0; // 子
    else branchIdx = setsuMonth; // 2->寅(2), ..., 11->亥(11)

    // 月干: 年干によって寅月(2月)の月干が決まる
    // 甲己年 (年干=0,5) → 寅月の月干=丙(2)
    // 乙庚年 (年干=1,6) → 寅月の月干=戊(4)
    // 丙辛年 (年干=2,7) → 寅月の月干=庚(6)
    // 丁壬年 (年干=3,8) → 寅月の月干=壬(8)
    // 戊癸年 (年干=4,9) → 寅月の月干=甲(0)
    const yearEto = getYearEto(setsuYear);
    const yearStemMod5 = yearEto.stemIdx % 5;
    const stemOfTiger = [2, 4, 6, 8, 0][yearStemMod5]; // 寅月の月干
    // 寅月から数えてのオフセット
    // setsuMonth=2(寅) → offset=0
    // setsuMonth=3(卯) → offset=1
    // ...
    // setsuMonth=12(子) → offset=10
    // setsuMonth=1(丑) → offset=11
    let offset;
    if (setsuMonth === 1) offset = 11;
    else offset = setsuMonth - 2;
    const stemIdx = (stemOfTiger + offset) % 10;
    return {
      stemIdx, branchIdx,
      stem: STEMS[stemIdx],
      branch: BRANCHES[branchIdx],
      name: STEMS[stemIdx] + BRANCHES[branchIdx]
    };
  }

  // 日干支: date (JST) を受け取る
  function getDayEto(date) {
    // 1900-01-01 を基準日として日差を求める
    const refUTC = Date.UTC(1900, 0, 1);
    const targetUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((targetUTC - refUTC) / 86400000);
    const idx = (DAY_REF_INDEX + diffDays) % 60;
    return stemBranchFromIndex(idx);
  }

  // 時干支
  // 時の境界: 23:00-01:00 = 子刻 (前夜23時から日付変更)
  // ただし、日干が決まるのは「23時前は当日、23時以降は翌日」とする学派もある
  // ここでは伝統的な「23時以降の子の刻は翌日の日干」採用
  function getHourEto(date) {
    const h = date.getHours();
    // 時支 index
    // 子刻: 23-1
    // 丑刻: 1-3
    // 寅刻: 3-5
    // 卯刻: 5-7
    // ...
    // 亥刻: 21-23
    let branchIdx;
    if (h === 23 || h === 0) branchIdx = 0; // 子
    else branchIdx = Math.floor((h + 1) / 2);
    // h=1,2 -> (h+1)/2 -> 1.5/1 = 1 (丑) OK h=1->1, h=2->1
    // h=3 -> 2 (寅) OK
    // h=21,22 -> 11 (亥)

    // 日干の決定: 23時以降は翌日の日干
    let effectiveDate = date;
    if (h === 23) {
      effectiveDate = new Date(date.getTime() + 86400000);
    }
    const dayEto = getDayEto(effectiveDate);

    // 時干: 日干によって子刻の時干が決まる
    // 甲己日 → 子刻=甲(0)
    // 乙庚日 → 子刻=丙(2)
    // 丙辛日 → 子刻=戊(4)
    // 丁壬日 → 子刻=庚(6)
    // 戊癸日 → 子刻=壬(8)
    const dayStemMod5 = dayEto.stemIdx % 5;
    const stemOfRat = [0, 2, 4, 6, 8][dayStemMod5];
    const stemIdx = (stemOfRat + branchIdx) % 10;
    return {
      stemIdx, branchIdx,
      stem: STEMS[stemIdx],
      branch: BRANCHES[branchIdx],
      name: STEMS[stemIdx] + BRANCHES[branchIdx]
    };
  }

  global.Eto = {
    STEMS, BRANCHES,
    getYearEto, getMonthEto, getDayEto, getHourEto,
    stemBranchFromIndex
  };
})(typeof window !== 'undefined' ? window : globalThis);
