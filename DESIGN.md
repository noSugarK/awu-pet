# Awu Pet · 项目设计文档

> 一二、布布 Designed by **黄小B** · Powered by **noSugarK**
>
> 一二、布布形象版权归原作者黄小B所有；其他角色版权归各自权利人（见 [§8 署名与版权](#8-署名与版权)）。本仓库是非商业的粉丝作品。

**Awu Pet**（嗷呜桌宠，原名 YierBubu-Pet）：住在任务栏上的桌宠，会陪你玩，还会帮你“嗷呜”一口吃掉文件。默认角色是矢量画的一二和布布；装上 Codex / Petdex 宠物包后，可以换成用动画帧画的角色，最多 4 只同屏。

| 部分 | 目录 | 技术 |
|---|---|---|
| 前端（网站和桌宠共用） | `docs/` | HTML + SVG + CSS 动画 + 原生 JS，无构建步骤 |
| 网站 | `docs/index.html` | GitHub Pages（`main` / `/docs`） |
| 桌宠 | `desktop/` | Rust + Tauri v2，窗口加载 `docs/pet.html` |
| 宠物包安装 | `desktop/scripts/install-pets.mjs` | Node 18+ |
| 宣传视频 | `video/` | Remotion |
| 设计素材 | `design/` | 参考图、三视图、方案 |

---

## 1. 仓库结构

```text
awu-pet/
├─ docs/                         # 前端：网站和桌宠共用
│  ├─ index.html                 # 网站外壳：标题、角色 / 动作按钮、下载菜单
│  ├─ pet.html                   # 桌宠外壳：透明背景，只有宠物
│  ├─ css/pet.css · radial.css   # 宠物 / 动作样式（不含角色专属规则）· 圆盘菜单
│  └─ js/
│     ├─ core/yb.js              # 命名空间 + 事件总线
│     ├─ models/chibi-bear.js    # 矢量模型的几何（从三视图描出）
│     ├─ characters/*.js         # 矢量角色：一二、布布（模型 + 配色 + 性格 + 台词）
│     ├─ casts.js                # 内置组合（一二布布）
│     ├─ packs.js                # 桌宠：当前选中的角色名单（内置角色 + 宠物包成员）
│     ├─ core/render.js          # 按模型 + 配色画 SVG
│     ├─ core/runtime.js         # 生成宠物、状态、移动、气泡、拖动、主循环、帧动画
│     ├─ behaviors/              # actions.js 动作 · feeding.js 投喂反应 · brain.js 自主行为
│     ├─ pet.js                  # 对外 API（PET），两个外壳只用它
│     └─ platform/               # web.js 网站 · desktop.js 桌宠桥接 · radial.js 圆盘菜单
├─ desktop/
│  ├─ src-tauri/src/             # main.rs · feed.rs · pets.rs · explorer.rs · platform.rs
│  ├─ src-tauri/installer-hooks.nsh   # 安装时先卸载旧版 YierBubu-Pet
│  └─ scripts/install-pets.mjs   # 安装宠物包
├─ design/
│  ├─ reference/                 # 一二布布三视图、各角色三视图、参考图
│  └─ multi-character-plan.md    # 多角色方案（历史记录）
├─ video/                        # Remotion 宣传视频
├─ DESIGN.md · README.md · LICENSE
```

**核心决定：只有一份前端。** 网页和桌宠画的是同一套宠物、同一套动作；Rust 只做网页做不到的事（透明置顶窗口、点击穿透、托盘、回收站、读本地宠物包、多显示器）。改宠物只改 `docs/`，两边同时生效。

---

## 2. 两种画法

### 2.1 矢量角色（内置：一二、布布）

形象分三层，换模型、加角色互不影响：

| 层 | 位置 | 内容 |
|---|---|---|
| 模型 | `models/*.js` | 只有几何：头 / 身体 / 手 / 脚的路径，眼睛、嘴、腮红、脖子、手捧位置、地面等锚点 |
| 角色 | `characters/*.js` | 用哪个模型 + 配色 + 配饰 + 性格（`sleepiness` / `playfulness` / `social`，0–1）+ 台词 |
| 渲染器 | `core/render.js` | 按模型锚点生成脸、表情、领结、围巾、道具；可选：无耳模型、分层附加形状、鼻子 |

`chibi-bear` 按 `design/reference/yier-1.jpg`、`bubu-1.jpg` 的正面三视图描出，一二和布布共用。

| | 一二 | 布布 |
|---|---|---|
| 身体 | `#fdfdfb` | `#e2b08e` |
| 描边 / 眼睛 / 嘴 | `#3f0c03` | `#4a261a` |
| 耳朵 | 实心深色 | 身体色，深色内圈 |
| 腮红 | `#efb7aa` | `#fcce93` |
| 配饰 | 项圈 + 领结 | 无 |

矢量角色支持全部动作：眼睛跟着鼠标、吃面、奶茶、送花、墨镜 / 围巾、投喂时的超大嘴。

### 2.2 帧动画角色（宠物包）

Codex / [Petdex](https://petdex.dev) 宠物包：一个文件夹，含 `pet.json` 和一张精灵图（8 列 × 9 行，每格 192 × 208，透明背景，每行一个动作，每行帧数从图里数出来）。

| 行 | Codex 含义 | 桌宠里用于 |
|---|---|---|
| 0 | idle | 待机 |
| 1 / 2 | running-right / running-left | 往右 / 往左跑（含拖动、散步） |
| 3 | waving | 挥手、抱抱、跳舞、害羞（默认） |
| 4 | jumping | 开心、惊讶、等投喂 |
| 5 | failed | 难过、生气 |
| 6 | waiting | 睡觉（默认） |
| 7 | running（忙碌） | 嚼东西 |
| 8 | review | 思考 |

**每只宠物有自己的动作。** 同样 9 行，各家画的内容不一样（小白的第 3–8 行是比心、撒花、流汗、魔法棒、唱歌、打电话）。`install-pets.mjs` 在每个 `pet.json` 里写一个 `awu` 字段：

```json
"awu": {
  "actions": [[3, "💗", "比心"], [4, "🎉", "撒花"], …],   // 第 3–8 行按画面命名，进右键菜单
  "states": { "sleep": 5, "shy": 6 },                    // 这只宠物的某个状态用哪一行（覆盖上表）
  "flipRunning": true                                    // 这张图的向左 / 向右跑两行画反了（小金毛）
}
```

没有 `awu` 的宠物包用 Codex 默认含义命名。帧动画角色没有道具和装扮，相应菜单自动隐藏；双击它随机来一个自己的动作，鼠标停在它身上会害羞，没人理时会自己做自己的动作。

| 宠物包 | 来源 | 自己的动作（第 3–8 行） |
|---|---|---|
| 一二 / 布布 | [littlegqqq/Yier-Bubu](https://github.com/littlegqqq/Yier-Bubu) | 挥手 · 欢呼 · 哭哭 · 扭扭 · 跳舞（布布：踏步）· 卖萌（布布：撒娇） |
| 小白 | Petdex `line-puppy` | 比心 · 撒花 · 流汗 · 魔法棒 · 唱歌 · 打电话 |
| 小金毛 | Petdex `xiao-jimao` | 闪闪 · 爱心气球 · 哭哭 · 比心 · 坐长椅 · 疑惑（跑步两行互换） |
| 噜噜 | Petdex `lulu-3` | 挥手 · 开心 · 困了 · 摸肚子 · 抱臂 · 托腮（睡觉用第 5 行） |
| 噜妹 | Petdex `lumei` | 挥手 · 欢呼 · 委屈 · 害羞 · 卖萌 · 发呆 |
| 奶龙 | Petdex `nailong-4` | 挥手 · 欢呼 · 委屈 · 偷笑 · 扭扭 · 托腮 |
| 奶蛙 | Petdex `nailong`（改名） | 挥手 · 欢呼 · 哭哭 · 蹦跶 · 扭扭 · 大笑 |

**不分发别人的图。** 仓库和安装包里没有任何宠物包；`install-pets.mjs` 从 Petdex 公开目录（`assets.petdex.dev/manifests/petdex-v2.json`）和 GitHub 下载到用户自己的电脑，来源、作者和版权行写进 `pet.json`（`source`、`credit`），仅供个人使用。

### 2.3 选谁上场

- 桌宠在 `<应用数据>/pets` 和 `~/.codex/pets`（`npx petdex install` 的位置）里找宠物包；一个文件夹里放一个宠物包是一只，放两个是一组（以文件夹命名）。
- 右键「角色」列出每个角色（内置角色和宠物包成员；宠物包里有同名角色时内置的让位）：**点击换成它，按住 Ctrl / Shift 点击添加或移除**，最多 4 只。托盘「角色」只能切换。
- 选中的名单存在 `localStorage.roster`，页面重新加载后由 `packs.js` 注册成角色组 `roster`；宠物包被删掉时自动去掉对应角色。

---

## 3. 动作与行为

### 3.1 交互

| 操作 | 效果 |
|---|---|
| 移动鼠标 | 矢量角色的眼睛和头跟着看 |
| 点击 / 连点 5 下 | 跳起冒爱心或星星 / 生气 |
| 拖动 | 追着鼠标跑（帧动画：跑步行），拖到另一只身边抱抱，分开太远会难过 |
| 双击帧动画角色 | 随机来一个它自己的动作 |
| 鼠标停在帧动画角色身上 | 害羞 |
| 滚轮 | 调大小（脚底不动，会记住） |
| 右键 | 圆盘菜单：角色、互动、动作（帧动画角色是它自己的动作列表）、装扮、投喂、回收站、设置、隐藏、关于 |

### 3.2 文件投喂反应（`behaviors/feeding.js`）

| 吃到 | 反应 |
|---|---|
| 🍎 图片 | "照片！好好吃～" |
| 🎵 音乐 | "音乐～ 边吃边跳！"，吃完跳舞 |
| 🍿 视频 | "好大的视频！"，嚼得久一点 |
| 🥨 压缩包 | "这个有点难消化……"，嚼 3 秒 |
| 📚 文档 | "好多字……吃得有点困"，吃完打个盹 |
| 💻 代码 | "程序？嚼起来咔咔响" |
| ⚠️ 程序 | "这个真的可以吃吗？"，吃完吓一跳 |
| 📦 文件夹 | "一整箱！"，旁边那只跑过来一起搬 |
| 超过 500 MB | "好撑……差点吃不下！" |

「投喂 ▸ 今日食谱」按天统计吃了什么，显示饱腹度。

### 3.3 自主行为（`behaviors/brain.js`）

- 按性格给活动加权：爱玩的更常散步、玩耍、追鼠标，黏人的更常挥手、抱抱、跳舞，爱睡的更常打盹；帧动画角色还会做自己的动作。
- 23 点到 6 点更容易犯困；你离开电脑（系统空闲时间）就睡觉，回来醒。
- 多只同屏时任挑两只演小剧情：戳醒打盹的、追着玩、抱抱、"你又偷吃！"—"嘿嘿～"。
- 鼠标甩得很快：最爱玩的那只冲过去追。
- 前台是全屏程序：退到角落，暂时不置顶，退出全屏后恢复。

---

## 4. 桌宠（Rust + Tauri v2）

### 4.1 窗口

- 一个无边框、透明、置顶、不进任务栏的窗口，**覆盖所有显示器工作区的外接矩形**；Rust 把每块屏的工作区（页面坐标，主屏在前）告诉页面，插拔显示器时重新覆盖。
- 宠物沿着自己所在那块屏的底边（任务栏上沿）走；新宠物在主屏右下角出现；落在两块屏之间空白处的会移到最近的屏上。
- 点击穿透：Rust 每 16 ms 读一次全局光标，只有光标在宠物或气泡上时窗口才接收鼠标。
- 已知限制：整个窗口用一个缩放比例，两块屏缩放不同时，第二块屏上的位置会略有偏差。

### 4.2 当回收站

1. 文件拖到宠物身上 → 张大嘴等着；拖走就合上。
2. 松手 → `check_meal(paths)` 检查 → `eat_files(paths)` 用 [`trash`](https://crates.io/crates/trash) 移进系统回收站。
3. 文件图标飞进嘴里，嚼几下，气泡"吃掉了 N 个 · 在回收站可以找回"。

安全规则：

- **只移进系统回收站，不做永久删除**（Windows 用 `FOF_ALLOWUNDO | FOF_WANTNUKEWARNING`，放不进回收站时系统先警告）。
- 一次超过 20 个或总大小超过 1 GB，先在气泡里确认。
- 拒绝盘符根目录、用户主目录、系统和程序目录、程序自身目录、不存在的路径；Rust 端会再检查一遍，不信任前端数据。
- 「吐出来」撤销上一次投喂（macOS 需要在废纸篓里"放回原处"）；每次投喂记到 `<应用数据>/meals.log`。
- 「清空回收站」会永久删除，必须先在气泡里确认。

### 4.3 资源管理器右键（Windows）

- 注册在当前用户注册表（`HKCU\Software\Classes\*\shell`、`Directory\shell`，键名 `Awu-Pet.<角色>`），不需要管理员；旧版的 `YierBubu*` 键会被清掉。
- 菜单项跟着当前显示的角色走：每只一项「请X删除」；两只加「请A和B删除」，三只以上加「请大家一起删除」。设置里可关闭。
- 选中后 Explorer 运行 `Awu-Pet.exe --eat <角色|all> "<路径>"`；已在运行时由单实例插件转交，400 ms 内的多个文件合并成一次跑腿；用 UI Automation 定位被选中的文件，宠物冲过去吃掉后走回原处。
- Windows 11 新版右键菜单只认 MSIX 注册的命令，这些项在「显示更多选项」里。

### 4.4 宠物包读取

`pets.rs`：`list_pets()` 列出两个文件夹里的宠物包（名字、精灵图路径、`credit`、`awu`）；`read_pet_sheet(path)` 只返回这两个文件夹里的 `.webp` / `.png`，页面拿到后转成 Blob URL。

### 4.5 其他

- 开机自启（`tauri-plugin-autostart`，默认关）；单实例（`tauri-plugin-single-instance`）。
- 设置、位置、今日食谱、角色名单都存在 WebView 的 `localStorage`；identifier 沿用 `com.nosugark.yierbubupet`，从 YierBubu-Pet 升级后全部保留，旧的开机自启项自动迁移。
- 前后端接口见 [`desktop/README.md`](desktop/README.md)。

### 4.6 构建与发布

- 本地：`cd desktop/src-tauri && cargo run`；打包：`cargo install tauri-cli --version "^2"` 后在 `desktop/` 运行 `cargo tauri build`。
- 发布：改 `tauri.conf.json` 的 `version`，推送同名 tag `v*`，`.github/workflows/release.yml` 用 `tauri-action` 打包 Windows（NSIS / MSI）、macOS（dmg，Intel + Apple Silicon）、Linux（AppImage / deb），上传到 Releases。
- 安装包暂未签名：Windows 有 SmartScreen 提示，macOS 需要 `xattr -cr`。

---

## 5. 网站：GitHub Pages

- 仓库 Settings → Pages → Deploy from a branch → `main` / `/docs`，地址 `https://nosugark.github.io/awu-pet/`。
- `docs/` 是纯静态文件，`.nojekyll` 已放好。网站展示内置的矢量一二布布（网页读不了本地宠物包）；下载菜单直接链到最新 Release 的安装包。
- 唯一外部依赖是 Google Fonts 的站酷快乐体，访问不到时退回系统字体。

---

## 6. 性能目标

- 空闲时 CPU < 1%，内存 < 80 MB。
- 帧动画每秒 8 帧，只改 `background-position`；矢量角色用 CSS 动画；点击穿透的命中区域变化时才发给 Rust（最多 20 次/秒）。

---

## 7. 里程碑

| 版本 | 内容 |
|---|---|
| 0.1–0.3 | 互动网页；Tauri 桌宠：透明窗口、点击穿透、圆盘菜单、自己玩、投喂进回收站、资源管理器右键、按三视图重画一二布布 |
| 下一版（0.4） | 改名 Awu Pet；角色可切换；宠物包（帧动画）与安装脚本；每只宠物自己的动作；最多 4 只同屏；多显示器 |
| 以后 | 新版 Win11 右键菜单（稀疏包）、节日 / 生日彩蛋、网页上预览宠物包、代码签名 |

---

## 8. 署名与版权

| 角色 | 版权 | 署名 |
|---|---|---|
| 一二、布布 | 黄小B | 凡出现一二布布的界面都写 `Designed by 黄小B · Powered by noSugarK` |
| 小白、小金毛 | 线条小狗 © moonlab_studio | 宠物包 `credit` |
| 噜噜、噜妹 | 噜噜与噜妹 © 原作者（抖音） | 宠物包 `credit` |
| 奶龙、奶蛙 | 奶龙 © 第七印象 | 宠物包 `credit` |

- 网站：页脚 + `<meta name="author">`；桌宠：「关于」显示当前角色的署名 + `Powered by noSugarK`；安装包描述（`bundle.copyright` / `longDescription`）；README、本文档、Release 说明。
- 宠物包精灵图版权归各自作者（littlegqqq、Petdex 投稿者），不随本项目分发。
- 本项目为非商业粉丝作品，未经授权不得用于商业用途；如权利人提出要求，将立即下架相关内容。

---

## 参考资料

- 一二（微信表情包形象）· 百度百科：https://baike.baidu.com/item/%E4%B8%80%E4%BA%8C/23434669
- Petdex（Codex 宠物图鉴，MIT 代码，宠物为用户投稿）：https://petdex.dev · https://github.com/crafter-station/petdex
- littlegqqq/Yier-Bubu（一二、布布 Codex 宠物包）：https://github.com/littlegqqq/Yier-Bubu
- Tauri v2：https://v2.tauri.app/
- trash crate：https://crates.io/crates/trash
