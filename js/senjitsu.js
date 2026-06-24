// senjitsu.js — 選日 (吉日・凶日)
//   吉: 一粒万倍日 / 天赦日 / 甲子日 / 寅の日 / 巳の日(己巳)
//   凶: 不成就日 / 三隣亡 / 八専
(function (global) {
  'use strict';
  const Eto = global.Eto;
  const SolarTerms = global.SolarTerms;
  const Koyomi = global.Koyomi;

  // 一粒万倍日: 節月(2..1)と日支
  const ICHIRYU_TABLE = {
    2:  [1, 6],   // 寅月: 丑・午
    3:  [9, 2],   // 卯月: 酉・寅
    4:  [0, 3],   // 辰月: 子・卯
    5:  [3, 4],   // 巳月: 卯・辰
    6:  [5, 6],   // 午月: 巳・午
    7:  [6, 9],   // 未月: 午・酉
    8:  [0, 7],   // 申月: 子・未
    9:  [9, 6],   // 酉月: 酉・午
    10: [9, 0],   // 戌月: 酉・子
    11: [0, 6],   // 亥月: 子・午
    12: [3, 0],   // 子月: 卯・子
    1:  [3, 6]    // 丑月: 卯・午
  };

  // 三隣亡: 節月→該当する日支
  const SANRINBOU_TABLE = {
    2: 11, 6: 11, 10: 11,  // 寅・午・戌月 → 亥
    3: 2,  7: 2,  11: 2,   // 卯・未・亥月 → 寅
    4: 6,  8: 6,  12: 6,   // 辰・申・子月 → 午
    5: 8,  9: 8,  1: 8     // 巳・酉・丑月 → 申
  };

  // 不成就日: 旧暦月(1〜12)→旧暦日のリスト
  function fujoujuDays(oldMonth) {
    const g = (set, list) => set.indexOf(oldMonth) >= 0 ? list : null;
    return g([1,7],  [3,11,19,27]) ||
           g([2,8],  [2,10,18,26]) ||
           g([3,9],  [1,9,17,25])  ||
           g([4,10], [4,12,20,28]) ||
           g([5,11], [5,13,21,29]) ||
           g([6,12], [6,14,22,30]) ||
           [];
  }

  // 天赦日: 節月→(天干, 地支)
  function tenshaPair(setsuMonth) {
    if ([2,3,4].indexOf(setsuMonth) >= 0)  return { stem: 4, branch: 2 };  // 戊寅
    if ([5,6,7].indexOf(setsuMonth) >= 0)  return { stem: 0, branch: 6 };  // 甲午
    if ([8,9,10].indexOf(setsuMonth) >= 0) return { stem: 4, branch: 8 };  // 戊申
    return { stem: 0, branch: 0 };                                          // 甲子 (立冬〜立春)
  }

  // 八専日: 60干支のうち干支が同五行の8日 (壬子〜癸亥 12日間の "間日" を除く)
  const HASSEN_SET = new Set([48, 50, 51, 53, 55, 56, 57, 59]);

  // 1日分の判定
  function analyzeDay(date) {
    const dayEto = Eto.getDayEto(date);
    const sm = SolarTerms.getSetsuMonth(date);
    const tp = tenshaPair(sm.setsuMonth);
    const ich = ICHIRYU_TABLE[sm.setsuMonth] || [];
    const sb  = SANRINBOU_TABLE[sm.setsuMonth];
    const out = { dayEto, setsuMonth: sm.setsuMonth };

    out.kasshi      = (dayEto.index === 0);
    out.tora        = (dayEto.branchIdx === 2);
    out.mi          = (dayEto.branchIdx === 5);
    out.tsuchinotomi = (dayEto.stemIdx === 5 && dayEto.branchIdx === 5);  // 己巳
    out.tensha      = (dayEto.stemIdx === tp.stem && dayEto.branchIdx === tp.branch);
    out.ichiryu     = ich.indexOf(dayEto.branchIdx) >= 0;
    out.sanrinbou   = (sb !== undefined && dayEto.branchIdx === sb);
    out.hassen      = HASSEN_SET.has(dayEto.index);

    if (Koyomi) {
      const ky = Koyomi.getKyureki(date);
      if (ky.month) {
        const fj = fujoujuDays(ky.month);
        out.fujouju = fj.indexOf(ky.day) >= 0;
      }
    }
    return out;
  }

  // 期間内の選日を抽出
  function analyzeRange(startDate, days) {
    const result = {
      tensha: [], ichiryu: [], kasshi: [], tora: [], mi: [], tsuchinotomi: [],
      fujouju: [], sanrinbou: [], hassen: []
    };
    for (let i = 0; i < days; i++) {
      const dt = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const a = analyzeDay(dt);
      Object.keys(result).forEach(k => { if (a[k]) result[k].push(dt); });
    }
    return result;
  }

  // 1日分のラベル
  function markers(analysis) {
    const good = [], bad = [];
    if (analysis.tensha)        good.push('天赦日');
    if (analysis.ichiryu)       good.push('一粒万倍日');
    if (analysis.kasshi)        good.push('甲子日');
    if (analysis.tora)          good.push('寅の日');
    if (analysis.tsuchinotomi)  good.push('己巳日');
    else if (analysis.mi)       good.push('巳の日');
    if (analysis.fujouju)       bad.push('不成就日');
    if (analysis.sanrinbou)     bad.push('三隣亡');
    if (analysis.hassen)        bad.push('八専');
    return { good, bad };
  }

  // 各選日の意味
  const MEANING = {
    '天赦日':       '万事に大吉。新規・婚姻・開業・契約すべて吉。年に5〜6日のみ。',
    '一粒万倍日':   '一粒の籾が万倍に実る。投資・開業・財布の新調吉。',
    '甲子日':       '60日に1度の還元日。新規事業・契約の起点に吉。',
    '寅の日':       '金運。財布の新調・出資吉。「虎は千里を行き戻る」で旅・お金が還る。',
    '己巳日':       '60日に1度。弁財天の縁日で金運最良。',
    '巳の日':       '弁財天の使い。金運・芸事吉。',
    '不成就日':     '万事成就せず。新規・契約・婚姻凶。',
    '三隣亡':       '建築・地鎮祭・棟上げ凶。近隣三軒に災いを及ぼす。',
    '八専':         '陰陽五行が偏る12日間の凶日(8日)。婚姻・契約・葬儀凶。'
  };

  global.Senjitsu = { analyzeDay, analyzeRange, markers, MEANING };
})(typeof window !== 'undefined' ? window : globalThis);
