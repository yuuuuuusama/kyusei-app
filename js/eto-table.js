// eto-table.js
// 十二支吉凶象意表 (生年・生月・生日 干支 × 12支 関係)
// データ出典: 十二支吉凶象意表.xlsx
(function (global) {
  'use strict';

const ETO_RELATION_TABLE = {
  '子': {
    '子': { label: '', symbol: '〇' },
    '丑': { label: '合', symbol: '◎' },
    '寅': { label: '', symbol: '〇' },
    '卯': { label: '刑', symbol: '▲' },
    '辰': { label: '三合', symbol: '☆' },
    '巳': { label: '', symbol: '〇' },
    '午': { label: '冲', symbol: '×' },
    '未': { label: '害', symbol: '▲' },
    '申': { label: '三合', symbol: '☆' },
    '酉': { label: '破', symbol: '▲' },
    '戌': { label: '', symbol: '〇' },
    '亥': { label: '', symbol: '〇' }
  },
  '丑': {
    '子': { label: '合', symbol: '◎' },
    '丑': { label: '', symbol: '〇' },
    '寅': { label: '', symbol: '〇' },
    '卯': { label: '', symbol: '〇' },
    '辰': { label: '破', symbol: '▲' },
    '巳': { label: '三合', symbol: '☆' },
    '午': { label: '害', symbol: '▲' },
    '未': { label: '冲', symbol: '×' },
    '申': { label: '', symbol: '〇' },
    '酉': { label: '三合', symbol: '☆' },
    '戌': { label: '刑', symbol: '▲' },
    '亥': { label: '', symbol: '〇' }
  },
  '寅': {
    '子': { label: '', symbol: '〇' },
    '丑': { label: '', symbol: '〇' },
    '寅': { label: '', symbol: '〇' },
    '卯': { label: '', symbol: '〇' },
    '辰': { label: '', symbol: '〇' },
    '巳': { label: '刑害', symbol: '●' },
    '午': { label: '三合', symbol: '☆' },
    '未': { label: '', symbol: '〇' },
    '申': { label: '冲', symbol: '×' },
    '酉': { label: '', symbol: '〇' },
    '戌': { label: '三合', symbol: '☆' },
    '亥': { label: '合', symbol: '◎' }
  },
  '卯': {
    '子': { label: '刑', symbol: '▲' },
    '丑': { label: '', symbol: '〇' },
    '寅': { label: '', symbol: '〇' },
    '卯': { label: '', symbol: '〇' },
    '辰': { label: '害', symbol: '▲' },
    '巳': { label: '', symbol: '〇' },
    '午': { label: '破', symbol: '▲' },
    '未': { label: '三合', symbol: '☆' },
    '申': { label: '', symbol: '〇' },
    '酉': { label: '冲', symbol: '×' },
    '戌': { label: '合', symbol: '◎' },
    '亥': { label: '三合', symbol: '☆' }
  },
  '辰': {
    '子': { label: '三合', symbol: '☆' },
    '丑': { label: '破', symbol: '▲' },
    '寅': { label: '', symbol: '〇' },
    '卯': { label: '害', symbol: '▲' },
    '辰': { label: '刑', symbol: '▲' },
    '巳': { label: '', symbol: '〇' },
    '午': { label: '', symbol: '〇' },
    '未': { label: '', symbol: '〇' },
    '申': { label: '三合', symbol: '☆' },
    '酉': { label: '合', symbol: '◎' },
    '戌': { label: '冲', symbol: '×' },
    '亥': { label: '', symbol: '〇' }
  },
  '巳': {
    '子': { label: '', symbol: '〇' },
    '丑': { label: '三合', symbol: '☆' },
    '寅': { label: '刑害', symbol: '●' },
    '卯': { label: '', symbol: '〇' },
    '辰': { label: '', symbol: '〇' },
    '巳': { label: '', symbol: '〇' },
    '午': { label: '', symbol: '〇' },
    '未': { label: '', symbol: '〇' },
    '申': { label: '合刑破', symbol: '▲' },
    '酉': { label: '三合', symbol: '☆' },
    '戌': { label: '', symbol: '〇' },
    '亥': { label: '冲', symbol: '×' }
  },
  '午': {
    '子': { label: '冲', symbol: '×' },
    '丑': { label: '害', symbol: '▲' },
    '寅': { label: '三合', symbol: '☆' },
    '卯': { label: '破', symbol: '▲' },
    '辰': { label: '', symbol: '〇' },
    '巳': { label: '', symbol: '〇' },
    '午': { label: '刑', symbol: '▲' },
    '未': { label: '合', symbol: '◎' },
    '申': { label: '', symbol: '〇' },
    '酉': { label: '', symbol: '〇' },
    '戌': { label: '三合', symbol: '☆' },
    '亥': { label: '', symbol: '〇' }
  },
  '未': {
    '子': { label: '害', symbol: '▲' },
    '丑': { label: '冲', symbol: '×' },
    '寅': { label: '', symbol: '〇' },
    '卯': { label: '三合', symbol: '☆' },
    '辰': { label: '', symbol: '〇' },
    '巳': { label: '', symbol: '〇' },
    '午': { label: '合', symbol: '◎' },
    '未': { label: '', symbol: '〇' },
    '申': { label: '', symbol: '〇' },
    '酉': { label: '', symbol: '〇' },
    '戌': { label: '刑破', symbol: '●' },
    '亥': { label: '三合', symbol: '☆' }
  },
  '申': {
    '子': { label: '三合', symbol: '☆' },
    '丑': { label: '', symbol: '〇' },
    '寅': { label: '冲', symbol: '×' },
    '卯': { label: '', symbol: '〇' },
    '辰': { label: '三合', symbol: '☆' },
    '巳': { label: '合刑破', symbol: '▲' },
    '午': { label: '', symbol: '〇' },
    '未': { label: '', symbol: '〇' },
    '申': { label: '', symbol: '〇' },
    '酉': { label: '', symbol: '〇' },
    '戌': { label: '', symbol: '〇' },
    '亥': { label: '害', symbol: '▲' }
  },
  '酉': {
    '子': { label: '破', symbol: '▲' },
    '丑': { label: '三合', symbol: '☆' },
    '寅': { label: '', symbol: '〇' },
    '卯': { label: '冲', symbol: '×' },
    '辰': { label: '合', symbol: '◎' },
    '巳': { label: '三合', symbol: '☆' },
    '午': { label: '', symbol: '〇' },
    '未': { label: '', symbol: '〇' },
    '申': { label: '', symbol: '〇' },
    '酉': { label: '刑', symbol: '▲' },
    '戌': { label: '害', symbol: '▲' },
    '亥': { label: '', symbol: '〇' }
  },
  '戌': {
    '子': { label: '', symbol: '〇' },
    '丑': { label: '刑', symbol: '▲' },
    '寅': { label: '三合', symbol: '☆' },
    '卯': { label: '合', symbol: '◎' },
    '辰': { label: '冲', symbol: '×' },
    '巳': { label: '', symbol: '〇' },
    '午': { label: '三合', symbol: '☆' },
    '未': { label: '刑破', symbol: '●' },
    '申': { label: '', symbol: '〇' },
    '酉': { label: '害', symbol: '▲' },
    '戌': { label: '', symbol: '〇' },
    '亥': { label: '', symbol: '〇' }
  },
  '亥': {
    '子': { label: '', symbol: '〇' },
    '丑': { label: '', symbol: '〇' },
    '寅': { label: '合破', symbol: '〇' },
    '卯': { label: '三合', symbol: '☆' },
    '辰': { label: '', symbol: '〇' },
    '巳': { label: '冲', symbol: '×' },
    '午': { label: '', symbol: '〇' },
    '未': { label: '三合', symbol: '☆' },
    '申': { label: '害', symbol: '▲' },
    '酉': { label: '', symbol: '〇' },
    '戌': { label: '', symbol: '〇' },
    '亥': { label: '刑', symbol: '▲' }
  }
};

  global.EtoTable = ETO_RELATION_TABLE;
})(typeof window !== 'undefined' ? window : globalThis);
