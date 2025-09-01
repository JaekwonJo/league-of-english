const fs=require('fs');

// 입력 읽기: extracted.json → {title, source, passage} 사용
const pick=o=>({t:o.title||'Untitled',num:((o.source||'').match(/no\.\s*(\d+)/i)||[])[1]||o.page||'1',p:o.passage||o});
const read=()=>{try{const a=JSON.parse(fs.readFileSync(process.argv[2]||'extracted.json','utf8'));return a.slice(0,2).map(pick);}
catch(_){return[
 {t:'Sample 1',num:'1',p:"Textbooks reveal principles quickly. Yet real science wandered many paths, with false clues and revisions. We learn neat laws, not the messy years of exploration. Newton's alchemy failed, but classrooms hide that story."},
 {t:'Sample 2',num:'2',p:"Early Earth had vapor and CO2. Primitive life changed it, releasing oxygen. With land plants, oxygen rose. By 370 million years ago, it neared today's level; life on land spread. Today's atmosphere is both cause and result of life."}
];}};

// 분할/검증(원문 100%)
const nz=s=>String(s).replace(/\s+/g,''); const SENT=/[^.!?]*[.!?](?:\s+|$)/g;
const split=t=>{let m,arr=[];SENT.lastIndex=0;while(m=SENT.exec(t))arr.push({s:m.index,e:SENT.lastIndex,tx:t.slice(m.index,SENT.lastIndex)});return arr;};
const byWords=(t,k)=>{const w=(t.match(/\S+\s*/g)||[]),n=Math.ceil(w.length/k);return Array.from({length:k},(_,i)=>w.slice(i*n,(i+1)*n).join(''));};
const cut=(full,k)=>{const fst=split(full)[0]; if(!fst) throw Error('문장 부족'); const given=fst.tx.trim(); let rem=full.slice(fst.e).trim();
  const ss=split(rem); let parts=[];
  if(ss.length>=k){const base=Math.floor(ss.length/k),r=ss.length%k; let i=0; for(let j=0;j<k;j++){const take=base+(j<r?1:0); const s=ss[i].s,e=ss[i+take-1].e; parts.push(rem.slice(s,e)); i+=take;}}
  else parts=byWords(rem,k);
  if(nz(parts.join(''))!==nz(rem)) throw Error('[오류] 지문 병합 불일치(분할 실패)');
  return {given,parts};
};

// 문제 생성/출력
const make=(obj,k)=>{const L='ABCDE'.slice(0,k).split(''); const {given,parts}=cut(obj.p,k);
  const items=parts.map((x,i)=>({l:L[i],x})).sort(()=>Math.random()-0.5);
  return {title:obj.t,number:obj.num,given,items,ans:L.join('-'),order:items.map(o=>o.l).join('-')};};
const print=q=>{console.log(`\n제목: ${q.title}\n문제번호: ${q.number}`);
  console.log('Q. 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.\n'+`[주어진 문장] ${q.given}\n`);
  q.items.forEach(o=>console.log(`${o.l}. ${o.x.trim()}`));
  console.log(`\n정답(교사용): ${q.ans}  |  제시 순서: ${q.order}`);};

// 실행: 1번 지문→기본(A-B-C), 2번 지문→고급(A-B-C-D-E)
(function(){const [a,b]=read(); print(make(a,3)); print(make(b,5));})();

module.exports = { make, cut };