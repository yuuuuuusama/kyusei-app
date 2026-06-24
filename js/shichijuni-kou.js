// shichijuni-kou.js — 七十二候 (24節気 × 3候)
(function (global) {
  'use strict';
  const ST = global.SolarTerms;

  // 立春から順に並べた72候。各エントリ = { kanji, yomi }
  // 節気と候の対応: idx = 節気順序(立春=0..大寒=23) × 3 + (0:初候/1:次候/2:末候)
  const KOU = [
    // 立春
    { kanji: '東風解凍', yomi: 'はるかぜこおりをとく' },
    { kanji: '黄鶯睍睆', yomi: 'うぐいすなく' },
    { kanji: '魚上氷',   yomi: 'うおこおりをいずる' },
    // 雨水
    { kanji: '土脉潤起', yomi: 'つちのしょううるおいおこる' },
    { kanji: '霞始靆',   yomi: 'かすみはじめてたなびく' },
    { kanji: '草木萠動', yomi: 'そうもくめばえいずる' },
    // 啓蟄
    { kanji: '蟄虫啓戸', yomi: 'すごもりむしとをひらく' },
    { kanji: '桃始笑',   yomi: 'ももはじめてさく' },
    { kanji: '菜虫化蝶', yomi: 'なむしちょうとなる' },
    // 春分
    { kanji: '雀始巣',   yomi: 'すずめはじめてすくう' },
    { kanji: '桜始開',   yomi: 'さくらはじめてひらく' },
    { kanji: '雷乃発声', yomi: 'かみなりすなわちこえをはっす' },
    // 清明
    { kanji: '玄鳥至',   yomi: 'つばめきたる' },
    { kanji: '鴻雁北',   yomi: 'こうがんかえる' },
    { kanji: '虹始見',   yomi: 'にじはじめてあらわる' },
    // 穀雨
    { kanji: '葭始生',   yomi: 'あしはじめてしょうず' },
    { kanji: '霜止出苗', yomi: 'しもやんでなえいずる' },
    { kanji: '牡丹華',   yomi: 'ぼたんはなさく' },
    // 立夏
    { kanji: '蛙始鳴',   yomi: 'かわずはじめてなく' },
    { kanji: '蚯蚓出',   yomi: 'みみずいずる' },
    { kanji: '竹笋生',   yomi: 'たけのこしょうず' },
    // 小満
    { kanji: '蚕起食桑', yomi: 'かいこおきてくわをはむ' },
    { kanji: '紅花栄',   yomi: 'べにばなさかう' },
    { kanji: '麦秋至',   yomi: 'むぎのときいたる' },
    // 芒種
    { kanji: '蟷螂生',   yomi: 'かまきりしょうず' },
    { kanji: '腐草為蛍', yomi: 'くされたるくさほたるとなる' },
    { kanji: '梅子黄',   yomi: 'うめのみきばむ' },
    // 夏至
    { kanji: '乃東枯',   yomi: 'なつかれくさかるる' },
    { kanji: '菖蒲華',   yomi: 'あやめはなさく' },
    { kanji: '半夏生',   yomi: 'はんげしょうず' },
    // 小暑
    { kanji: '温風至',   yomi: 'あつかぜいたる' },
    { kanji: '蓮始開',   yomi: 'はすはじめてひらく' },
    { kanji: '鷹乃学習', yomi: 'たかすなわちわざをならう' },
    // 大暑
    { kanji: '桐始結花', yomi: 'きりはじめてはなをむすぶ' },
    { kanji: '土潤溽暑', yomi: 'つちうるおうてむしあつし' },
    { kanji: '大雨時行', yomi: 'たいうときどきにふる' },
    // 立秋
    { kanji: '涼風至',   yomi: 'すずかぜいたる' },
    { kanji: '寒蝉鳴',   yomi: 'ひぐらしなく' },
    { kanji: '蒙霧升降', yomi: 'ふかききりまとう' },
    // 処暑
    { kanji: '綿柎開',   yomi: 'わたのはなしべひらく' },
    { kanji: '天地始粛', yomi: 'てんちはじめてさむし' },
    { kanji: '禾乃登',   yomi: 'こくものすなわちみのる' },
    // 白露
    { kanji: '草露白',   yomi: 'くさのつゆしろし' },
    { kanji: '鶺鴒鳴',   yomi: 'せきれいなく' },
    { kanji: '玄鳥去',   yomi: 'つばめさる' },
    // 秋分
    { kanji: '雷乃収声', yomi: 'かみなりすなわちこえをおさむ' },
    { kanji: '蟄虫坏戸', yomi: 'むしかくれてとをふさぐ' },
    { kanji: '水始涸',   yomi: 'みずはじめてかるる' },
    // 寒露
    { kanji: '鴻雁来',   yomi: 'こうがんきたる' },
    { kanji: '菊花開',   yomi: 'きくのはなひらく' },
    { kanji: '蟋蟀在戸', yomi: 'きりぎりすとにあり' },
    // 霜降
    { kanji: '霜始降',   yomi: 'しもはじめてふる' },
    { kanji: '霎時施',   yomi: 'こさめときどきふる' },
    { kanji: '楓蔦黄',   yomi: 'もみじつたきばむ' },
    // 立冬
    { kanji: '山茶始開', yomi: 'つばきはじめてひらく' },
    { kanji: '地始凍',   yomi: 'ちはじめてこおる' },
    { kanji: '金盞香',   yomi: 'きんせんかさく' },
    // 小雪
    { kanji: '虹蔵不見', yomi: 'にじかくれてみえず' },
    { kanji: '朔風払葉', yomi: 'きたかぜこのはをはらう' },
    { kanji: '橘始黄',   yomi: 'たちばなはじめてきばむ' },
    // 大雪
    { kanji: '閉塞成冬', yomi: 'そらさむくふゆとなる' },
    { kanji: '熊蟄穴',   yomi: 'くまあなにこもる' },
    { kanji: '鱖魚群',   yomi: 'さけのうおむらがる' },
    // 冬至
    { kanji: '乃東生',   yomi: 'なつかれくさしょうず' },
    { kanji: '麋角解',   yomi: 'さわしかつのおる' },
    { kanji: '雪下出麦', yomi: 'ゆきわたりてむぎいずる' },
    // 小寒
    { kanji: '芹乃栄',   yomi: 'せりすなわちさかう' },
    { kanji: '水泉動',   yomi: 'しみずあたたかをふくむ' },
    { kanji: '雉始雊',   yomi: 'きじはじめてなく' },
    // 大寒
    { kanji: '款冬華',   yomi: 'ふきのはなさく' },
    { kanji: '水沢腹堅', yomi: 'さわみずこおりつめる' },
    { kanji: '鶏始乳',   yomi: 'にわとりはじめてとやにつく' }
  ];

  // 節気名 (立春=0..大寒=23の順)
  const SEKKI_ORDER = [
    '立春','雨水','啓蟄','春分','清明','穀雨',
    '立夏','小満','芒種','夏至','小暑','大暑',
    '立秋','処暑','白露','秋分','寒露','霜降',
    '立冬','小雪','大雪','冬至','小寒','大寒'
  ];

  // SolarTerms の k (k=0:春分..23:啓蟄) → 立春起点の節気順(0..23)
  // 立春(k=21)=0, 雨水(k=22)=1, 啓蟄(k=23)=2, 春分(k=0)=3, ...
  function kToOrder(k) {
    return ((k - 21 + 24) % 24);
  }

  // 直前の節気と次の節気を探す
  function findSekkiBounds(date) {
    const candidates = [];
    for (const y of [date.getFullYear() - 1, date.getFullYear(), date.getFullYear() + 1]) {
      for (let k = 0; k < 24; k++) {
        const jde = ST.solarTermJDE(y, k);
        const t = ST.jdeToJSTDate(jde);
        candidates.push({ k, t });
      }
    }
    candidates.sort((a, b) => a.t - b.t);
    let cur = null, nxt = null;
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i].t <= date) cur = candidates[i];
      else { nxt = candidates[i]; break; }
    }
    return { cur, nxt };
  }

  // 与えられた日が属する候
  function findCurrentKou(date) {
    const { cur, nxt } = findSekkiBounds(date);
    if (!cur || !nxt) return null;
    const totalDays = (nxt.t - cur.t) / 86400000;
    const since = (date - cur.t) / 86400000;
    const candle = Math.min(Math.floor((since / totalDays) * 3), 2);
    const order = kToOrder(cur.k);
    const kouIdx = order * 3 + candle;
    return {
      kouIdx,
      sekkiName: SEKKI_ORDER[order],
      sekkiK: cur.k,
      sekkiStart: cur.t,
      sekkiEnd: nxt.t,
      candle,  // 0=初, 1=次, 2=末
      candleName: ['初候','次候','末候'][candle],
      daysSinceSekki: Math.floor(since),
      kanji: KOU[kouIdx].kanji,
      yomi:  KOU[kouIdx].yomi
    };
  }

  global.ShichijuniKou = { findCurrentKou, KOU, SEKKI_ORDER, findSekkiBounds, kToOrder };
})(typeof window !== 'undefined' ? window : globalThis);
