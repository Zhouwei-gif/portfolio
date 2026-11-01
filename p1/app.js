/* 知识库问答 · 静态版（浏览器内 BM25 + 抽取式回答 + 30 条评测）
 * 逻辑与 app.py 对齐：同样的分词、切块、BM25、域闸门、rerank 与指标定义。
 * 差别只有一处：延迟在本机浏览器里测，比 Python 服务更快，数字仅作参考。
 */
const $ = (s) => document.querySelector(s);
const WORD = /[a-zA-Z][a-zA-Z0-9_\-.]+/g;
const CJK = /[\u4e00-\u9fff]/g;
// 与 app.py 保持一致：Python 的 STOP 用 split() 切分，实际只有一个长串，等于不过滤停用词。
const STOP = new Set();
const DOMAIN = new Set(`rag 检索 召回 向量 切分 分块 chunk 评估 评测 忠实 精确 幻觉 引用 embedding 索引 改写
重排 rerank bm25 知识库 上下文 数据集 标注 milvus faiss 提示词 prompt agent 解析 切片 语料 问答系统 加载 文档 生成`.split(/\s+/).filter(Boolean));
const DEF_WORDS = ["是","指","包括","衡量","用于","需要","分为","通过","可以","表示","称为","意味着","指的是","即","代表"];
const BAD_HINTS = ["表 1","见表","如下图","下图","代码","```","演示","http","如图","示例代码","输出："];
const KEY = "rag-static-runs-v1";

const SEED_RUNS = [
  {at:"2026-11-01 02:42",chunk_size:240,rerank:false,cases:30,hit3:0.818,coverage:0.727,refusal_acc:1,p50_ms:7.6,p95_ms:13.0,seed:true},
  {at:"2026-11-01 02:42",chunk_size:360,rerank:false,cases:30,hit3:0.818,coverage:0.773,refusal_acc:1,p50_ms:5.4,p95_ms:7.8,seed:true},
  {at:"2026-11-01 02:38",chunk_size:520,rerank:false,cases:30,hit3:0.955,coverage:0.773,refusal_acc:1,p50_ms:3.6,p95_ms:4.9,seed:true},
  {at:"2026-11-01 02:59",chunk_size:520,rerank:true,cases:30,hit3:0.955,coverage:0.818,refusal_acc:1,p50_ms:4.7,p95_ms:6.5,seed:true},
];

let DOCS = [];
let CASES = [];
let IDX = null;
let IDX_SIZE = 0;

/* ---------- 文本处理 ---------- */
function tokens(text){
  const low = String(text).toLowerCase();
  const out = (low.match(WORD) || []).filter(w => w.length > 1);
  const chars = low.match(CJK) || [];
  for (let i = 0; i < chars.length - 1; i++) out.push(chars[i] + chars[i + 1]);
  return out.filter(t => !STOP.has(t));
}
function cleanProse(text){
  let t = text.replace(/```[\s\S]*?```/g, " ")
              .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
              .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const keep = [];
  for (const raw of t.split(/\r?\n/)){
    const s = raw.trim().replace(/\*\*/g, "").trim();
    if (!s || ["#","|","-","*",">","1.","2.","3.","4.","5."].some(p => s.startsWith(p))) continue;
    if (s.includes("`") || s.includes("{") || s.includes("}")) continue;
    if ((s.match(/=/g) || []).length > 2) continue;
    const cjk = (s.match(CJK) || []).length;
    if (cjk < 6 && !/[a-zA-Z]{4,}/.test(s)) continue;
    keep.push(s);
  }
  return keep.join("\n");
}
function chunkText(text, size){
  const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let buf = "";
  for (const p of paras){
    if (buf.length + p.length + 1 <= size){
      buf = (buf + "\n" + p).trim();
    } else {
      if (buf) chunks.push(buf);
      if (p.length <= size){
        buf = p;
      } else {
        const step = Math.max(size - Math.floor(size / 5), 50);
        for (let i = 0; i < p.length; i += step) chunks.push(p.slice(i, i + size));
        buf = "";
      }
    }
  }
  if (buf) chunks.push(buf);
  return chunks.filter(c => c.length > 30);
}
function hasDomain(q){
  const low = q.toLowerCase();
  for (const k of DOMAIN) if (low.includes(k)) return true;
  return false;
}

