// 個人情報の扱いの頁が、述べるべきことを述べているか確かめる。
//
//   node scripts/test-privacy.mjs
//
// 事実と食い違う定めは、無いより悪い。中身が変わったらここも直すこと。

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const APP=dirname(dirname(fileURLToPath(import.meta.url))), PORT=8906, CDP=9347;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const profile=mkdtempSync(join(tmpdir(),'kp-'));
const srv=spawn('python3',['-m','http.server',String(PORT)],{cwd:APP,stdio:'ignore',detached:true});
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new',`--remote-debugging-port=${CDP}`,`--user-data-dir=${profile}`,
   '--no-first-run','--no-default-browser-check','about:blank'],{stdio:'ignore',detached:true});
let bad=0; const ok=(n,c,d='')=>{if(!c)bad++;console.log(`${c?'✓':'✗'} ${n}${d?'  '+d:''}`)};
try{
  let ws=null;
  for(let i=0;i<40;i++){await sleep(500);try{
    ws=(await fetch(`http://127.0.0.1:${CDP}/json/version`).then(r=>r.json())).webSocketDebuggerUrl;break;}catch{}}
  const sock=new WebSocket(ws); await new Promise((r,j)=>{sock.onopen=r;sock.onerror=j;});
  let id=0; const w=new Map();
  sock.onmessage=e=>{const m=JSON.parse(e.data);const x=w.get(m.id);if(x){w.delete(m.id);m.error?x.rej(new Error(JSON.stringify(m.error))):x.res(m.result);}};
  const send=(m,p={},s)=>{const i=++id;sock.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));
    return new Promise((res,rej)=>{w.set(i,{res,rej});setTimeout(()=>{if(w.delete(i))rej(new Error(m))},30000)})};
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId:sid}=await send('Target.attachToTarget',{targetId,flatten:true});
  await send('Page.enable',{},sid); await send('Runtime.enable',{},sid); await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true},sid);
  const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,awaitPromise:true,returnByValue:true},sid);
    if(r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value;};

  await send('Page.navigate',{url:`http://127.0.0.1:${PORT}/privacy.html`},sid); await sleep(1200);
  ok('開ける', (await ev('document.title'))==='個人情報の扱い');
  const t = await ev('document.body.innerText');
  for (const [name,pat] of [
    ['端末の中だけと述べている', /端末の中だけ/],
    ['音声の例外を述べている', /音声入力（🎤）|音声が端末の外へ送られます|Apple 社へ/],
    ['控えが暗号化されないと述べている', /暗号化されていません/],
    ['消え得ることを述べている', /記録は失われることがあります/],
    ['消し方を示している', /全削除/],
    ['第三者の情報である点を述べている', /ご相談者さま（第三者）の情報/],
    ['連絡先がある', /0143-22-4284/],
    ['所在がある', /室蘭市常盤町/],
    ['制定日がある', /制定　2026年8月26日/],
  ]) ok(name, pat.test(t));
  ok('広告・解析を否定している', /広告|アクセス解析/.test(t));

  // 横にはみ出していないか（iPhone の幅で）
  const overflow = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  ok('横にはみ出さない', overflow<=1, `はみ出し ${overflow}px`);
  ok('字数', t.length>1500, `${t.length}字`);

  // アプリ側からの導線
  for (const p of ['index.html','history.html','clients.html']) {
    await send('Page.navigate',{url:`http://127.0.0.1:${PORT}/${p}`},sid); await sleep(900);
    const has = await ev(`!!document.querySelector('a[href="privacy.html"]')`);
    ok(`${p} から辿れる`, has);
  }
}catch(e){ ok('試験そのもの', false, e.message); }
finally{
  try{process.kill(-chrome.pid,'SIGKILL')}catch{}
  try{process.kill(-srv.pid,'SIGKILL')}catch{}
  await sleep(300); rmSync(profile,{recursive:true,force:true});
  console.log(bad? `\n通らなかったもの ${bad}件` : '\nすべて通りました');
  process.exit(bad?1:0);
}
