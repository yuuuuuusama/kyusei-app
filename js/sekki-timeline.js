// sekki-timeline.js — 節気タイムライン (前/現/次)
(function (global) {
  'use strict';
  const SK = global.ShichijuniKou;

  function info(date) {
    const { cur, nxt } = SK.findSekkiBounds(date);
    if (!cur || !nxt) return null;
    // 前節気は cur から1つ前
    // 候補は SK.findSekkiBounds と同じ生成のため再度ループ
    const prevDate = (function () {
      const ST = global.SolarTerms;
      const candidates = [];
      for (const y of [date.getFullYear() - 1, date.getFullYear(), date.getFullYear() + 1]) {
        for (let k = 0; k < 24; k++) {
          const jde = ST.solarTermJDE(y, k);
          candidates.push({ k, t: ST.jdeToJSTDate(jde) });
        }
      }
      candidates.sort((a,b) => a.t - b.t);
      let last = null;
      for (let i = 0; i < candidates.length; i++) {
        if (candidates[i].t < cur.t) last = candidates[i];
        else break;
      }
      return last;
    })();
    const since = Math.floor((date - cur.t) / 86400000);
    const until = Math.ceil((nxt.t - date) / 86400000);
    return {
      prev: prevDate ? { name: SK.SEKKI_ORDER[SK.kToOrder(prevDate.k)], date: prevDate.t } : null,
      cur:  { name: SK.SEKKI_ORDER[SK.kToOrder(cur.k)], date: cur.t, daysSince: since },
      next: { name: SK.SEKKI_ORDER[SK.kToOrder(nxt.k)], date: nxt.t, daysUntil: until }
    };
  }

  global.SekkiTimeline = { info };
})(typeof window !== 'undefined' ? window : globalThis);