/* ---------- 索引与检索 ---------- */
function buildIndex(size){
  if (IDX && IDX_SIZE === size) return IDX;
  const chunks = [];
  for (const d of DOCS){
    chunkText(d.body, size).forEach((text, n) => {
      const tf = new Map();
      const tk = tokens(text);
      for (const t of tk) tf.set(t, (tf.get(t) || 0) + 1);
      const ttf = new Map();
      for (const t of tokens(d.title)) ttf.set(t, (ttf.get(t) || 0) + 1);
      chunks.push({doc_id:d.id, title:d.title, url:d.url, n, text, tf, ttf, len:tk.length});
    });
  }
  const df = new Map();
  for (const c of chunks) for (const t of c.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const avgdl = chunks.length ? chunks.reduce((n, c) => n + c.len, 0) / chunks.length : 0;
  IDX = {size, chunks, df, avgdl, docs: DOCS};
  IDX_SIZE = size;
  return IDX;
}
function search(query, k = 5){
  const idx = buildIndex(IDX_SIZE || 360);
  const qt = [...new Set(tokens(query))];
  if (!qt.length) return [];
  const n = idx.chunks.length;
  const out = [];
  for (const ch of idx.chunks){
    let s = 0;
    for (const t of qt){
      const df = idx.df.get(t) || 0;
      const idf = df ? Math.log(1 + (n - df + 0.5) / (df + 0.5)) : 0;
      const tf = ch.tf.get(t) || 0;
      if (tf){
        const dl = ch.len || 1;
        s += idf * (tf * 2.5) / (tf + 1.5 * (0.25 + 0.75 * dl / (idx.avgdl || 1)));
      }
      const ttf = ch.ttf.get(t) || 0;
      if (ttf) s += 1.0 * idf * ttf;
    }
    if (s > 0) out.push([s, ch]);
  }
  out.sort((a, b) => b[0] - a[0]);
  return out.slice(0, k).map(([s, ch]) => ({...ch, score: Math.round(s * 1000) / 1000}));
}

/* ---------- 抽取式回答 ---------- */
function bestSentences(text, query, limit = 2){
  const q = new Set(tokens(query));
  const prose = cleanProse(text);
  const sents = [];
  for (const raw of prose.split(/(?<=[。！？!?；;])\s*|\n/)){
    const s = raw.trim().replace(/^\*+|\*+$/g, "").trim();
    if (s.length < 18 || BAD_HINTS.some(h => s.includes(h))) continue;
    if (/^[第（(]/.test(s) && s.length < 30) continue;
    const cjk = (s.match(CJK) || []).length;
    if (cjk < s.length * 0.45) continue;
    sents.push(s);
  }
  if (!sents.length) return prose.slice(0, 160).trim();
  const score = (s) => {
    const overlap = [...q].filter(t => new Set(tokens(s)).has(t)).length;
    const bonus = DEF_WORDS.some(w => s.includes(w)) ? 2 : 0;
    return overlap * 2 + bonus - (s.length > 200 ? 1 : 0);
  };
  const ranked = [...sents].sort((a, b) => score(b) - score(a));
  const picked = ranked.slice(0, limit).filter(s => [...q].some(t => new Set(tokens(s)).has(t)));
  return picked.length ? picked.join("") : sents[0].slice(0, 200);
}
function rerank(query, hits, k = 5){
  const q = new Set(tokens(query));
  const compact = query.replace(/\s+/g, "");
  const top = hits[0].score || 1;
  const out = hits.map(h => {
    const cov = [...q].filter(t => h.tf.has(t)).length / Math.max(q.size, 1);
    const phrase = compact.length >= 4 && h.text.replace(/\s+/g, "").includes(compact) ? 0.15 : 0;
    const title = h.title.replace(/\s+/g, "").includes(compact) ? 0.1 : 0;
    return {...h, bm25: h.score, score: Math.round((0.45 * (h.score / top) + 0.4 * cov + phrase + title) * 10000) / 10000};
  });
  return out.sort((a, b) => b.score - a.score).slice(0, k);
}
function cite(hits){
  const seen = new Set(), out = [];
  for (const h of hits){
    if (seen.has(h.doc_id)) continue;
    seen.add(h.doc_id);
    out.push({doc_id:h.doc_id, title:h.title, url:h.url, chunk:h.n, score:h.score});
    if (out.length === 3) break;
  }
  return out;
}
function refuse(hits, t0){
  return {
    answer: "知识库里没有相关内容。这个问题超出了当前语料的范围——可以换个问法，或看「覆盖范围」里已收录的主题。",
    refused: true, citations: [],
    retrieved: hits.map(h => ({doc_id:h.doc_id, title:h.title, n:h.n, score:h.score, text:h.text.slice(0, 200)})),
    latency_ms: +(performance.now() - t0).toFixed(2), chunk_size: IDX_SIZE,
  };
}
function answer(query, useRerank = false){
  const t0 = performance.now();
  let hits = search(query, useRerank ? 20 : 5);
  if (useRerank && hits.length) hits = rerank(query, hits, 5);
  if (!hasDomain(query) || !hits.length) return refuse(hits, t0);
  const qt = new Set(tokens(query));
  let top = hits[0];
  const gated = top.bm25 !== undefined ? top.bm25 : top.score;
  if (gated < 5) return refuse(hits, t0);
  let body = "", used = top;
  for (const h of hits){
    body = bestSentences(h.text, query, 2);
    if (body){ used = h; break; }
  }
  if (!body) return refuse(hits, t0);
  top = used;
  let ans = `根据《${top.title}》：${body}`;
  if (hits.length > 1 && hits[1].score > top.score * 0.6) ans += `（另见《${hits[1].title}》）`;
  return {
    answer: ans, refused: false, citations: cite(hits),
    retrieved: hits.map(h => ({doc_id:h.doc_id, title:h.title, n:h.n, score:h.score, text:h.text.slice(0, 400)})),
    latency_ms: +(performance.now() - t0).toFixed(2), chunk_size: IDX_SIZE,
  };
}

/* ---------- 评测 ---------- */
function runEval(chunkSize, useRerank){
  if (chunkSize !== IDX_SIZE) buildIndex(chunkSize);
  const rows = [], lat = [];
  let hit = 0, cov = 0, answerable = 0, correct = 0;
  for (const c of CASES){
    const r = answer(c.q, useRerank);
    lat.push(r.latency_ms);
    const docs = r.retrieved.slice(0, 3).map(x => x.doc_id);
    if (c.type === "refusal"){
      const ok = r.refused;
      correct += ok ? 1 : 0;
      rows.push({id:c.id, q:c.q, type:"refusal", pass:ok});
    } else {
      answerable++;
      const h = c.expect_docs.some(d => docs.includes(d));
      const covered = (c.expect_any || []).some(k => r.answer.includes(k));
      hit += h ? 1 : 0; cov += covered ? 1 : 0;
      correct += r.refused ? 0 : 1;
      rows.push({id:c.id, q:c.q, type:"answer", hit:h, covered, refused:r.refused, docs});
    }
  }
  lat.sort((a, b) => a - b);
  const p50 = lat.length ? lat[Math.floor(lat.length / 2)] : 0;
  const p95 = lat.length ? lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))] : 0;
  const summary = {
    at: new Date().toLocaleString("zh-CN", {hour12:false}).replace(/\//g, "-"),
    chunk_size: chunkSize, rerank: useRerank, cases: CASES.length,
    hit3: answerable ? +(hit / answerable).toFixed(3) : 0,
    coverage: answerable ? +(cov / answerable).toFixed(3) : 0,
    refusal_acc: CASES.length ? +(correct / CASES.length).toFixed(3) : 0,
    p50_ms: +p50.toFixed(2), p95_ms: +p95.toFixed(2),
  };
  const runs = loadRuns();
  runs.push({...summary, rows});
  localStorage.setItem(KEY, JSON.stringify(runs.slice(-20)));
  return summary;
}
function loadRuns(){
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (Array.isArray(raw) && raw.length) return raw;
  } catch (e) {}
  return [...SEED_RUNS];
}

