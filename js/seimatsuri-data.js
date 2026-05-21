// seimatsuri-data.js
// 星まつり各星運気表 (早見表 p.13)
// 9種の曜星と運気期。本命星から該当の曜星を特定するマッピングは
// 各宗派・伝統で異なるため、ここではデータのみ保持。判断書では曜星名と
// 本人本命星の両方を表示し、施主が照合できるようにする。

(function (global) {
  'use strict';

  // 9曜星の運気期・内容・吉凶 (九曜星運気表 より)
  // kichi: 大吉○ / 中吉◑ / 末吉◐ / 大凶●
  const SEIMATSURI_DATA = [
    { star: '月曜星', kichi: '大吉', period: '進運期', text: '堅実に物事を進めれば願望成就の年。ただし、多くを望むべからず！' },
    { star: '火曜星', kichi: '大凶', period: '不運期', text: '忍耐を守って焦らず時を待つべし！旅行と病難に注意を。' },
    { star: '水曜星', kichi: '中吉', period: '大運期', text: '努力が報われる年。ただし、自分の短所が出てしまう年でもある為、注意が必要。' },
    { star: '木曜星', kichi: '大吉', period: '楽運期', text: '全てに順調であり、人の助けも得られる。ただし、油断は禁物！' },
    { star: '金曜星', kichi: '末吉', period: '暗運期', text: '何事にもつまづき、多難な年。特に金銭に注意！信心にて克服を！' },
    { star: '土曜星', kichi: '中吉', period: '陽運期', text: '力強く前進の年。しかし、焦りは禁物！後半までゆっくりと！' },
    { star: '日曜星', kichi: '大吉', period: '幸運期', text: '諸事順調で家庭も円満。喜びも舞い込む年。ただし、新規事には注意！' },
    { star: '羅喉星', kichi: '大凶', period: '陰運期', text: '何事も思い通りの結果にならない年。時期を待つべし！病難、盗難に注意。' },
    { star: '計都星', kichi: '大凶', period: '病運期', text: '病気や迷いが多く、不運な年。現状維持に努力すべし！' }
  ];

  // 本命星 (1=一白 〜 9=九紫) と相談年から、今年の曜星 index (0〜8) を返す。
  // 妙傳寺で用いる標準的な九曜配当 (年盤中宮との関係):
  //   本命星から年盤中宮までの「進み」を計算し、それに応じて曜が決まる。
  // 伝統により定義が異なる為、ここでは「本命星と相談年中宮の差」を使う簡易計算。
  // 1: 月曜星 (進運期)  2: 火曜星  3: 水曜星  4: 木曜星  5: 金曜星
  // 6: 土曜星          7: 日曜星  8: 羅喉星  9: 計都星
  // ※マッピングは要確認。違っていれば SEIMATSURI_MAP を差し替え。
  function getYouseiIndex(honmeisei, consultYearCenter) {
    if (!honmeisei || !consultYearCenter) return null;
    // 本命星から年盤中宮までの距離 (1〜9)
    let d = ((consultYearCenter - honmeisei + 9) % 9) + 1;
    // 1〜9 を 0〜8 にして配列 index に
    return ((d - 1) % 9 + 9) % 9;
  }

  global.SeimatsuriData = {
    list: SEIMATSURI_DATA,
    get: (idx) => SEIMATSURI_DATA[idx] || null,
    getYouseiIndex
  };
})(typeof window !== 'undefined' ? window : globalThis);
