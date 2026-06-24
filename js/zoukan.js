// zoukan.js — 蔵干 (各支に含まれる天干) + 通変
(function (global) {
  'use strict';
  const Eto = global.Eto;

  // 各支の蔵干 (本気・中気・余気の順)
  const ZOUKAN = {
    '子': ['癸'],
    '丑': ['己','癸','辛'],
    '寅': ['甲','丙','戊'],
    '卯': ['乙'],
    '辰': ['戊','乙','癸'],
    '巳': ['丙','戊','庚'],
    '午': ['丁','己'],
    '未': ['己','丁','乙'],
    '申': ['庚','壬','戊'],
    '酉': ['辛'],
    '戌': ['戊','辛','丁'],
    '亥': ['壬','甲']
  };

  // 干 → 五行・陰陽
  const STEM_ELEM   = ['木','木','火','火','土','土','金','金','水','水'];
  const STEM_YANG   = [true,false,true,false,true,false,true,false,true,false]; // 陽=true

  const PRODUCES = { '木':'火','火':'土','土':'金','金':'水','水':'木' };
  const CONTROLS = { '木':'土','土':'水','水':'火','火':'金','金':'木' };

  // 自(日干) → 他干 の通変
  function tsuhen(selfStemIdx, otherStemIdx) {
    const a = STEM_ELEM[selfStemIdx], b = STEM_ELEM[otherStemIdx];
    const sameYY = STEM_YANG[selfStemIdx] === STEM_YANG[otherStemIdx];
    if (a === b)              return sameYY ? '比肩' : '劫財';
    if (PRODUCES[a] === b)    return sameYY ? '食神' : '傷官';
    if (CONTROLS[a] === b)    return sameYY ? '偏財' : '正財';
    if (CONTROLS[b] === a)    return sameYY ? '偏官' : '正官';
    if (PRODUCES[b] === a)    return sameYY ? '偏印' : '印綬';
    return '';
  }

  // 干名 → idx
  function stemIdxOf(name) {
    return Eto.STEMS.indexOf(name);
  }

  // 1柱分の解析
  function analyzePillar(eto, dayStemIdx) {
    if (!eto) return null;
    const zk = ZOUKAN[eto.branch] || [];
    const stemTsu = (typeof dayStemIdx === 'number')
      ? tsuhen(dayStemIdx, eto.stemIdx) : '';
    const zoukanList = zk.map(name => ({
      name,
      tsuhen: (typeof dayStemIdx === 'number') ? tsuhen(dayStemIdx, stemIdxOf(name)) : ''
    }));
    return {
      stem: eto.stem, branch: eto.branch,
      stemTsuhen: stemTsu,
      zoukan: zoukanList
    };
  }

  global.Zoukan = { ZOUKAN, tsuhen, analyzePillar };
})(typeof window !== 'undefined' ? window : globalThis);
