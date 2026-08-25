// 鑑定の記録の取り込み・取り消し・全削除を、実際の画面で確かめる。
//
//   node scripts/test-storage.mjs
//
// 相談者の情報を扱う所なので、壊れた控えを読ませても消えないことを必ず見る。
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const APP=dirname(dirname(fileURLToPath(import.meta.url))), PORT=8904, CDP=9345;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const profile=mkdtempSync(join(tmpdir(),'kyusei3-'));
const work=mkdtempSync(join(tmpdir(),'kyusei-files-'));
const srv=spawn('python3',['-m','http.server',String(PORT)],{cwd:APP,stdio:'ignore',detached:true});
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new',`--remote-debugging-port=${CDP}`,`--user-data-dir=${profile}`,
   '--no-first-run','--no-default-browser-check','about:blank'],{stdio:'ignore',detached:true});
let bad=0; const ok=(n,c,d='')=>{if(!c)bad++;console.log(`${c?'✓':'✗'} ${n}${d?'  '+d:''}`)};

// 控えのファイルを用意する
const rec=(id,name)=>({id,name,gender:'男',age:'56',topic:'仕事のこと',consult:'2026-08-25',birth:'1970-05-15',handan:{honnin:'',nengetsu:'',naizou:'',sougou:''}});
const good=join(work,'good.json');   writeFileSync(good, JSON.stringify([rec('r1','甲 一郎'),rec('r2','乙 二郎')]));
const more=join(work,'more.json');   writeFileSync(more, JSON.stringify([rec('r2','乙 二郎（新）'),rec('r3','丙 三郎')]));
const broken=join(work,'broken.json'); writeFileSync(broken,'{ これは JSON ではない');
const junk=join(work,'junk.json');   writeFileSync(junk, JSON.stringify([{foo:1},{bar:2}]));

try{
  let ws=null;
  for(let i=0;i<40;i++){await sleep(500);try{
    ws=(await fetch(`http://127.0.0.1:${CDP}/json/version`).then(r=>r.json())).webSocketDebuggerUrl;break;}catch{}}
  const sock=new WebSocket(ws); await new Promise((r,j)=>{sock.onopen=r;sock.onerror=j;});
  let id=0; const w=new Map(); let dialogs=[]; let answer=true;
  const send=(m,p={},s)=>{const i=++id;sock.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));
    return new Promise((res,rej)=>{w.set(i,{res,rej});setTimeout(()=>{if(w.delete(i))rej(new Error(m))},30000)})};
  let SID=null;
  sock.onmessage=async e=>{const m=JSON.parse(e.data);
    const x=w.get(m.id); if(x){w.delete(m.id);m.error?x.rej(new Error(JSON.stringify(m.error))):x.res(m.result);return;}
    if(m.method==='Page.javascriptDialogOpening'){
      dialogs.push(m.params.message);
      // confirm は答えを切り替える。alert は accept のみ。
      const acc = m.params.type==='confirm' ? answer : true;
      send('Page.handleJavaScriptDialog',{accept:acc},SID).catch(()=>{});
    }};
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId:sid}=await send('Target.attachToTarget',{targetId,flatten:true}); SID=sid;
  await send('Page.enable',{},sid); await send('Runtime.enable',{},sid); await send('DOM.enable',{},sid);
  const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,awaitPromise:true,returnByValue:true},sid);
    if(r.exceptionDetails) throw new Error(r.exceptionDetails.text+' '+(r.exceptionDetails.exception?.description??'')); return r.result.value;};
  const go=async()=>{await send('Page.navigate',{url:`http://127.0.0.1:${PORT}/history.html`},sid); await sleep(900);};
  // path を選ばせ、選び札が出たら how（'merge'|'replace'|'cancel'）を押す
  const upload=async(path,how)=>{
    const {root}=await send('DOM.getDocument',{},sid);
    const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'#file-import'},sid);
    await send('DOM.setFileInputFiles',{files:[path],nodeId},sid);
    await sleep(600);
    const shown = await ev(`!document.getElementById('import-choice').hidden`);
    if (shown) {
      const btn = how==='merge'?'btn-merge':how==='replace'?'btn-replace':'btn-cancel-import';
      await ev(`document.getElementById('${btn}').click()`);
      await sleep(700);
    }
    return shown;
  };
  const count=()=>ev(`Storage.loadAll().length`);

  await go();
  ok('履歴の画面が開く', (await ev('document.title'))==='履歴');
  ok('はじめは空', (await count())===0);

  // ---- 正しい控えを取り込む ----
  dialogs=[]; await upload(good,'replace');
  ok('正しい控えを取り込める', (await count())===2, `${await count()}件`);
  ok('相談者の名が出る', /甲 一郎/.test(await ev('document.body.innerText')));

  // ---- 壊れたファイル ----
  dialogs=[]; await upload(broken,'merge');
  ok('壊れた控えで消えない', (await count())===2, `${await count()}件`);
  ok('理由を告げる', dialogs.some(d=>/JSON として読めません/.test(d)), dialogs.join(' | ').slice(0,60));

  // ---- 記録として読めない中身 ----
  dialogs=[]; await upload(junk,'merge');
  ok('読めない中身でも消えない', (await count())===2);
  ok('読める行が無いと告げる', dialogs.some(d=>/読める行がありません/.test(d)));

  // ---- 足す（merge）----
  dialogs=[]; await upload(more,'merge');
  ok('足すと3件になる', (await count())===3, `${await count()}件`);
  ok('同じ id は新しいほうを採る', /乙 二郎（新）/.test(await ev('document.body.innerText')));

  // ---- 入れ替える（replace）----
  dialogs=[]; await upload(good,'replace');
  ok('入れ替えると2件になる', (await count())===2, `${await count()}件`);
  ok('戻り口が出る', (await ev(`!document.getElementById('undo-row').hidden`)));

  // ---- やめる ----
  const before=await count();
  await upload(more,'cancel');
  ok('「やめる」で何も変わらない', (await count())===before, `${await count()}件`);

  // ---- 取り消す ----
  dialogs=[]; answer=true;
  await ev(`document.getElementById('btn-undo').click()`); await sleep(700);
  ok('取り消すと3件へ戻る', (await count())===3, `${await count()}件`);

  // ---- 全削除 ----
  dialogs=[]; answer=true;
  await ev(`document.getElementById('btn-clear').click()`); await sleep(700);
  ok('全削除で0件', (await count())===0);
  ok('取り込みの控えも残らない', (await ev(`localStorage.getItem('kyusei_records_undo')`))===null);

  // ---- 開き直しても残る ----
  await upload(good,'replace'); await go();
  ok('開き直しても残っている', (await count())===2, `${await count()}件`);
}catch(e){ ok('試験そのもの', false, e.message); }
finally{
  try{process.kill(-chrome.pid,'SIGKILL')}catch{}
  try{process.kill(-srv.pid,'SIGKILL')}catch{}
  await sleep(300); rmSync(profile,{recursive:true,force:true}); rmSync(work,{recursive:true,force:true});
  console.log(bad? `\n通らなかったもの ${bad}件` : '\nすべて通りました');
  process.exit(bad?1:0);
}
