# 一二 & 布布 · 项目设计文档

> Designed by **黄小B** · Powered by **noSugarK**
>
> 一二、布布形象版权归原作者黄小B所有。本仓库是非商业的粉丝作品，所有对外发布的界面、安装包、文档都必须带上上面这行署名（见 [§7 署名规范](#7-署名规范)）。

本仓库最终包含三部分，全部放在同一个仓库里：

| 部分 | 目录 | 技术 | 状态 |
|---|---|---|---|
| 互动网页 | `docs/` | HTML + SVG + CSS 动画 + 原生 JS（渲染引擎 `docs/js/pet.js`） | ✅ 已完成 |
| 网站部署 | `docs/` | GitHub Pages（main 分支 `/docs`） | ⏳ 需要推到 GitHub 后在设置里开启 |
| 桌宠软件 | `desktop/` | Rust + Tauri v2，复用网页的渲染代码 | 🚧 M2/M3 第一版已实现 |
| 设计素材 | `design/` | 参考图、角色设定 | ✅ |

---

## 1. 仓库结构

```text
yier-bubu/
├─ docs/                    # GitHub Pages 站点根目录（网站 + 桌宠共用的渲染代码）
│  ├─ index.html            # 网站外壳：标题、按钮、页脚
│  ├─ pet.html              # 桌宠外壳：透明背景，只有熊
│  ├─ js/pet.js             # 共用渲染引擎：角色 SVG、状态机、移动、动作、自己玩、气泡、投喂动画
│  ├─ js/desktop.js         # 桌宠桥接：和 Rust 通信（点击穿透、菜单、拖放投喂、设置）
│  ├─ css/pet.css           # 共用角色 / 动作样式
│  └─ .nojekyll             # 让 Pages 原样发布，不走 Jekyll
├─ desktop/
│  ├─ src-tauri/
│  │  ├─ src/main.rs        # 窗口、点击穿透、托盘 / 右键菜单、回收站、系统空闲
│  │  ├─ Cargo.toml
│  │  ├─ tauri.conf.json    # frontendDist 指向 ../../docs，窗口加载 pet.html
│  │  └─ icons/
│  └─ README.md
├─ design/
│  └─ reference/            # 角色参考图、动作图、精灵图
├─ DESIGN.md                # 本文档
└─ README.md
```

**核心决定：只保留一份角色渲染代码。** 网页和桌宠画的是同一套 SVG，动作也是同一套 CSS/JS。Rust 只负责网页做不到的事：透明置顶窗口、托盘菜单、文件拖放进回收站、读取系统空闲时间和屏幕工作区。这样以后改形象、加动作只要改一处，网站和桌宠同时生效。

---

## 2. 角色规格（当前实现）

| | 一二 | 布布 |
|---|---|---|
| 身体色 | `#fffdf8` 暖白 | `#c9895a` 棕 |
| 耳朵 | 实心深棕 `#5b3524` | 棕 `#b87644`，内圈 `#6f3f25` |
| 腮红 | 粉 `#f9a9a0` | 橙黄 `#f7aa3c` |
| 嘴 | ω + 粉舌头 | ω |
| 配饰 | 脖子一圈细项圈 + 胸前小领结 `#6b3a26` | 无 |
| 手 | 从身体两侧伸出的圆手（肩点在身体边缘，默认外张 40°） | 弯在肚子前面的蜷爪（默认内收 32°） |

画法约定（写在 `bearSVG()` 里）：

- 画布 `viewBox="0 0 200 230"`，描边 `#3a2317`，宽 3，圆角连接。
- 头：上窄下宽的"糯米团"形；身体：圆梨形，无脖子；腿：两条短腿，中间一道缝。
- **每只熊只有一对手**，所有动作都只是转动这对手（正角度 = 向外，左右镜像）。手只描外侧和指尖，从肩膀长出来，不会看起来和身体脱节。
- 脸（眼睛、腮红、嘴、墨镜）在一个组里，跟着鼠标平移，被头的轮廓裁剪。

---

## 3. 动作与道具

### 3.1 已实现

| 类别 | 动作 | 触发方式 |
|---|---|---|
| 基础 | 眼睛和头跟着鼠标、呼吸、悬停害羞腮红 | 自动 |
| 基础 | 点击跳起（一二冒爱心、布布冒星星）、连点 5 下生气 | 点击 |
| 移动 | 追着鼠标跑（逐帧移动 + 腿交替 + 摆手 + 烟尘） | 拖动 |
| 移动 | 两只一起跑过去挥手 | 双击空白处 |
| 互动 | 拥抱、分开太远会哭 | 拖到一起 / 拉远 |
| 动作 | 思考（头顶冒 ?）、跳舞（手拉手 + 音符）、害羞、睡觉（趴下 + Zzz） | 按钮；闲置 12 秒自动睡 |
| 道具 | 🍜 吃面（碗 + 筷子 + 热气）、🧋 奶茶（吸管 + 珍珠）、🌹 送花（布布跑过去送给一二） | 按钮 |
| 搭配 | 🕶️ 墨镜、🧣 红围巾（可叠加，一直戴着直到再点一次） | 开关按钮 |

### 3.2 调研：表情包里常见的动作、道具、服装

一二布布的表情包主要在微信和 QQ 表情商店，截至目前已出到第 18 弹以上。海外叫 "Bubu & Dudu"，注意 **Bubu 指一二，Dudu 指布布**。国内站点（知乎、百度百科）屏蔽了抓取，下面的主题主要整理自 Tenor / GIFDB 的动图标题和描述：

| 主题 | 画面 | 建议做法 | 优先级 |
|---|---|---|---|
| 吃面 / 吃东西 | 两只用筷子吃面 | ✅ 已做 | — |
| 送花 | 布布送一二红玫瑰 | ✅ 已做 | — |
| 喝饮料 | 端着杯子喝茶 | ✅ 奶茶已做，可加咖啡 | — |
| 墨镜 + 购物袋 | 戴墨镜拎购物袋逛街 | 墨镜已做，加购物袋道具 + 走路动作 | 高 |
| 红围巾 | 冬天围红围巾 | ✅ 已做，可配飘雪背景 | — |
| 亲亲 / 爱心 | 亲一下，爱心飘起来 | 两只靠近、头互相歪、嘴变 3 形 + 大爱心 | 高 |
| 晚安 / 睡觉 | 盖被子、躺床上 | 在睡觉动作上加枕头、被子、月亮 | 高 |
| 青蛙头套 | 穿绿色青蛙服抱着对方 | 服装层：头顶加青蛙眼睛的头套 | 中 |
| 粉色小熊服 | 穿粉色熊玩偶服 | 服装层：全身换色 + 外耳 | 中 |
| 办公 / 咖啡 | 坐转椅喝咖啡 | 道具：转椅 + 咖啡杯（桌宠"陪你上班"模式） | 中 |
| 滑板 | 踩滑板 | 移动时有概率踩滑板滑过去 | 中 |
| 按摩 / 捶背 | 一只给另一只捶背 | 双人动作：一只坐、一只捶 | 低 |
| 生日 | 12 月 20 日是一二的生日 | 当天自动戴派对帽、出现蛋糕 | 高（彩蛋） |
| 节日 | 过年、情人节等主题包 | 按日期自动换装：春节红包灯笼、情人节玫瑰、夏天西瓜、下雨天打伞 | 中 |

调研来源见文末 [参考资料](#参考资料)。

### 3.3 "搭配动作展示"怎么做

网页上加一个 **图鉴页**（`docs/gallery.html`）：每张卡片是一个小画布，里面的一二和布布循环播放一个动作或一套搭配，比如"墨镜 + 购物袋 + 走路""围巾 + 飘雪 + 牵手"。卡片直接复用 `bearSVG()` 和状态类名，不需要额外的图片素材。

实现上，道具和服装各分一层：

- **道具**（`.prop.p-xxx`）：拿在手上的东西。显示时同时把手转到身前（`rotate(-48deg)`），做完动作就消失。
- **服装**（`.o-xxx`）：穿戴在身上，可叠加，持久保留；桌宠里会记住上次的搭配。
- 新增一件东西 = 在 `bearSVG()` 里加一个 SVG 组 + 一行 CSS 显示规则 + 一个按钮或菜单项。

---

## 4. 网站：GitHub Pages

### 部署步骤

1. 把仓库推到 GitHub（公开仓库，或私有仓库 + 付费计划）。
2. 仓库 **Settings → Pages → Build and deployment**：Source 选 **Deploy from a branch**，Branch 选 `main`，文件夹选 `/docs`，保存。
3. 一两分钟后访问 `https://<用户名>.github.io/<仓库名>/`。
4. 可选：要绑定自定义域名，在 `docs/CNAME` 写域名，并在 DNS 里加 CNAME 记录。

不需要 GitHub Actions：`docs/` 里是纯静态文件，Pages 直接发布。`.nojekyll` 已经放好，避免 Jekyll 忽略下划线开头的文件。

### 站点页面规划

| 页面 | 内容 |
|---|---|
| `index.html` | 现在的互动页（首页） |
| `gallery.html` | 动作 / 搭配图鉴（§3.3） |
| `download.html` | 桌宠下载：链接到 GitHub Releases 最新版，分 Windows / macOS / Linux |
| 页脚（所有页面） | `Designed by 黄小B · Powered by noSugarK` + 版权说明 |

目前唯一的外部依赖是 Google Fonts 的站酷快乐体。离线或国内访问慢时会退回系统字体；要更稳可以把字体子集化后放进 `docs/fonts/`。

---

## 5. 桌宠软件：Rust + Tauri v2

### 5.1 为什么选 Tauri

| 方案 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| **Tauri v2**（Rust 后端 + 系统 WebView） | 直接复用网页的 SVG/CSS 动画；安装包小（Windows 约 3–10 MB）；透明窗口、托盘、拖放都有现成 API | 依赖系统 WebView（Win10/11 自带 WebView2） | ✅ 采用 |
| 纯 Rust（winit + tiny-skia / egui） | 没有 WebView | 所有动画要用 Rust 重写一遍，改形象要维护两套 | ❌ |
| Bevy | 游戏引擎，动画系统强 | 体积大、耗电，桌宠用不上 | ❌ |

Rust 负责系统能力，网页负责画熊。

### 5.2 功能清单

**(1) 透明置顶窗口 + 点击穿透**
- 一个无边框、透明、置顶、不进任务栏的窗口，铺满主显示器的工作区（`work_area`，即任务栏以上的区域）。两只熊都在这个窗口里，所以网页里的跑动、拥抱、跳舞、送花等双人互动全部原样可用。
- 点击穿透：Rust 每 16 ms 读一次全局光标，只有光标在熊（或它的气泡）上时窗口才接收鼠标，其余时候鼠标直接穿过去操作桌面。拖动熊时临时接收整个窗口，防止拖太快时"脱手"。
- 熊默认站在右下角任务栏上沿，自己散步也沿着底边走；可以拖到屏幕任何地方。
- 窗口配置：`transparent, decorations: false, alwaysOnTop, skipTaskbar, shadow: false, resizable: false, focus: false`。
- 眼睛跟着全局光标转（Rust 推送 `cursor` 事件），不算"有人在玩"。

**(2) 菜单：托盘右键 = 熊身上右键**
- 同一份原生菜单：`动作 ▸`、`显示 ▸`（一二和布布 / 只有一二 / 只有布布）、`大小 ▸`（小 / 中 / 大）、`搭配 ▸`（墨镜、围巾）、`没人理时自己玩`、`开机自启`、`吐出来`、`打开回收站`、`清空回收站…`、`隐藏到托盘 / 显示桌宠`、`关于`、`退出`。
- 托盘图标左键：隐藏 / 显示桌宠；右键：菜单。
- 设置（显示哪只、大小、搭配、自己玩）存在 WebView 的 localStorage，启动时同步菜单勾选状态。
- 以后扩展：把 `LOOKS` 表做成角色包 `characters/<id>.json`，加新角色不用改代码；可选兼容 Codex pet 精灵图格式（8×9 网格、单格 192×208，比如 [littlegqqq/Yier-Bubu](https://github.com/littlegqqq/Yier-Bubu)），需先确认素材授权。

**(3) 没人理的时候自己玩**
- 行为调度器（JS）：用户一段时间没和熊互动后，按权重随机挑一个活动，做完再挑下一个：
  - 沿任务栏散步、坐下东张西望、吃面、喝奶茶、两只一起跳舞 / 拥抱 / 牵手散步、追一只飞过的蝴蝶。
  - 用户离开电脑（Rust 读系统空闲时间，比如 5 分钟无键鼠）→ 趴下睡觉；用户回来 → 醒来伸懒腰。
  - 深夜（23 点后）→ 打哈欠、盖被子；12 月 20 日 → 生日彩蛋。
- 用户点击、拖动、投喂时立即打断当前活动。
- 可选：鼠标经过时熊会追着光标跑一小段（设置里可关）。

**(4) 当回收站："把文件喂给它吃掉"**

流程：

1. 文件或文件夹拖到熊身上 → 熊张开**超夸张的大嘴**（带小尖牙和舌头）、眼睛放大、举起双手、身子抖动着等。拖离熊身上嘴就合上。
2. 松手 → `check_meal(paths)` 检查能不能吃 → `eat_files(paths)`。
3. Rust 用 [`trash`](https://crates.io/crates/trash) crate 把文件**移到系统回收站**（Windows 回收站 / macOS 废纸篓 / Linux FreeDesktop Trash）。
4. 文件图标飞进嘴里，熊嚼几下、冒星星，气泡："吃掉了 3 个，嗝～ 在回收站可以找回"。

安全规则（已实现）：

- 投喂**只移进系统回收站**，不做永久删除。Windows 上 `trash` 使用 `FOF_ALLOWUNDO | FOF_WANTNUKEWARNING`：如果某个文件大到进不了回收站，系统会先弹警告，而不是悄悄删掉。
- 一次超过 20 个，或总大小超过 1 GB（文件夹会估算大小），先在气泡里问"要吃掉吗？"。
- 拒绝：盘符根目录、用户主目录本身、系统和程序目录（`SystemRoot`、`Program Files`、`ProgramData`、`/usr`、`/System` 等）、程序自身目录、不存在的路径。Rust 端会再检查一遍，不信任前端传来的数据。
- 「吐出来」撤销上一次投喂：Windows / Linux 用 `trash::os_limited::restore_all`；macOS 不支持程序内还原，会提示去废纸篓"放回原处"。
- 每次吃了什么都追加记录到 `<应用数据目录>/meals.log`（时间 + 原路径）。

**资源管理器右键菜单「请一二 / 布布 / 一二和布布帮你删除文件」**（Windows，已实现）：

- 注册在当前用户的注册表（`HKCU\Software\Classes\*\shell` 和 `Directory\shell`），不需要管理员权限。出现哪几项跟着「显示」设置走：两只都在 → 三项都有；只有一只 → 只出现那一只。菜单里「资源管理器右键菜单」取消勾选即可全部移除。
- 选中后 Explorer 运行 `yierbubu.exe --eat <yier|bubu|both> "<路径>"`。桌宠已经在运行时，由 `tauri-plugin-single-instance` 转交给正在运行的实例；多选文件时 Explorer 会逐个启动，桌宠把 400 ms 内的请求合并成一次"跑腿"。桌宠没运行时会自动启动，等页面加载好再执行。
- 定位文件：用 Windows UI Automation 读取当前获得焦点的条目（资源管理器列表或桌面图标）的屏幕位置，并核对名字确实是这个文件；读不到时退回鼠标位置。
- 动画：头顶冒 ❗、喊"收到！"→ 加速冲刺（步子更快、烟尘更密）跑到文件旁边（两只就一左一右）→ 张开大嘴 → 文件图标飞进嘴里、嚼 → 移进回收站 → 气泡"吃掉了 N 个" → 几秒后走回原来的位置。检查和确认规则与拖放投喂相同。
- 注意：Windows 11 的新版右键菜单只显示通过 MSIX 包注册的命令，这里的条目在「显示更多选项」（经典菜单）里。以后要进新版菜单，需要做稀疏包 + `IExplorerCommand`。

「清空回收站…」（右键菜单）：

- 会**永久删除**回收站里的所有东西，所以必须先在熊的气泡里确认："回收站里有 N 个东西，全部清空吗？清空后就找不回来了" → [清空] [算了]。
- Windows / Linux 用 `trash::os_limited::purge_all`；macOS 暂不支持，提示在废纸篓里清空。

**(5) 其他**
- ✅ 开机自启：`tauri-plugin-autostart`（菜单里开关，默认关）。
- ⏳ 单实例：`tauri-plugin-single-instance`。
- ⏳ 记住熊的位置；多显示器。
- ✅ 关于 + 托盘提示：`Designed by 黄小B · Powered by noSugarK`。

### 5.3 前后端接口

| 方向 | 名称 | 说明 |
|---|---|---|
| JS → Rust | `set_hit_rects(rects)` | 熊和气泡的位置，用于点击穿透（变化时发送，最多 20 次/秒） |
| JS → Rust | `check_meal(paths) -> {allowed, blocked, hasDirs, needsConfirm}` | 投喂前检查 |
| JS → Rust | `eat_files(paths) -> 数量` | 移进回收站并记录 |
| JS → Rust | `empty_trash() -> 数量` | 确认后清空回收站 |
| JS → Rust | `show_menu()` | 在熊身上右键时弹出原生菜单 |
| JS → Rust | `sync_menu(settings)` | 启动时同步菜单勾选状态 |
| Rust → JS | `cursor [x, y]` / `idle 秒数` | 全局光标（眼睛跟随）、系统空闲时间（离开电脑就睡觉） |
| Rust → JS | `menu [id, checked]` | 菜单指令：`act:*`、`show:*`、`size:*`、`outfit:*`、`autoplay`、`about` |
| Rust → JS | `notice 文本` / `ask_empty 数量` | 让熊说话；请求确认清空回收站 |
| Tauri → JS | 拖放事件 `enter / over / drop / leave` | 张大嘴等待 / 吃掉 / 合上嘴 |
| Rust → JS | `errand {who, paths, target}` | 资源管理器右键「请X帮你删除文件」：跑到文件位置吃掉 |
| JS → Rust | `pet_ready()` | 页面加载完成，发送启动期间积压的跑腿请求 |

### 5.4 渲染代码怎么共用（已完成）

```text
docs/
  js/pet.js      # bearSVG()、LOOKS、状态机、移动引擎、粒子（无页面 UI）
  css/pet.css    # 角色 + 动作样式
  index.html     # 网站外壳：标题、按钮、页脚，引用上面两个文件
  pet.html       # 桌宠外壳：透明背景、没有任何 UI，只有熊
  js/desktop.js  # 桌宠专用桥接
```

`tauri.conf.json` 里 `build.frontendDist` 指向 `../../docs`，窗口加载 `pet.html`。

### 5.5 构建与发布

- 本地开发：安装 Rust stable + Tauri CLI（`cargo install tauri-cli --version "^2"`），在 `desktop/` 下运行 `cargo tauri dev`。
- 发布：GitHub Actions 用 `tauri-apps/tauri-action`，打 tag `v*` 时构建 Windows（NSIS / MSI）、macOS（dmg，Intel + Apple Silicon）、Linux（AppImage / deb），上传到 Releases。网站的下载页链接到最新 Release。
- 代码签名：Windows 没签名时会出现 SmartScreen 提示，macOS 没公证需要右键打开，第一版先在下载页写明。

### 5.6 性能目标

- 空闲时 CPU < 1%，内存 < 80 MB。
- 熊睡着或窗口被遮挡时降低刷新率：暂停 `requestAnimationFrame` 循环，只保留 CSS 动画。

---

## 6. 里程碑

| 里程碑 | 内容 | 产出 |
|---|---|---|
| **M0**（已完成） | 互动网页：角色、移动、各类动作、道具、搭配 | `docs/index.html` |
| **M1** | ✅ 拆出 `pet.js / pet.css`；⏳ 图鉴页、下载页；推到 GitHub，开启 Pages | 线上网站 |
| **M2** | ✅ Tauri 桌宠：透明置顶窗口、点击穿透、站在任务栏上、托盘 / 右键菜单、隐藏到托盘、切换形象、大小 | 可运行的桌宠 |
| **M3** | ✅ 自己玩、双熊互动、大嘴投喂进回收站 + 吐出来、清空回收站；⏳ 多显示器 | 功能完整的桌宠 |
| **M4** | 自动更新、开机自启、节日 / 生日彩蛋、更多道具与服装、CI 发布三平台安装包 | v1.0 |

---

## 7. 署名规范

所有对外的界面都必须带上：

```text
Designed by 黄小B · Powered by noSugarK
```

| 位置 | 做法 |
|---|---|
| 网站 | 每页页脚 + `<meta name="author">` |
| 桌宠 | 关于窗口、托盘提示文字、安装包描述（`tauri.conf.json` 的 `bundle.copyright` / `longDescription`） |
| 仓库 | README 顶部、本文档顶部、Release 说明 |

版权说明（放在 README 和网站页脚）：

> 一二、布布形象版权归原作者黄小B所有。本项目为非商业粉丝作品，未经授权不得用于商业用途；如权利人提出要求，将立即下架相关内容。

---

## 8. 待你确认的问题

1. ~~代码许可证~~：已定为 MIT（仅代码；形象版权始终归黄小B，见 LICENSE）。
2. **仓库名和 GitHub 账号**：决定 Pages 地址 `https://<账号>.github.io/<仓库名>/`。
3. **是否向黄小B申请授权**：如果以后要公开分发桌宠安装包，建议先联系作者取得许可。
4. **桌宠默认形态**：默认两只一起出现，还是只出现一只？

---

## 参考资料

- 一二（微信表情包形象）· 百度百科：https://baike.baidu.com/item/%E4%B8%80%E4%BA%8C/23434669
- 全网最全【一二布布】动态表情包 · 知乎：https://zhuanlan.zhihu.com/p/557914631
- Bubu Dudu GIFs · Tenor：https://tenor.com/search/bubu-dudu-gifs
- Bubu Dudu Eating Ramen · Tenor：https://tenor.com/view/bubu-dudu-eating-bubu-dudu-ramen-bubu-ramen-dudu-ramen-bubu-dudu-date-gif-7052186152999366777
- Bubu Dudu Flower Gift · Tenor：https://tenor.com/view/bubu-dudu-flower-gift-gif-26248513
- Bubu Dudu GIFs · GIFDB：https://gifdb.com/bubu-dudu
- littlegqqq/Yier-Bubu（Codex pet 精灵图）：https://github.com/littlegqqq/Yier-Bubu
- Tauri v2 文档：https://v2.tauri.app/
- trash crate：https://crates.io/crates/trash
