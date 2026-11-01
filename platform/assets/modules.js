/* 业务模块：项目工作台 / 评测实验室 / 求职管线 / 面试训练 / 复盘 / 设置 */

/* ================= 项目工作台 ================= */
VIEWS.projects = function(){
  const p = activeProject();
  const tpl = p ? PROJECT_TPL.find(t=>t.id===p.tpl) : null;
  if (!p || S.ui.showTpl){
    return `
    <div class="hero"><div><h1>项目工作台</h1>
      <p>一个项目 = 7 个阶段，每个阶段都有「产出」和「过门条件」。没过门就不要往下走。</p></div>
      ${p?`<button class="btn ghost small" data-back="1">← 回到工作台</button>`:""}
    </div>
    <div class="grid g3">
      ${PROJECT_TPL.map(t=>`
        <div class="card">
          <div class="tag">${esc(t.fit)} · ${esc(t.time)}</div>
          <h3>${esc(t.name)}</h3>
          <p>${esc(t.story)}</p>
          ${t.repo?`<p class="small" style="color:var(--ok);margin-top:6px">${esc(t.result||"已交付")}</p>`:""}
          <div class="kicker" style="margin-top:10px">范围</div>
          <ul class="tight">${t.scope.map(d=>`<li>${esc(d)}</li>`).join("")}</ul>
          <div class="kicker" style="margin-top:8px">最可能死在哪</div>
          <p class="small" style="color:var(--warn)">${esc(t.die.join("；"))}</p>
          <div class="row" style="margin-top:10px">
            <button class="btn primary" data-tpl="${t.id}">开始这个项目 →</button>
            ${t.repo?`<a class="btn ghost small" href="${esc(t.repo)}" target="_blank">看成果</a>`:""}
          </div>
        </div>`).join("")}
    </div>`;
  }
  const gate = STAGES[p.stage];
  return `
  <div class="hero"><div><h1>${esc(p.name)}</h1>
    <p>${esc(tpl.story)}</p></div>
    <div class="row">
      <select id="projSel" style="width:170px">${S.projects.map(x=>`<option value="${x.id}" ${x.id===p.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select>
      <button class="btn ghost small" data-new="1">＋ 新项目</button>
    </div>
  </div>

  <div class="grid g3" style="margin-bottom:14px">
    <div class="stat"><b>${p.stage}<span style="font-size:13px;color:var(--dim)">/7</span></b><span>当前阶段</span></div>
    <div class="stat"><b>${Object.keys(p.art||{}).length}</b><span>已写产出</span></div>
    <div class="stat"><b>${esc(tpl.time)}</b><span>建议周期</span></div>
  </div>

  <div class="card">
    <div class="kicker">7 阶段 · 过门制</div>
    <div class="steps">
      ${STAGES.map((s,i)=>`<div class="step ${i<p.stage?"done":""} ${i===p.stage?"now":""}">
        <b>${i+1}. ${esc(s.n)}</b><span>${esc(s.d)}</span></div>`).join("")}
    </div>
  </div>

  <div class="grid g2" style="margin-top:14px">
    <div class="card">
      <div class="kicker">当前阶段 · ${esc(gate.n)}</div>
      <h3>${esc(gate.goal)}</h3>
      <p>${esc(gate.d)}</p>
      <div class="out" style="color:var(--accent)"><b>过门条件：</b>${esc(gate.gate)}</div>
      <label class="f">这个阶段的产出（链接 / 一段话 / 数字都行）</label>
      <textarea id="artBox" placeholder="${esc(gate.art)}">${esc((p.art||{})[p.stage]||"")}</textarea>
      <div class="row" style="margin-top:9px">
        <button class="btn primary" id="stageDone">完成本阶段 →</button>
        <button class="btn ghost small" id="stageUndo">退回上一阶段</button>
      </div>
      <p class="small" style="margin-top:8px">过不了门就停在这里；提前进入下一阶段，等于把风险留到面试。</p>
    </div>
    <div class="card">
      <div class="kicker">项目卡（面试时照着讲）</div>
      <div class="kv"><span>范围</span><b>${esc(tpl.scope.join("；"))}</b></div>
      <div class="kv"><span>指标</span><b>${tpl.metrics.join(" · ")}</b></div>
      <div class="kv"><span>死亡点</span><b style="color:var(--warn)">${esc(tpl.die.join("；"))}</b></div>
      <div class="kicker" style="margin-top:12px">简历句式</div>
      <p class="small">${esc(tpl.bullet)}</p>
      <div class="kicker" style="margin-top:12px">7 个过门条件</div>
      <ol class="tight small">${STAGES.map(s=>`<li><b>${esc(s.n)}</b>：${esc((tpl.gates[s.k]||[]).join("；"))}</li>`).join("")}</ol>
      <button class="btn ghost small" id="delProj" style="margin-top:10px">删除这个项目</button>
    </div>
  </div>`;
};
VIEWS.projectsAfter = function(){
  const p = activeProject();
  $$("[data-tpl]").forEach(b=>b.onclick = ()=>{
    const t = PROJECT_TPL.find(x=>x.id===b.dataset.tpl);
    const np = {id: uid("proj"), tpl: t.id, name: t.name, stage: 0, art: {}, createdAt: nowISO()};
    S.projects.push(np); S.activeProject = np.id; S.ui.showTpl = false; save(); renderView("projects");
  });
  const back = $("[data-back]"); if (back) back.onclick = ()=>{ S.ui.showTpl=false; renderView("projects"); };
  const nw = $("[data-new]"); if (nw) nw.onclick = ()=>{ S.ui.showTpl = true; renderView("projects"); };
  const sel = $("#projSel"); if (sel) sel.onchange = ()=>{ S.activeProject = sel.value; save(); renderView("projects"); };
  if (!p) return;
  const box = $("#artBox");
  if (box) box.oninput = ()=>{ p.art = p.art || {}; p.art[p.stage] = box.value; save(); };
  const done = $("#stageDone");
  if (done) done.onclick = ()=>{
    const v = ($("#artBox").value || "").trim();
    if (!v){ toast("先写下这个阶段的产出，再过门"); return; }
    p.art[p.stage] = v; p.stage = Math.min(p.stage+1, STAGES.length); save();
    if (p.stage >= STAGES.length) toast("项目交付完成 ✓ 去写一张证据卡");
    else toast("进入下一阶段");
    renderView("projects");
  };
  const undo = $("#stageUndo");
  if (undo) undo.onclick = ()=>{ p.stage = Math.max(p.stage-1,0); save(); renderView("projects"); };
  const del = $("#delProj");
  if (del) del.onclick = ()=>{
    if (!confirm("删除这个项目？产出会一起删除。")) return;
    S.projects = S.projects.filter(x=>x.id!==p.id);
    S.activeProject = S.projects[0] ? S.projects[0].id : null;
    save(); renderView("projects");
  };
};

/* ================= 评测实验室 ================= */
VIEWS.eval = function(){
  const ds = S.datasets.find(d=>d.id===S.ui.evalDs) || S.datasets[0] || null;
  if (ds) S.ui.evalDs = ds.id;
  return `
  <div class="hero"><div><h1>评测实验室</h1>
    <p>没有评测集的项目，面试时只能讲「我感觉」。先做 30 条，跑出通过率。</p></div>
    <div class="row"><button class="btn primary small" id="newDs">＋ 新建评测集</button></div>
  </div>
  <div class="grid g4" style="margin-bottom:14px">
    <div class="stat"><b>${S.datasets.length}</b><span>评测集</span></div>
    <div class="stat"><b>${evalCount()}</b><span>样本总数</span></div>
    <div class="stat"><b>${evalPassRate()}%</b><span>当前通过率</span></div>
    <div class="stat"><b>${S.runs.length}</b><span>历史跑分</span></div>
  </div>
  ${S.datasets.length ? `
  <div class="row" style="margin-bottom:10px">
    <select id="dsSel" style="width:240px">${S.datasets.map(d=>`<option value="${d.id}" ${ds&&d.id===ds.id?"selected":""}>${esc(d.name)}（${(d.cases||[]).length} 条）</option>`).join("")}</select>
    <button class="btn small" id="addCase">＋ 加一条</button>
    <button class="btn small" id="runEval">跑一次 → 记录通过率</button>
    <button class="btn ghost small" id="delDs">删除评测集</button>
  </div>
  <div class="card">
    <table class="tbl">
      <colgroup><col style="width:38px"><col><col style="width:240px"><col style="width:96px"><col style="width:46px"></colgroup>
      <thead><tr><th>#</th><th>问题 / 输入</th><th>期望</th><th>判定</th><th></th></tr></thead>
    <tbody>
      ${(ds.cases||[]).map((c,i)=>`<tr>
        <td class="mut">${i+1}</td>
        <td>${esc(c.q)}<div class="mini">${esc(c.tag||"")}</div></td>
        <td class="mut">${esc(c.expect||"—")}</td>
        <td><select class="verdict" data-i="${i}" style="padding:4px 6px">
          ${["未评","通过","不通过"].map(v=>`<option ${c.v===v?"selected":""}>${v}</option>`).join("")}</select></td>
        <td><button class="x" data-del="${i}">✕</button></td>
      </tr>`).join("") || `<tr><td colspan="5" class="empty">还没有样本。先加 10 条真实问题。</td></tr>`}
    </tbody></table>
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card">
      <div class="kicker">怎么算「好」</div>
      <ul class="tight small">
        <li><b>检索命中率@3</b>：正确片段出现在前 3 个结果里的比例。</li>
        <li><b>答案正确率</b>：人工判定答对 / 总题数。</li>
        <li><b>拒答准确率</b>：该拒的拒了、不该拒的没拒。</li>
        <li><b>延迟与单次成本</b>：P50/P95 与每次调用费用。</li>
      </ul>
      <p class="small" style="margin-top:8px">只报「准确率」会被追问：样本怎么来的、谁判的、判错怎么办。</p>
    </div>
    <div class="card">
      <div class="kicker">历史跑分</div>
      ${S.runs.length ? `<table class="tbl"><thead><tr><th>时间</th><th>评测集</th><th>通过/总数</th><th>通过率</th></tr></thead><tbody>
        ${S.runs.slice().reverse().slice(0,8).map(r=>`<tr><td class="mut">${esc(r.at)}</td><td>${esc(r.dsName)}</td><td>${r.pass}/${r.total}</td><td>${r.rate}%</td></tr>`).join("")}
      </tbody></table>` : `<div class="empty">还没有跑分记录</div>`}
    </div>
  </div>` : `
  <div class="card empty">
    <h3>先建一个评测集</h3>
    <p>建议：从你要投的那个岗位的真实问题里挑 30 条，其中 8 条是「应该拒答」的。</p>
    <button class="btn primary" id="newDs2">新建评测集</button>
  </div>`}`;
};
VIEWS.evalAfter = function(){
  const p = activeProject();
  function ds(){ return S.datasets.find(d=>d.id===S.ui.evalDs); }
  const mk = ()=>{
    openModal(modalHost(`
      <h2>新建评测集</h2>
      <label class="f">名字</label><input id="dsName" placeholder="例：课程知识库 v1">
      <p class="small" style="margin-top:8px">建议 30 条起，其中 8 条是「应该拒答」的问题。</p>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="dsSave">创建</button></div>`));
    $("#dsSave").onclick = ()=>{
      const name = $("#dsName").value.trim();
      if (!name){ toast("先填名字"); return; }
      const d = {id: uid("ds"), name, cases: [], createdAt: nowISO(), projectId: p?p.id:null};
      S.datasets.push(d); S.ui.evalDs = d.id; save(); closeModal(); renderView("eval");
    };
  };
  const b1 = $("#newDs"); if (b1) b1.onclick = mk;
  const b2 = $("#newDs2"); if (b2) b2.onclick = mk;
  const sel = $("#dsSel"); if (sel) sel.onchange = ()=>{ S.ui.evalDs = sel.value; save(); renderView("eval"); };
  const add = $("#addCase");
  if (add) add.onclick = ()=>{
    openModal(modalHost(`
      <h2>加一条样本</h2>
      <label class="f">问题 / 输入</label><textarea id="caseQ" style="min-height:64px"></textarea>
      <label class="f">期望答案要点（可空）</label><input id="caseE">
      <label class="f">标签（可空：事实 / 拒答 / 多跳 / 格式）</label><input id="caseT">
      <div class="row" style="margin-top:12px"><button class="btn primary" id="caseSave">加入</button></div>`));
    $("#caseSave").onclick = ()=>{
      const q = $("#caseQ").value.trim();
      if (!q){ toast("先填问题"); return; }
      const d = ds(); if (!d) return;
      d.cases.push({id: uid("c"), q, expect: $("#caseE").value.trim(), tag: $("#caseT").value.trim(), v: "未评"});
      save(); closeModal(); renderView("eval");
    };
  };
  $$(".verdict").forEach(s=>s.onchange = ()=>{
    const d = ds(); const i = +s.dataset.i;
    d.cases[i].v = s.value; save();
    const st = $(".stat b"); // 轻量更新：重渲染保持数字一致
    renderView("eval");
  });
  $$("[data-del]").forEach(b=>b.onclick = ()=>{
    const d = ds(); d.cases.splice(+b.dataset.del,1); save(); renderView("eval");
  });
  const run = $("#runEval");
  if (run) run.onclick = ()=>{
    const d = ds(); if (!d || !d.cases.length){ toast("还没有样本"); return; }
    const judged = d.cases.filter(c=>c.v!=="未评");
    if (judged.length < d.cases.length){ toast("还有样本没判定，先全部判完"); return; }
    const pass = d.cases.filter(c=>c.v==="通过").length;
    const rate = Math.round(pass/d.cases.length*100);
    S.runs.push({id: uid("run"), dsId: d.id, dsName: d.name, at: today(), total: d.cases.length, pass, rate});
    save(); renderView("eval"); toast(`已记录：${pass}/${d.cases.length} = ${rate}%`);
  };
  const del = $("#delDs");
  if (del) del.onclick = ()=>{
    const d = ds(); if (!d || !confirm("删除评测集 "+d.name+"？")) return;
    S.datasets = S.datasets.filter(x=>x.id!==d.id); S.ui.evalDs = S.datasets[0]?S.datasets[0].id:null;
    save(); renderView("eval");
  };
};
function evalPassRate(){
  const cs = S.datasets.flatMap(d=>d.cases||[]);
  const j = cs.filter(c=>c.v!=="未评");
  if (!j.length) return 0;
  return Math.round(j.filter(c=>c.v==="通过").length/j.length*100);
}

/* ================= 求职管线 ================= */
VIEWS.career = function(){
  const jds = S.jds;
  return `
  <div class="hero"><div><h1>求职管线</h1>
    <p>JD → 差距 → 简历 bullet → 投递 → 面试。别广撒网，先把 3 个目标岗打穿。</p></div>
    <div class="row"><button class="btn primary small" id="addJd">＋ 录入 JD</button></div>
  </div>

  <div class="grid g4" style="margin-bottom:14px">
    <div class="stat"><b>${jds.length}</b><span>目标 JD</span></div>
    <div class="stat"><b>${S.apps.length}</b><span>已投递</span></div>
    <div class="stat"><b>${S.apps.filter(a=>["一面","二面","HR 面"].includes(a.status)).length}</b><span>进入面试</span></div>
    <div class="stat"><b>${S.evidence.length}</b><span>可用证据卡</span></div>
  </div>

  ${jds.length ? `
  <div class="card" style="margin-bottom:14px">
    <div class="kicker">JD 差距分析（按你的自评，低于 3 分标红）</div>
    <table class="tbl"><thead><tr><th>岗位</th><th>公司</th><th>要求维度</th><th>差距</th><th></th></tr></thead><tbody>
      ${jds.map(j=>{
        const gaps = (j.dims||[]).filter(k=>((S.profile.levels||{})[k]||0) < 3);
        return `<tr>
          <td><b>${esc(j.title)}</b><div class="mini">${esc(j.level||"")}</div></td>
          <td class="mut">${esc(j.company||"—")}</td>
          <td class="small">${(j.dims||[]).map(k=>DIMS.find(d=>d.k===k).n).join(" · ")||"—"}</td>
          <td>${gaps.length?`<span class="bad">${gaps.map(k=>DIMS.find(d=>d.k===k).n).join("、")}</span>`:`<span class="good">匹配</span>`}</td>
          <td><button class="x" data-djd="${j.id}">✕</button></td>
        </tr>`;
      }).join("")}
    </tbody></table>
  </div>`: `<div class="card empty"><h3>还没有目标 JD</h3><p>录 3 个真实 JD（链接或原文都行），平台会按你的自评标出差距。</p></div>`}

  <div class="card" style="margin-bottom:14px">
    <div class="kicker">投递看板 · 点击卡片改状态</div>
    <div class="board">
      ${APP_STAGES.map(st=>{
        const items = S.apps.filter(a=>a.status===st);
        return `<div class="col"><header>${st} <span>${items.length}</span></header>
          ${items.map(a=>`<div class="appcard" data-app="${a.id}">
            <b>${esc(a.company)}</b><div class="mini">${esc(a.role)}</div>
            <div class="mini">${esc(a.date)} · ${esc(a.note||"")}</div></div>`).join("") || `<div class="empty" style="padding:8px">—</div>`}
        </div>`;
      }).join("")}
    </div>
    <div class="row" style="margin-top:10px"><button class="btn small" id="addApp">＋ 记一条投递</button></div>
  </div>

  <div class="grid g2">
    <div class="card">
      <div class="kicker">简历 bullet 库（从证据卡自动生成）</div>
      ${S.evidence.length ? S.evidence.slice().reverse().map(e=>`
        <div class="bullet"><span>${esc(e.concl||e.act||"（未写结论）")}</span><button class="x" data-cp="${esc(e.concl||"")}">复制</button></div>`).join("")
        : `<div class="empty">先去复盘页写证据卡，这里会自动长出 bullet</div>`}
    </div>
    <div class="card">
      <div class="kicker">投递纪律</div>
      <ul class="tight small">
        <li>每周最多投 5 家，投之前先改一版简历 bullet。</li>
        <li>同一个岗位，投之前至少做过 1 次模拟面试。</li>
        <li>被拒后 24 小时内记下「哪一问崩了」，回到面试训练。</li>
        <li>拿到面试再补 JD 细节；不要反过来。</li>
      </ul>
    </div>
  </div>`;
};
VIEWS.careerAfter = function(){
  $("#addJd").onclick = ()=>{
    openModal(modalHost(`
      <h2>录入目标 JD</h2>
      <label class="f">岗位名称</label><input id="jdTitle" placeholder="例：AI 产品经理-校招">
      <div class="grid g2">
        <div><label class="f">公司</label><input id="jdCo" placeholder="可空"></div>
        <div><label class="f">级别</label><input id="jdLv" placeholder="校招实习 / 校招 / 社招"></div>
      </div>
      <label class="f">这个岗位要求哪些能力？（多选，用于算差距）</label>
      <div class="row">${DIMS.map(d=>`<label class="row small" style="gap:6px;margin-right:12px"><input type="checkbox" class="jdDim" value="${d.k}">${d.n}</label>`).join("")}</div>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="jdSave">保存</button></div>`));
    $("#jdSave").onclick = ()=>{
      const title = $("#jdTitle").value.trim();
      if (!title){ toast("先填岗位名称"); return; }
      S.jds.push({id: uid("jd"), title, company: $("#jdCo").value.trim(), level: $("#jdLv").value.trim(),
        dims: $$(".jdDim").filter(x=>x.checked).map(x=>x.value), at: today()});
      save(); closeModal(); renderView("career");
    };
  };
  $$("[data-djd]").forEach(b=>b.onclick = ()=>{ S.jds = S.jds.filter(j=>j.id!==b.dataset.djd); save(); renderView("career"); });
  $("#addApp").onclick = ()=>{
    openModal(modalHost(`
      <h2>记一条投递</h2>
      <label class="f">公司</label><input id="appCo">
      <label class="f">岗位</label><input id="appRole">
      <label class="f">当前状态</label>
      <select id="appSt">${APP_STAGES.map(s=>`<option>${s}</option>`).join("")}</select>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="appAdd">保存</button></div>`));
    $("#appAdd").onclick = ()=>{
      const co = $("#appCo").value.trim();
      if (!co){ toast("先填公司"); return; }
      S.apps.push({id: uid("app"), company: co, role: $("#appRole").value.trim(), status: $("#appSt").value, date: today(), note: ""});
      save(); closeModal(); renderView("career");
    };
  };
  $$("[data-app]").forEach(el=>el.onclick = ()=>{
    const a = S.apps.find(x=>x.id===el.dataset.app); if (!a) return;
    const i = APP_STAGES.indexOf(a.status);
    openModal(modalHost(`<h2>${esc(a.company)}</h2><p class="mut">${esc(a.role)}</p>
      <label class="f">状态</label><select id="stSel">${APP_STAGES.map(s=>`<option ${s===a.status?"selected":""}>${s}</option>`).join("")}</select>
      <label class="f">备注（面试问了什么 / 下一步）</label><textarea id="appNote">${esc(a.note||"")}</textarea>
      <div class="row" style="margin-top:10px"><button class="btn primary" id="appSave">保存</button>
      <button class="btn ghost" id="appDel">删除</button></div>`));
    $("#appSave").onclick = ()=>{ a.status = $("#stSel").value; a.note = $("#appNote").value; save(); closeModal(); renderView("career"); };
    $("#appDel").onclick = ()=>{ S.apps = S.apps.filter(x=>x.id!==a.id); save(); closeModal(); renderView("career"); };
  });
  $$("[data-cp]").forEach(b=>b.onclick = async ()=>{
    try { await navigator.clipboard.writeText(b.dataset.cp); toast("已复制"); } catch(e){ toast("复制失败，手动选中"); }
  });
};

/* ================= 面试训练 ================= */
VIEWS.interview = function(){
  const done = S.practice.length;
  const avg = done ? (S.practice.reduce((a,p)=>a+(+p.score||0),0)/done).toFixed(1) : "—";
  return `
  <div class="hero"><div><h1>面试训练</h1>
    <p>24 道高频题。先自己说 90 秒，再看要点；答不出的回到对应知识卡。</p></div>
    <div class="row"><button class="btn primary small" id="drill">随机抽 5 题开始</button></div>
  </div>
  <div class="grid g3" style="margin-bottom:14px">
    <div class="stat"><b>${done}<span style="font-size:13px;color:var(--dim)">/${QUESTIONS.length}</span></b><span>已练题数</span></div>
    <div class="stat"><b>${avg}</b><span>平均自评（1–5）</span></div>
    <div class="stat"><b>${weakTag()}</b><span>最弱主题</span></div>
  </div>
  <div class="card">
    <div class="row" style="margin-bottom:8px">
      ${["全部","RAG","Agent","Prompt","评估","产品"].map(t=>`<span class="chip ${t==="全部"?"on":""}" data-t="${t}">${t}</span>`).join("")}
    </div>
    <div id="qList" class="grid g2"></div>
  </div>`;
};
VIEWS.interviewAfter = function(){
  let cur = "全部";
  function paint(){
    const list = QUESTIONS.filter(q=>cur==="全部"||q.t===cur);
    $("#qList").innerHTML = list.map(q=>{
      const pr = S.practice.filter(p=>p.qid===q.id);
      return `<div class="card qcard" data-q="${q.id}">
        <div class="row"><span class="tag">${esc(q.t)}</span>${pr.length?`<span class="mini">练过 ${pr.length} 次 · ${pr[pr.length-1].score}/5</span>`:""}</div>
        <h4>${esc(q.q)}</h4><div class="mini">难度 ${"★".repeat(q.d)}</div>
      </div>`;
    }).join("");
    $$("[data-q]").forEach(el=>el.onclick = ()=>openQuestion(el.dataset.q));
  }
  $$("[data-t]").forEach(c=>c.onclick = ()=>{ cur = c.dataset.t; $$("[data-t]").forEach(x=>x.classList.toggle("on", x===c)); paint(); });
  $("#drill").onclick = ()=>{
    const pool = QUESTIONS.filter(q=>!S.practice.some(p=>p.qid===q.id));
    const pick = (pool.length?pool:QUESTIONS).slice().sort(()=>Math.random()-.5).slice(0,5);
    toast(`抽到 5 题：${pick.map(q=>q.t).join(" / ")}`);
    openQuestion(pick[0].id);
  };
  paint();
};
function weakTag(){
  const by = {};
  S.practice.forEach(p=>{ const q = QUESTIONS.find(x=>x.id===p.qid); if(!q) return; by[q.t] = (by[q.t]||0) + (5-(+p.score||0)); });
  const k = Object.keys(by).sort((a,b)=>by[b]-by[a])[0];
  return k || "—";
}
function openQuestion(id){
  const q = QUESTIONS.find(x=>x.id===id); if (!q) return;
  openModal(modalHost(`
    <div class="row"><span class="qtag">${esc(q.t)}</span><span class="spacer"></span><span class="timer" id="timer">90s</span></div>
    <h2 style="margin-top:8px">${esc(q.q)}</h2>
    <p class="mut small">难度 ${"★".repeat(q.d)} · 先自己说 90 秒，再看要点</p>
    <label class="f">先说 90 秒（可以只写关键词）</label>
    <textarea id="qAns" placeholder="我的回答结构：结论 → 2 个要点 → 一个例子"></textarea>
    <div class="row" style="margin-top:9px"><button class="btn small" id="qShow">看要点</button>
      <select id="qScore" style="width:110px">${[1,2,3,4,5].map(n=>`<option value="${n}">自评 ${n}/5</option>`).join("")}</select>
      <button class="btn primary small" id="qSave">记录这次练习</button></div>
    <div class="answer" id="qPts"><b>要点：</b><ul style="margin:5px 0 0 18px">${q.pts.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></div>
  `));
  let left = 90;
  const t = setInterval(()=>{ left--; const el = $("#timer"); if (!el){ clearInterval(t); return; } el.textContent = left+"s"; if (left<=0){ clearInterval(t); el.textContent = "时间到"; } }, 1000);
  $("#qShow").onclick = ()=>$("#qPts").classList.toggle("on");
  $("#qSave").onclick = ()=>{
    const score = +$("#qScore").value, note = $("#qAns").value.trim();
    S.practice.push({id: uid("pr"), qid: id, score, note, at: today()});
    save(); clearInterval(t); closeModal(); renderView("interview"); toast("已记录");
  };
}

/* ================= 复盘 / 证据卡 ================= */
VIEWS.review = function(){
  return `
  <div class="hero"><div><h1>复盘与证据卡</h1>
    <p>每周 60 分钟。写不出数字，说明这周没有进展；写不出反证，说明你在自我说服。</p></div>
    <div class="row"><button class="btn ghost small" id="expMd">导出 Markdown</button></div>
  </div>
  <div class="card">
    <div class="kicker">写一张证据卡</div>
    <div class="grid g2">
      <div><label class="f">第几周</label><select id="eWeek">${[1,2,3,4,5,6,7,8].map(w=>`<option>第 ${w} 周</option>`).join("")}</select></div>
      <div><label class="f">一句话结论（能写进简历）</label><input id="eConcl" placeholder="例：拒答准确率从 62% 提到 88%"></div>
    </div>
    <label class="f">假设（我认为…，可被证伪）</label><input id="eHyp" placeholder="例：加一层意图分类能减少误答">
    <label class="f">动作（这周实际做了什么）</label><textarea id="eAct" style="min-height:60px"></textarea>
    <div class="grid g2">
      <div><label class="f">数字（留存/准确率/人数/时长）</label><input id="eNum" placeholder="例：30 条样本，通过率 73%"></div>
      <div><label class="f">反证（哪个结果打了脸？）</label><input id="eCounter" placeholder="例：多跳问题仍然全错"></div>
    </div>
    <label class="f">下周只写一个动作</label><input id="eNext" placeholder="例：把 8 条拒答题补进评测集">
    <div class="row" style="margin-top:10px"><button class="btn primary" id="eSave">保存这张证据卡</button>
      <span class="mini">数据只存在本机浏览器，不会上传。</span></div>
  </div>

  <div class="card" style="margin-top:14px">
    <div class="kicker">历史证据卡（${S.evidence.length}）</div>
    ${S.evidence.length ? S.evidence.slice().reverse().map(e=>`
      <div class="ev">
        <div class="row"><span class="tag">${esc(e.week)}</span><span class="spacer"></span>
          <span class="mini">${esc(e.date)}</span><button class="x" data-del="${e.id}">✕</button></div>
        <b>${esc(e.concl||"（无结论）")}</b>
        <div class="mini">假设：${esc(e.hyp||"—")}</div>
        <div class="mini">数字：${esc(e.num||"—")} · 反证：${esc(e.counter||"—")}</div>
        <div class="mini">下周：${esc(e.next||"—")}</div>
      </div>`).join("") : `<div class="empty">还没有证据卡。先完成 W1 的产出，回来写第一张。</div>`}
  </div>

  <div class="card" style="margin-top:14px">
    <div class="kicker">周复盘（4 问）</div>
    <label class="f">1. 这周哪个判断错了？</label><textarea id="r1" style="min-height:54px"></textarea>
    <label class="f">2. 哪个数字最出乎意料？</label><textarea id="r2" style="min-height:54px"></textarea>
    <label class="f">3. 下周砍掉什么？</label><textarea id="r3" style="min-height:54px"></textarea>
    <label class="f">4. 需要谁帮忙？</label><textarea id="r4" style="min-height:54px"></textarea>
    <div class="row" style="margin-top:9px"><button class="btn small" id="rSave">保存复盘</button></div>
  </div>`;
};
VIEWS.reviewAfter = function(){
  const r = S.ui.review || {};
  ["r1","r2","r3","r4"].forEach(k=>{ const el = $("#"+k); if (el) el.value = r[k] || ""; });
  $("#eSave").onclick = ()=>{
    const concl = $("#eConcl").value.trim(), act = $("#eAct").value.trim();
    if (!concl && !act){ toast("至少写结论或动作"); return; }
    S.evidence.push({id: uid("ev"), week: $("#eWeek").value, concl, hyp: $("#eHyp").value.trim(),
      act, num: $("#eNum").value.trim(), counter: $("#eCounter").value.trim(), next: $("#eNext").value.trim(), date: today()});
    save(); renderView("review"); toast("已保存");
  };
  $$("[data-del]").forEach(b=>b.onclick = ()=>{ S.evidence = S.evidence.filter(e=>e.id!==b.dataset.del); save(); renderView("review"); });
  $("#rSave").onclick = ()=>{
    S.ui.review = {r1:$("#r1").value, r2:$("#r2").value, r3:$("#r3").value, r4:$("#r4").value, at: today()};
    save(); toast("复盘已保存");
  };
  $("#expMd").onclick = ()=>{
    const md = ["# 证据卡导出", "", ...S.evidence.map(e=>
      `## ${e.week} · ${e.date}\n- 结论：${e.concl}\n- 假设：${e.hyp}\n- 动作：${e.act}\n- 数字：${e.num}\n- 反证：${e.counter}\n- 下周：${e.next}\n`)].join("\n");
    const blob = new Blob([md], {type:"text/markdown"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "证据卡.md"; a.click();
  };
};

/* ================= 设置 ================= */
VIEWS.settings = function(){
  const bytes = new Blob([JSON.stringify(S)]).size;
  return `
  <div class="hero"><div><h1>设置与数据</h1><p>所有内容只存在这台电脑的浏览器里。换设备前先导出。</p></div></div>
  <div class="grid g2">
    <div class="card">
      <div class="kicker">数据</div>
      <p class="small">当前占用约 ${(bytes/1024).toFixed(1)} KB；知识卡 ${masteredCount()}/${CARDS.length}，证据卡 ${S.evidence.length} 张。</p>
      <div class="row" style="margin-top:8px">
        <button class="btn small" id="e1">导出 JSON</button>
        <button class="btn small" id="i1">导入 JSON</button>
        <button class="btn danger small" id="reset">清空所有数据</button>
      </div>
      <p class="small" style="margin-top:8px">清空后无法恢复；建议先导出。</p>
    </div>
    <div class="card">
      <div class="kicker">关于</div>
      <p class="small">知识源：<a href="${DOC}" target="_blank" rel="noopener">亚慧《AI 产品经理（知识星球，持续更新……）》</a>，46 万字。</p>
      <p class="small">本平台只做章节索引、要点提炼与练习设计，不复制原文；原文更新后以原文为准。</p>
      <p class="small">版本 v2 · 单机离线 · 无账号体系。</p>
    </div>
  </div>`;
};
VIEWS.settingsAfter = function(){
  $("#e1").onclick = exportAll;
  $("#i1").onclick = importAll;
  $("#reset").onclick = ()=>{
    if (!confirm("清空所有本地数据？")) return;
    localStorage.removeItem(KEY); localStorage.removeItem("aipm-coach-v1");
    S = JSON.parse(JSON.stringify(DEFAULTS)); save(); renderView("dashboard");
  };
};
