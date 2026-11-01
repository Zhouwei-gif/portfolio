/* 核心：状态、工具、路由、总览、知识系统 */
const KEY = "aipm-platform-v2";
const VIEWS = {};
let S = loadState();

function loadState(){
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch(e){}
  if (!s) {
    // 尝试从 v1 迁移
    try {
      const old = JSON.parse(localStorage.getItem("aipm-coach-v1") || "null");
      if (old) {
        s = JSON.parse(JSON.stringify(DEFAULTS));
        s.cards = old.cards || {};
        s.weeks = old.weeks || {};
        s.evidence = old.evidence || [];
        if (old.goal) s.profile.goal = old.goal;
        if (old.hours) s.profile.hours = old.hours;
        if (old.levels) s.profile.levels = old.levels;
        s.ui.migrated = true;
      }
    } catch(e){}
  }
  if (!s) s = JSON.parse(JSON.stringify(DEFAULTS));
  s.profile = Object.assign({}, DEFAULTS.profile, s.profile || {});
  ["cards","weeks","projects","datasets","runs","jds","apps","practice","evidence"].forEach(k=>{
    if (!s[k]) s[k] = (k==="projects"||k==="datasets"||k==="runs"||k==="jds"||k==="apps"||k==="practice"||k==="evidence") ? [] : {};
  });
  s.ui = s.ui || {};
  return s;
}
function save(){
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){ toast("本地存储失败，请导出备份"); }
  paintSide();
}
function uid(p){ return (p||"id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function $(s,r){ return (r||document).querySelector(s); }
function $$(s,r){ return Array.from((r||document).querySelectorAll(s)); }
function esc(x){ return String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function today(){ return new Date().toLocaleDateString("zh-CN"); }
function nowISO(){ return new Date().toISOString().slice(0,10); }
function toast(msg){
  const t = $("#toast"); if(!t) return;
  t.textContent = msg; t.classList.add("on");
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove("on"), 1800);
}
function openModal(html){
  const m = $("#modal"), s = $("#sheet");
  s.innerHTML = html; m.classList.add("on");
  s.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeModal);
}
function closeModal(){ $("#modal").classList.remove("on"); }
function modalHost(inner){ return `<div class="row"><span class="qtag">工作台</span><span class="spacer"></span><button class="btn small" data-close="1">关闭</button></div>${inner}`; }

/* 统计 */
function masteredCount(){ return Object.values(S.cards).filter(Boolean).length; }
function activeProject(){ return S.projects.find(p=>p.id===S.activeProject) || null; }
function stageDone(p){ return p ? p.stage : 0; }
function weekDoneCount(){ return Object.values(S.weeks).filter(Boolean).length; }
function evalCount(){ return S.datasets.reduce((a,d)=>a+(d.cases?d.cases.length:0),0); }
function appCount(){ return S.apps.length; }
function interviewCount(){ return S.practice.length; }

function nextAction(){
  const p = activeProject();
  if (!S.profile.levels || Object.keys(S.profile.levels).length < 6)
    return {k:"profile", t:"先花 2 分钟做能力自评", d:"六维打分决定你从哪周开始、先补哪块。", btn:"去自评",
      act:()=>{ go("dashboard"); setTimeout(()=>{ const el=$("#lvBox"); if(el) el.scrollIntoView({behavior:"smooth",block:"center"}); }, 80); }};
  if (!S.projects.length)
    return {k:"pick", t:"选一个项目，别同时开三个", d:"项目是面试叙事的主干；先选一个能 4 周内交付的。", btn:"去项目库", act:()=>go("projects")};
  if (p && p.stage < STAGES.length)
    return {k:"stage", t:`${p.name} · ${STAGES[p.stage].n}`, d:STAGES[p.stage].gate, btn:"继续这个阶段", act:()=>go("projects")};
  const thisWeek = today();
  if (!S.evidence.some(e=>e.date === thisWeek))
    return {k:"evidence", t:"这周还没写证据卡", d:"六行：假设 / 动作 / 数字 / 反证 / 结论 / 下周。没有数字就不算证据。", btn:"去写", act:()=>go("review")};
  if (S.jds.length < 3)
    return {k:"jd", t:`目标 JD 只录了 ${S.jds.length} 个`, d:"至少录 3 个真实 JD，才能做差距分析与投递排序。", btn:"去求职管线", act:()=>go("career")};
  if (!S.apps.length)
    return {k:"apply", t:"还没有投递记录", d:"把第一个项目写进简历 bullet，投出第一份。", btn:"去投递", act:()=>go("career")};
  if (S.practice.length < 5)
    return {k:"interview", t:`模拟面试只练了 ${S.practice.length} 次`, d:"先练 5 次 90 秒版本，再投下一家。", btn:"去面试训练", act:()=>go("interview")};
  return {k:"review", t:"本周复盘 + 更新简历", d:"把最新证据卡压成一句 bullet，替换简历里的旧描述。", btn:"去复盘", act:()=>go("review")};
}

/* 路由 */
function go(view){
  if (location.hash !== "#/"+view) location.hash = "#/"+view;
  else renderView(view);
}
function renderView(view){
  if (!VIEWS[view]) view = "dashboard";
  $("#view").innerHTML = VIEWS[view]();
  $$("#nav button").forEach(b=>b.classList.toggle("on", b.dataset.v === view));
  if (VIEWS[view + "After"]) VIEWS[view + "After"]();
  window.scrollTo({top:0,behavior:"smooth"});
  paintSide(view);
}
function route(){
  const v = (location.hash.replace(/^#\//,"") || "dashboard").split("?")[0];
  renderView(v);
}
window.addEventListener("hashchange", route);

/* 侧栏进度 */
function overallProgress(){
  const k = masteredCount()/CARDS.length;
  const p = activeProject() ? activeProject().stage/STAGES.length : 0;
  const e = Math.min(evalCount()/30,1);
  const c = Math.min((S.apps.length + S.practice.length/2)/10,1);
  return Math.round((k*0.35 + p*0.3 + e*0.15 + c*0.2)*100);
}
function paintSide(){
  const p = overallProgress();
  const el = $("#sideProg"); if (el) el.textContent = p + "%";
  const bar = $("#sideBar"); if (bar) bar.style.width = p + "%";
}

/* ============ 总览 ============ */
VIEWS.dashboard = function(){
  const p = activeProject();
  const na = nextAction();
  const lv = S.profile.levels || {};
  const avg = DIMS.length ? (DIMS.reduce((a,d)=>a+(lv[d.k]||0),0)/DIMS.length).toFixed(1) : "0.0";
  const weekIdx = Math.min(weekDoneCount()+1, 8);
  const week = WEEKS[weekIdx-1] || WEEKS[7];
  const hasApp = s => S.apps.filter(a=>a.status===s).length;
  return `
  <div class="hero">
    <div><h1>全链路工作台</h1>
    <p>学 → 做 → 证 → 投 → 面 → 复盘。每一步都留下可验证的东西；没有数字的进度不算进度。</p></div>
    <div class="row">
      <button class="btn ghost small" data-act="export">导出全部数据</button>
      <button class="btn ghost small" data-act="import">导入备份</button>
    </div>
  </div>

  <div class="grid g4">
    <div class="stat"><b>${masteredCount()}<span style="font-size:13px;color:var(--dim)">/${CARDS.length}</span></b><span>知识卡已掌握</span></div>
    <div class="stat"><b>${p?p.stage:0}<span style="font-size:13px;color:var(--dim)">/${STAGES.length}</span></b><span>项目阶段</span></div>
    <div class="stat"><b>${evalCount()}</b><span>评测样本</span></div>
    <div class="stat"><b>${S.apps.length}</b><span>投递（面试 ${hasApp("一面")+hasApp("二面")+hasApp("HR 面")} 场）</span></div>
  </div>

  <div class="grid g2" style="margin-top:14px">
    <div class="card" style="border-color:rgba(79,209,197,.35)">
      <div class="kicker">下一步 · 只做这一件</div>
      <h3>${esc(na.t)}</h3>
      <p>${esc(na.d)}</p>
      <div class="row" style="margin-top:10px"><button class="btn primary" id="nextBtn">${esc(na.btn)}</button></div>
    </div>
    <div class="card">
      <div class="kicker">本周 · W${weekIdx}</div>
      <h3>${esc(week.t)}</h3>
      <p style="margin-bottom:6px">${esc(week.out)}</p>
      <p class="small">验收：${esc(week.acc)}</p>
      <div class="row" style="margin-top:10px">
        <button class="btn small" data-act="week">打开 8 周路径</button>
        <button class="btn small" data-act="knowledge">去知识卡</button>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:14px">
    <div class="kicker">链路状态</div>
    <div class="grid g3" style="margin-top:8px">
      ${chainItem("知识", masteredCount()+"/"+CARDS.length, masteredCount()/CARDS.length, "knowledge")}
      ${chainItem("项目", p?STAGES[p.stage].n:"未开始", p?p.stage/STAGES.length:0, "projects")}
      ${chainItem("评测", evalCount()+" 条", Math.min(evalCount()/30,1), "eval")}
      ${chainItem("证据", S.evidence.length+" 张", Math.min(S.evidence.length/4,1), "review")}
      ${chainItem("投递", S.apps.length+" 个", Math.min(S.apps.length/5,1), "career")}
      ${chainItem("面试", S.practice.length+" 次", Math.min(S.practice.length/10,1), "interview")}
    </div>
  </div>

  <div class="grid g2" style="margin-top:14px">
    <div class="card radar">
      <div class="kicker">能力雷达 · 平均 <span id="avgLv">${avg}</span></div>
      <svg id="radar" width="360" height="292" viewBox="0 0 360 292"></svg>
      <div class="small">在下方「基础设置」里调整自评</div>
    </div>
    <div class="card">
      <div class="kicker">基础设置</div>
      <label class="f">目标岗位</label>
      <select id="goal">
        ${["校招实习（AI 产品）","校招全职（AI 产品）","社招转岗（传统 PM → AI PM）","社招（AI 产品经理）"].map(g=>`<option ${g===S.profile.goal?"selected":""}>${g}</option>`).join("")}
      </select>
      <label class="f">每周可投入</label>
      <select id="hours">
        ${[5,8,12].map(h=>`<option value="${h}" ${+S.profile.hours===h?"selected":""}>${h} 小时${h===5?" · 轻量":h===8?" · 标准":" · 冲刺"}</option>`).join("")}
      </select>
      <div id="lvBox" style="margin-top:6px">
        ${DIMS.map(d=>`
          <div class="row" style="margin:7px 0">
            <span style="width:80px;color:var(--muted);font-size:12.5px">${d.n}</span>
            <input type="range" min="0" max="5" step="1" value="${lv[d.k]??0}" data-k="${d.k}" style="flex:1;padding:0">
            <b style="width:16px;text-align:right" data-v="${d.k}">${lv[d.k]??0}</b>
          </div>`).join("")}
      </div>
    </div>
  </div>
  <div class="foot">知识源：<a href="${DOC}" target="_blank" rel="noopener">亚慧《AI 产品经理》</a>（46 万字，仅索引与提炼）。所有数据只存在本机浏览器。</div>`;
};
VIEWS.dashboardAfter = function(){
  drawRadar();
  const nb = $("#nextBtn"); if (nb) nb.onclick = nextAction().act;
  const g = $("#goal"); if (g) g.onchange = ()=>{ S.profile.goal = g.value; save(); };
  const h = $("#hours"); if (h) h.onchange = ()=>{ S.profile.hours = +h.value; save(); };
  const box = $("#lvBox");
  if (box) box.addEventListener("input", e=>{
    const k = e.target.dataset.k; if (!k) return;
    S.profile.levels[k] = +e.target.value;
    box.querySelector(`[data-v="${k}"]`).textContent = e.target.value;
    const a = $("#avgLv");
    if (a) a.textContent = (DIMS.reduce((x,d)=>x+(S.profile.levels[d.k]||0),0)/DIMS.length).toFixed(1);
    save(); drawRadar();
  });
  $$("[data-act]").forEach(b=>b.onclick = ()=>doAction(b.dataset.act));
  $$("[data-go]").forEach(el=>el.onclick = ()=>go(el.dataset.go));
};
function chainItem(name, val, ratio, view){
  return `<div style="border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--panel2);cursor:pointer" data-go="${view}">
    <div class="row"><b style="font-size:13px">${name}</b><span class="spacer"></span><span class="mini">${esc(val)}</span></div>
    <div class="progress" style="margin-top:7px"><i style="width:${Math.round(Math.min(ratio,1)*100)}%"></i></div>
  </div>`;
}
function doAction(a){
  if (a==="export") exportAll();
  else if (a==="import") importAll();
  else if (a==="week") go("path");
  else if (a==="knowledge") go("knowledge");
}

function drawRadar(){
  const svg = $("#radar"); if (!svg) return;
  const cx=180, cy=142, R=92, lv=S.profile.levels||{};
  const vals = DIMS.map(d=>lv[d.k]||0);
  const ang = i => -Math.PI/2 + i*2*Math.PI/DIMS.length;
  let g = "";
  for (let ring=1; ring<=5; ring++){
    const pts = DIMS.map((_,i)=>{ const r=R*ring/5,a=ang(i); return (cx+r*Math.cos(a)).toFixed(1)+","+(cy+r*Math.sin(a)).toFixed(1); }).join(" ");
    g += `<polygon points="${pts}" fill="none" stroke="#1e2a45"/>`;
  }
  DIMS.forEach((d,i)=>{
    const a=ang(i);
    g += `<line x1="${cx}" y1="${cy}" x2="${cx+R*Math.cos(a)}" y2="${cy+R*Math.sin(a)}" stroke="#1e2a45"/>`;
    const lx=cx+(R+28)*Math.cos(a), ly=cy+(R+28)*Math.sin(a);
    g += `<text x="${lx}" y="${ly}" fill="#93a1c0" font-size="11" text-anchor="middle" dominant-baseline="middle">${d.n}</text>`;
  });
  const poly = DIMS.map((d,i)=>{ const a=ang(i), r=R*Math.max(.05,(vals[i]/5)); return (cx+r*Math.cos(a)).toFixed(1)+","+(cy+r*Math.sin(a)).toFixed(1); }).join(" ");
  g += `<polygon points="${poly}" fill="rgba(79,209,197,.22)" stroke="#4fd1c5" stroke-width="2"/>`;
  DIMS.forEach((d,i)=>{ const a=ang(i), r=R*Math.max(.05,(vals[i]/5)); g += `<circle cx="${(cx+r*Math.cos(a)).toFixed(1)}" cy="${(cy+r*Math.sin(a)).toFixed(1)}" r="3" fill="#8b7cf6"/>`; });
  svg.innerHTML = g;
}

/* ============ 8 周路径 ============ */
VIEWS.path = function(){
  const done = weekDoneCount();
  return `
  <div class="hero"><div><h1>8 周路径</h1>
    <p>按原文 13 章重排成「能交付」的顺序。勾选表示你已交付，不只是看过。</p></div>
    <div class="pill">已交付 <b>${done}/8</b></div></div>
  ${WEEKS.map(w=>{
    const on = !!S.weeks[w.w];
    return `<div class="week ${on?"done":""}">
      <header><b>W${w.w} · ${esc(w.t)}</b><span class="chip static">${esc(w.ch)}</span>
        <span class="meta">${esc(w.h)}</span>
        <button class="btn small" data-w="${w.w}">${on?"已交付 ✓":"标记已交付"}</button></header>
      <ul>${w.read.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>
      <div class="out"><b>产出：</b>${esc(w.out)}</div>
      <div class="out"><b>验收：</b>${esc(w.acc)}</div>
      <div class="out" style="color:var(--warn)"><b>最可能死在哪：</b>${esc(w.die)}</div>
    </div>`;
  }).join("")}`;
};
VIEWS.pathAfter = function(){
  $$("[data-w]").forEach(b=>b.onclick = ()=>{
    const n = +b.dataset.w; S.weeks[n] = !S.weeks[n]; save(); renderView("path");
  });
};

/* ============ 知识系统 ============ */
VIEWS.knowledge = function(){
  const chs = CHAPTERS;
  return `
  <div class="hero"><div><h1>知识系统</h1>
    <p>13 章地图 + 24 张卡。点开卡片做自测；「只看未掌握」用于考前复习。</p></div>
    <div class="row">
      <select id="kCh" style="width:150px"><option value="">全部章节</option>
        ${chs.map(c=>`<option value="${c.n}">第 ${c.n} 章 · ${esc(c.t)}</option>`).join("")}</select>
      <input id="kQ" placeholder="搜索标题/关键词" style="width:200px">
      <label class="row small" style="gap:5px;color:var(--muted)"><input type="checkbox" id="kUndone" style="width:auto">只看未掌握</label>
    </div>
  </div>
  <div class="card" style="margin-bottom:14px">
    <div class="kicker">章节地图（点击章节筛选）</div>
    <div class="row" style="margin-top:6px" id="chMap">
      ${chs.map(c=>`<span class="chip" data-ch="${c.n}">${c.n} · ${esc(c.t)}</span>`).join("")}
    </div>
    <div class="small" style="margin-top:4px">灰色为原文目录索引；带卡片数量的章节优先读。</div>
  </div>
  <div class="grid g3" id="kList"></div>
  <div class="foot" id="kCount"></div>`;
};
VIEWS.knowledgeAfter = function(){
  const chSel = $("#kCh"), q = $("#kQ"), undone = $("#kUndone");
  function paint(){
    const c = chSel.value, s = q.value.trim(), u = undone.checked;
    const list = CARDS.filter(x =>
      (!c || x.ch === c) &&
      (!s || (x.t + x.one + x.why + x.read).includes(s)) &&
      (!u || !S.cards[x.id])
    );
    $("#kList").innerHTML = list.length ? list.map(x=>`
      <div class="card kcard ${S.cards[x.id]?"mastered":""}" data-c="${x.id}">
        <div class="tag">第 ${x.ch} 章 · ${esc(x.read)}</div>
        <h4>${esc(x.t)}</h4><div class="one">${esc(x.one)}</div>
      </div>`).join("") : `<div class="empty">没有匹配的卡片</div>`;
    $("#kCount").textContent = `共 ${CARDS.length} 张 · 已掌握 ${masteredCount()} 张 · 当前筛选 ${list.length} 张`;
    $$("[data-c]").forEach(el=>el.onclick = ()=>openCard(el.dataset.c));
  }
  chSel.onchange = ()=>{ $$("#chMap .chip").forEach(x=>x.classList.toggle("on", x.dataset.ch===chSel.value)); paint(); };
  q.oninput = paint; undone.onchange = paint;
  $$("#chMap .chip").forEach(ch=>ch.onclick = ()=>{
    chSel.value = chSel.value === ch.dataset.ch ? "" : ch.dataset.ch;
    $$("#chMap .chip").forEach(x=>x.classList.toggle("on", x.dataset.ch===chSel.value));
    paint();
  });
  paint();
};
function openCard(id){
  const c = CARDS.find(x=>x.id===id);
  openModal(modalHost(`
    <div class="qtag">第 ${c.ch} 章 · ${esc(c.read)}</div>
    <h2>${esc(c.t)}</h2>
    <p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px">${esc(c.one)}</p>
    <div class="kicker">为什么重要</div><p style="color:var(--muted);font-size:13.5px">${esc(c.why)}</p>
    <div class="row" style="margin:12px 0">
      <a class="btn small" href="${DOC}" target="_blank" rel="noopener">去原文对照 →</a>
      <button class="btn small" id="cMaster">${S.cards[c.id]?"取消掌握":"标记已掌握"}</button>
    </div>
    <hr>
    <div class="kicker">自测（先写 3 行，再看参考）</div>
    <p style="font-size:14px">${esc(c.q)}</p>
    <textarea id="cAns" placeholder="写下你的答案…"></textarea>
    <div class="row" style="margin-top:9px"><button class="btn small" id="cShow">看参考答案</button></div>
    <div class="answer" id="cPts"><b>要点：</b><ul style="margin:5px 0 0 18px">${c.pts.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></div>
  `));
  $("#cShow").onclick = ()=>$("#cPts").classList.toggle("on");
  $("#cMaster").onclick = ()=>{
    S.cards[c.id] = !S.cards[c.id]; save(); closeModal(); renderView("knowledge");
    toast(S.cards[c.id] ? "已标记掌握" : "已取消");
  };
}

/* 导出 / 导入 */
function exportAll(){
  const blob = new Blob([JSON.stringify(S,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "ai-pm-platform-backup.json"; a.click();
  toast("已导出 JSON 备份");
}
function importAll(){
  const inp = document.createElement("input"); inp.type="file"; inp.accept="application/json";
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || typeof data !== "object") throw new Error("bad");
        S = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), data);
        save(); renderView("dashboard"); toast("导入成功");
      } catch(e){ toast("文件格式不对"); }
    };
    r.readAsText(f);
  };
  inp.click();
}

/* 启动 */
document.addEventListener("DOMContentLoaded", ()=>{
  $$("#nav button").forEach(b=>b.onclick = ()=>go(b.dataset.v));
  $("#modal").addEventListener("click", e=>{ if (e.target.id==="modal") closeModal(); });
  paintSide();
  route();
});