/* ---------- UI ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function boot(){
  buildIndex(360);
  $("#tag").textContent = `${DOCS.length} 篇 · ${IDX.chunks.length} chunks · size ${IDX.size}`;
  $("#docs").innerHTML = DOCS.map(d => `<li><b>${d.id}</b> ${esc(d.title)}</li>`).join("");
  renderRuns();
}
function renderRuns(){
  const runs = loadRuns();
  if (!runs.length){ $("#runs").innerHTML = ""; return; }
  $("#runs").innerHTML = `<tr><th>时间</th><th>chunk</th><th>rerank</th><th>hit@3</th><th>覆盖</th><th>拒答</th><th>P95</th></tr>` +
    runs.slice().reverse().map(r => `<tr><td>${String(r.at).slice(5,16)}</td><td>${r.chunk_size}</td><td>${r.rerank ? "on" : "off"}</td>` +
      `<td>${(r.hit3*100).toFixed(0)}%</td><td>${(r.coverage*100).toFixed(0)}%</td><td>${(r.refusal_acc*100).toFixed(0)}%</td><td>${r.p95_ms}ms</td></tr>`).join("");
  const last = runs[runs.length - 1];
  $("#stats").innerHTML = `
    <div class="stat"><b>${(last.hit3*100).toFixed(0)}%</b><span>hit@3</span></div>
    <div class="stat"><b>${(last.coverage*100).toFixed(0)}%</b><span>答案覆盖</span></div>
    <div class="stat"><b>${(last.refusal_acc*100).toFixed(0)}%</b><span>拒答准确率</span></div>
    <div class="stat"><b>${last.p50_ms}<span style="font-size:12px"> / ${last.p95_ms}</span></b><span>P50 / P95 ms</span></div>`;
  $("#last").textContent = `最近一次：${last.at} · ${last.cases} 条 · chunk ${last.chunk_size}${last.seed ? " · 基线（Python 服务）" : " · 浏览器内重算"}`;
}
function ask(){
  const q = $("#q").value.trim();
  if (!q) return;
  const r = answer(q, $("#rk").checked);
  $("#ans").hidden = false;
  $("#aq").textContent = "问：" + q;
  $("#ans").className = "ans" + (r.refused ? " refuse" : "");
  $("#atxt").textContent = r.answer;
  $("#cites").innerHTML = (r.citations || []).map(c => `<a class="cite" href="${c.url}" target="_blank" rel="noreferrer">[${c.doc_id}] ${esc(c.title)}</a>`).join("");
  $("#ameta").innerHTML = `<span>${r.refused ? "已拒答" : "已回答"}</span><span>延迟 ${r.latency_ms} ms</span><span>chunk ${r.chunk_size}</span>`;
  $("#chunks").innerHTML = r.retrieved.map((x, i) => `
    <div class="chunk">
      <div class="top"><span class="sc">${x.score}</span><span>#${i+1} · ${x.doc_id} · chunk ${x.n}</span></div>
      <p>${esc(x.text.replace(/\*\*/g,"").replace(/^#+\s*/gm,""))}</p>
      <div class="bar"><i style="width:${Math.min(100, x.score * 100 / (r.retrieved[0].score || 1))}%"></i></div>
    </div>`).join("");
}
function runEvalUI(){
  const btn = $("#run");
  btn.disabled = true; btn.textContent = "评测中…";
  setTimeout(() => {
    const s = runEval(+$("#cs").value, $("#rk").checked);
    buildIndex(+$("#cs").value);
    $("#tag").textContent = `${DOCS.length} 篇 · ${IDX.chunks.length} chunks · size ${IDX.size}`;
    renderRuns();
    btn.disabled = false; btn.textContent = "跑 30 条评测";
    console.log("eval", s);
  }, 30);
}

$("#go").onclick = ask;
$("#q").addEventListener("keydown", e => { if (e.key === "Enter") ask(); });
$("#run").onclick = runEvalUI;

Promise.all([
  fetch("data/corpus.json").then(r => r.json()),
  fetch("data/cases.json").then(r => r.json()),
]).then(([docs, cases]) => {
  DOCS = docs; CASES = cases;
  boot();
  const qp = new URLSearchParams(location.search);
  if (qp.get("cs")) $("#cs").value = qp.get("cs");
  if (qp.get("rk") === "1") $("#rk").checked = true;
  if (qp.get("eval") === "1") setTimeout(() => runEvalUI(), 60);
}).catch(err => {
  $("#tag").textContent = "数据加载失败";
  console.error(err);
});
