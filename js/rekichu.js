// rekichu.js — 六曜・十二直
(function (global) {
  'use strict';

  // 六曜: 旧暦月+旧暦日 mod 6 → 大安/赤口/先勝/友引/先負/仏滅
  const ROKUYOU_NAMES = ['大安','赤口','先勝','友引','先負','仏滅'];
  function rokuyou(oldMonth, oldDay) {
    if (!oldMonth || !oldDay) return '';
    const idx = ((oldMonth + oldDay) % 6 + 6) % 6;
    return ROKUYOU_NAMES[idx];
  }

  // 十二直: 月支ごとの「建日」(月支と日支が一致する日が建)
  // 寅月→建寅, 卯月→建卯, ..., 丑月→建丑
  // 月支 index と 日支 index の差で巡る
  const JUNICHOKU_NAMES = ['建','除','満','平','定','執','破','危','成','納','開','閉'];
  function junichoku(monthBranchIdx, dayBranchIdx) {
    if (typeof monthBranchIdx !== 'number' || typeof dayBranchIdx !== 'number') return '';
    const offset = ((dayBranchIdx - monthBranchIdx) % 12 + 12) % 12;
    return JUNICHOKU_NAMES[offset];
  }

  // 六曜の意味
  const ROKUYOU_MEANING = {
    '大安': '万事に吉。婚礼・移転・旅行・契約すべて吉。',
    '赤口': '正午のみ吉、他は凶。祝事は避ける。',
    '先勝': '午前吉、午後凶。急ぐ事は吉。',
    '友引': '朝晩吉、正午凶。葬儀は避ける(友を引く)。',
    '先負': '午前凶、午後吉。急用は避け穏やかに。',
    '仏滅': '万事凶。新規・祝事を避ける。'
  };

  // 十二直の意味
  const JUNICHOKU_MEANING = {
    '建': '万物を建生する大吉日。建築・開店・移転吉。',
    '除': '不浄を払い祓える日。掃除・治療吉、結婚凶。',
    '満': '物事満ち足り万事吉。婚礼・移転・開店吉。',
    '平': '物事平らかに整う日。婚礼・談判・旅行吉。',
    '定': '善悪定まる日。婚礼・移転・契約吉、訴訟凶。',
    '執': '執行・守成の日。婚礼・祭祀吉、財事凶。',
    '破': '破れる日。訴訟・破談・撤去吉、新規万事凶。',
    '危': '危うい日。万事控えめに。船旅・登山凶。',
    '成': '物事成就する日。新規開業・建築・婚礼吉。',
    '納': '物を納める日。収納・買い物吉、出費・訴訟凶。',
    '開': '開き通じる日。建築・開店・移転吉、葬儀凶。',
    '閉': '閉じ塞ぐ日。納棺・池埋め吉、開店・婚礼凶。'
  };

  global.Rekichu = {
    rokuyou, junichoku,
    ROKUYOU_NAMES, JUNICHOKU_NAMES,
    ROKUYOU_MEANING, JUNICHOKU_MEANING
  };
})(typeof window !== 'undefined' ? window : globalThis);
