// nacchin-data.js — 納音（六十花甲子の音）
(function (global) {
  'use strict';

  // 干支 index: stemIdx 0=甲..9=癸, branchIdx 0=子..11=亥
  // 60干支の通し番号 = 甲子(0),乙丑(1),...,癸亥(59) は
  //   n を 0..59 とすると stemIdx=n%10, branchIdx=n%12

  var STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  // 30種の納音（各2干支ずつ、通し番号nの若い方のペアを pairs[0] に）
  var TABLE = [
    { name: '海中金', reading: 'かいちゅうきん', element: '金', text: '海の中に眠る金。まだ姿を現さない大器の金気で、力を蓄え時機を待つ性質を表す。', pairs: ['甲子', '乙丑'] },
    { name: '炉中火', reading: 'ろちゅうか', element: '火', text: '炉の中で燃える火。周囲を照らし物を鍛える強い熱を持つが、外に出れば弱まる性質。', pairs: ['丙寅', '丁卯'] },
    { name: '大林木', reading: 'たいりんぼく', element: '木', text: '大きな林をなす木々。群れ育ち勢いがあるが、一本一本は他に支えられて伸びる性質。', pairs: ['戊辰', '己巳'] },
    { name: '路傍土', reading: 'ろぼうど', element: '土', text: '道端の土。多くの人馬に踏まれながらも万物を育む、地味だが実直な性質を表す。', pairs: ['庚午', '辛未'] },
    { name: '剣鋒金', reading: 'けんぽうきん', element: '金', text: '鍛え抜かれた剣の切先の金。鋭く強い決断力と、切り込む勢いを持つ性質を表す。', pairs: ['壬申', '癸酉'] },
    { name: '山頭火', reading: 'さんとうか', element: '火', text: '山の頂に昇る火、すなわち朝日。高く輝き広く照らすが、長くは留まらぬ性質を持つ。', pairs: ['甲戌', '乙亥'] },
    { name: '澗下水', reading: 'かんかすい', element: '水', text: '谷間を流れる細い川の水。静かに低きへ流れ、絶えず変化しながら道を見出す性質。', pairs: ['丙子', '丁丑'] },
    { name: '城頭土', reading: 'じょうとうど', element: '土', text: '城壁を築く土。人を守るために積み上げられた、堅固で頼りがいのある性質を表す。', pairs: ['戊寅', '己卯'] },
    { name: '白鑞金', reading: 'はくろうきん', element: '金', text: '柔らかく溶けやすい白鑞（すず）の金。加工しやすく形を変えやすい柔軟な性質を持つ。', pairs: ['庚辰', '辛巳'] },
    { name: '楊柳木', reading: 'ようりゅうぼく', element: '木', text: '風になびく柳の木。しなやかで折れにくく、逆境にも柔軟に順応する性質を表す。', pairs: ['壬午', '癸未'] },
    { name: '泉中水', reading: 'せんちゅうすい', element: '水', text: '地中深くから湧き出る泉の水。尽きることなく静かに湧き続ける潤いの性質を持つ。', pairs: ['甲申', '乙酉'] },
    { name: '屋上土', reading: 'おくじょうど', element: '土', text: '屋根を葺く土。人々の暮らしを雨風から守る、高い所で役目を果たす性質を表す。', pairs: ['丙戌', '丁亥'] },
    { name: '霹靂火', reading: 'へきれきか', element: '火', text: '雷鳴とともに走る稲妻の火。瞬発的で激しく、一瞬にして大きな力を発揮する性質。', pairs: ['戊子', '己丑'] },
    { name: '松柏木', reading: 'しょうはくぼく', element: '木', text: '常緑の松や柏の木。冬にも枯れず、長く変わらぬ強さと忍耐を持つ性質を表す。', pairs: ['庚寅', '辛卯'] },
    { name: '長流水', reading: 'ちょうりゅうすい', element: '水', text: '絶えず流れ続ける大河の水。留まることなく進み続け、広く行き渡る性質を持つ。', pairs: ['壬辰', '癸巳'] },
    { name: '沙中金', reading: 'さちゅうきん', element: '金', text: '砂の中に混じる砂金。目立たぬ所に価値を秘め、探し磨けば輝きを見せる性質。', pairs: ['甲午', '乙未'] },
    { name: '山下火', reading: 'さんげか', element: '火', text: '山の麓に沈む夕日の火。穏やかに周囲を照らし、静かに一日を締めくくる性質を持つ。', pairs: ['丙申', '丁酉'] },
    { name: '平地木', reading: 'へいちぼく', element: '木', text: '平らな地に育つ木。安定した土台の上で伸び伸びと、着実に成長していく性質を表す。', pairs: ['戊戌', '己亥'] },
    { name: '壁上土', reading: 'へきじょうど', element: '土', text: '壁土として塗り固められた土。家の内外を隔て守る、堅実で控えめな性質を表す。', pairs: ['庚子', '辛丑'] },
    { name: '金箔金', reading: 'きんぱくきん', element: '金', text: '薄く打ち延ばされた金箔の金。華やかに輝き人目を引くが、繊細で壊れやすい性質。', pairs: ['壬寅', '癸卯'] },
    { name: '覆燈火', reading: 'ふくとうか', element: '火', text: '灯火を覆う火、夜を照らす灯りの光。控えめだが暗闇の中で人を導く性質を持つ。', pairs: ['甲辰', '乙巳'] },
    { name: '天河水', reading: 'てんがすい', element: '水', text: '天の川、大空を流れる水。恵みの雨をもたらす壮大で清らかな性質を表す。', pairs: ['丙午', '丁未'] },
    { name: '大駅土', reading: 'たいえきど', element: '土', text: '人馬の行き交う大きな駅路の土。多くの人を迎え送る、活気と社交性を持つ性質。', pairs: ['戊申', '己酉'] },
    { name: '釵釧金', reading: 'さいせんきん', element: '金', text: '髪飾りや腕輪に加工された装飾の金。美しく華やかで、人を飾り立てる性質を持つ。', pairs: ['庚戌', '辛亥'] },
    { name: '桑柘木', reading: 'そうしゃぼく', element: '木', text: '蚕を養う桑の木。人の暮らしに役立ち、地道に恵みをもたらし続ける性質を表す。', pairs: ['壬子', '癸丑'] },
    { name: '大溪水', reading: 'たいけいすい', element: '水', text: '深い渓谷を流れ下る水。険しい地を力強く進み、勢いを増していく性質を持つ。', pairs: ['甲寅', '乙卯'] },
    { name: '沙中土', reading: 'さちゅうど', element: '土', text: '砂に混じる土。もろく見えて万物を支える基盤となる、地道で粘り強い性質を表す。', pairs: ['丙辰', '丁巳'] },
    { name: '天上火', reading: 'てんじょうか', element: '火', text: '天にかかる太陽の火。高く昇り広く世を照らす、盛んで公明な性質を持つ。', pairs: ['戊午', '己未'] },
    { name: '石榴木', reading: 'ざくろぼく', element: '木', text: '固い実をつける石榴の木。外は硬く内に豊かな実りを蓄える、強靭で豊穣な性質。', pairs: ['庚申', '辛酉'] },
    { name: '大海水', reading: 'たいかいすい', element: '水', text: 'あらゆる川を集める大海の水。広大で深く、万物を包み込む懐の深い性質を表す。', pairs: ['壬戌', '癸亥'] }
  ];

  // pairs から stemIdx/branchIdx への逆引きインデックスを構築
  // key: stemIdx + '_' + branchIdx -> TABLE の要素
  var INDEX = {};
  var NAME_INDEX = {};

  function stemIdxOf(ch) {
    return STEMS.indexOf(ch);
  }
  function branchIdxOf(ch) {
    return BRANCHES.indexOf(ch);
  }

  TABLE.forEach(function (entry) {
    entry.pairs.forEach(function (etoName) {
      var stemChar = etoName.charAt(0);
      var branchChar = etoName.charAt(1);
      var sIdx = stemIdxOf(stemChar);
      var bIdx = branchIdxOf(branchChar);
      var key = sIdx + '_' + bIdx;
      INDEX[key] = entry;
      NAME_INDEX[etoName] = entry;
    });
  });

  function toResult(entry) {
    if (!entry) return null;
    return {
      name: entry.name,
      reading: entry.reading,
      element: entry.element,
      text: entry.text
    };
  }

  function get(stemIdx, branchIdx) {
    var key = stemIdx + '_' + branchIdx;
    return toResult(INDEX[key]);
  }

  function getByName(etoName) {
    return toResult(NAME_INDEX[etoName]);
  }

  global.NacchinData = { get: get, getByName: getByName, TABLE: TABLE };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.NacchinData;
  }
})(typeof window !== 'undefined' ? window : globalThis);
