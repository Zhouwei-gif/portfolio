# 作品集网站（GitHub Pages 版）

四个静态页面，零后台、零账号：

| 路径 | 内容 | 说明 |
|---|---|---|
| `/` | 门户 | 四个卡片，手机单列 |
| `/platform/` | 求职训练台 | 9 个视图，进度存浏览器 localStorage |
| `/p3/` | 模拟面试官 | 13 题、90 秒、四维检测，纯前端 |
| `/p1/` | 知识库问答 | **已静态化**：BM25 与评测都在浏览器里跑 |
| `/p2/` | JD 匹配报告 | 渲染 `report.md` |
| `/skills/` | 能力地图 | 8 项 AI PM 能力 × 证据 + 3 张产品卡 + 缺口 |

## 为什么 P1 能没有服务器

`p1/app.js` 把 Python 版的分词（英文词 + 汉字 bigram）、BM25、域闸门、抽取式回答、rerank 全部复刻到浏览器；语料在构建期写成 `p1/data/corpus.json`（11 篇 / 90,366 字）。

对齐结果（同一 30 条评测集）：

| chunk | rerank | hit@3 | 覆盖 | 拒答 |
|---|---|---|---|---|
| 360 | off | 82% | 77% | 100% |
| 520 | off | 96% | 77% | 100% |
| 520 | on | 96% | 82% | 100% |

Python 服务原始数字：81.8 / 77.3 / 100；95.5 / 77.3 / 100；95.5 / 81.8 / 100 —— 一致。

> 注意：Python 里 `STOP` 的 `split()` 实际只产生一个长串（等于不过滤停用词），`clean_prose` 只丢 `1.`–`5.` 开头的行。这两处必须照抄，否则覆盖率的 rerank 行会从 82% 掉到 77%。

## 发布（两种方式，选一个）

### A. 网页上传（不用命令行）

1. GitHub 新建 public 仓库：`portfolio`（或任意名字）；
2. 进入仓库 → **Add file → Upload files** → 把这个文件夹里的**全部内容**拖进去（注意是内容，不是外层文件夹）；
3. Commit；
4. **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main` / `/ (root)` → Save；
5. 1–2 分钟后打开：`https://<你的用户名>.github.io/portfolio/`。

### B. 命令行

```powershell
cd github-pages
git init
git add .
git commit -m "portfolio: platform, p3, p1(static), p2 report"
git branch -M main
git remote add origin https://github.com/<用户名>/portfolio.git
git push -u origin main
```

然后在 Settings → Pages 里同样选 `main` / root。

## 本地预览

```powershell
cd github-pages
python -m http.server 8099
# http://127.0.0.1:8099/
```

必须用 HTTP 打开（`file://` 下 `fetch` 读 JSON 会被 CORS 拦）。

## 需要知道的三件事

1. **免费账号的 Pages 需要 public 仓库**；私有仓库开 Pages 要 Pro。
2. **P1 不再调用任何模型**：答案是从语料里抽句子。这是“没有 LLM 时的诚实方案”，面试时要说清楚，不要包装成生成式。
3. 平台与 P3 的数据在**访问者的浏览器**里，各人各一份，互不影响；你在手机上练的进度不会同步到电脑。
