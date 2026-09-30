# 一二 & 布布 · 项目设计文档

> 形象设计：**黄小B** · powered by **nosugark**
>
> 一二、布布形象版权归原作者黄小B所有。本仓库是非商业的粉丝作品，所有对外发布的界面、安装包、文档都必须带上上面这行署名（见 [§7 署名规范](#7-署名规范)）。

本仓库最终包含三部分，全部放在同一个仓库里：

| 部分 | 目录 | 技术 | 状态 |
|---|---|---|---|
| 互动网页 | `docs/` | 单文件 HTML + SVG + CSS 动画 + 原生 JS | ✅ 已完成第一版 |
| 网站部署 | `docs/` | GitHub Pages（main 分支 `/docs`） | ⏳ 需要推到 GitHub 后在设置里开启 |
| 桌宠软件 | `desktop/` | Rust + Tauri v2，复用网页的渲染代码 | 📝 本文档设计，待实现 |
| 设计素材 | `design/` | 参考图、角色设定 | ✅ |

---

## 1. 仓库结构

```text
yier-bubu/
├─ docs/                    # GitHub Pages 站点根目录（网站 + 桌宠共用的渲染代码）
│  ├─ index.html            # 互动网页（现在是单文件，M1 拆出 pet.js / pet.css）
│  └─ .nojekyll             # 让 Pages 原样发布，不走 Jekyll
├─ desktop/                 # Rust 桌宠（M2 起）
│  ├─ src-tauri/
│  │  ├─ src/main.rs        # 窗口、托盘、文件投喂、系统信息
│  │  ├─ Cargo.toml
│  │  └─ tauri.conf.json    # frontendDist 指向 ../../docs
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
| 页脚（所有页面） | `形象设计：黄小B · powered by nosugark` + 版权说明 |

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

**(1) 透明置顶小窗口**
- 每个角色一个无边框、透明、置顶、不显示在任务栏的小窗口（约 240×260）。熊"走路"就是移动窗口本身，窗口小，所以点击判定简单，透明区域也不会挡太多桌面。
- 默认站在任务栏上沿（从 Rust 读显示器的工作区 `work_area`），多显示器下可以走到别的屏幕。
- 配置：`transparent: true, decorations: false, alwaysOnTop: true, skipTaskbar: true, shadow: false, resizable: false`。

**(2) 切换形象**
- 托盘菜单：`一二` / `布布` / `一起出现`，另有 `搭配 ▸`（墨镜、围巾……）、`动作 ▸`、`设置`、`关于`、`退出`。
- 形象即数据：把 `LOOKS` 表（颜色、配饰、肩点……）做成角色包 `characters/<id>.json`，以后加新角色不用改代码。
- 可选扩展：兼容 Codex pet 精灵图格式（8×9 网格、单格 192×208，比如 [littlegqqq/Yier-Bubu](https://github.com/littlegqqq/Yier-Bubu)），这样可以导入别人做好的像素风角色。需要按帧播放的精灵图渲染器，另外要确认素材授权。

**(3) 没人理的时候自己玩**
- 行为调度器（JS）：用户一段时间没和熊互动后，按权重随机挑一个活动，做完再挑下一个：
  - 沿任务栏散步、坐下东张西望、吃面、喝奶茶、两只一起跳舞 / 拥抱 / 牵手散步、追一只飞过的蝴蝶。
  - 用户离开电脑（Rust 读系统空闲时间，比如 5 分钟无键鼠）→ 趴下睡觉；用户回来 → 醒来伸懒腰。
  - 深夜（23 点后）→ 打哈欠、盖被子；12 月 20 日 → 生日彩蛋。
- 用户点击、拖动、投喂时立即打断当前活动。
- 可选：鼠标经过时熊会追着光标跑一小段（设置里可关）。

**(4) 当回收站："把文件喂给它吃掉"**

流程：

1. 文件拖到熊身上 → Tauri `DragDropEvent::Enter` → 熊张大嘴、眼睛放光。
2. 松手 `Drop` → 前端调用 Rust 命令 `eat_files(paths)`。
3. Rust 用 [`trash`](https://crates.io/crates/trash) crate 把文件**移到系统回收站**（Windows 回收站 / macOS 废纸篓 / Linux FreeDesktop Trash）。
4. 熊嚼几下、打个嗝，气泡提示："吃掉了 3 个文件 · 在回收站可以找回"。

安全规则（必须做）：

- **永远不做永久删除**，只移进系统回收站，用户随时可以找回。
- 一次超过 20 个文件、总大小超过 1 GB、包含文件夹时，先弹确认框。
- 拒绝系统目录、盘符根目录和程序自身目录。
- 右键菜单提供「吐出来（撤销上一次）」，Windows / Linux 用 `trash::os_limited::restore_all`；macOS 不支持程序内还原，改为提示"打开废纸篓"。另有「打开回收站」。
- 本地记录每次吃了什么（文件名、时间、原路径），方便追溯。

**(5) 其他**
- 开机自启：`tauri-plugin-autostart`（设置里开关，默认关）。
- 单实例：`tauri-plugin-single-instance`。
- 保存位置、角色、搭配、设置：`tauri-plugin-store`。
- 关于窗口 + 托盘提示：`一二 & 布布 桌宠 · 形象设计：黄小B · powered by nosugark`。

### 5.3 前后端接口

| 方向 | 名称 | 说明 |
|---|---|---|
| JS → Rust | `eat_files(paths) -> {eaten, skipped, needsConfirm}` | 投喂 |
| JS → Rust | `undo_last_meal()` | 吐出来 |
| JS → Rust | `move_window(x, y)` / `get_work_area()` | 走路、贴任务栏 |
| JS → Rust | `system_idle_seconds()` | 判断用户是否离开 |
| Rust → JS | `menu://look` / `menu://outfit` / `menu://action` | 托盘菜单指令 |
| Rust → JS | `drag://enter` / `drag://leave` | 拖放悬停，熊做"准备吃"的表情 |

### 5.4 渲染代码怎么共用（M1 要做的拆分）

```text
docs/
  js/pet.js      # bearSVG()、LOOKS、状态机、移动引擎、粒子（无页面 UI）
  css/pet.css    # 角色 + 动作样式
  index.html     # 网站外壳：标题、按钮、页脚，引用上面两个文件
  pet.html       # 桌宠外壳：透明背景、没有任何 UI，只放一只熊
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
| **M1** | 拆出 `pet.js / pet.css`；加图鉴页、下载页；推到 GitHub，开启 Pages | 线上网站 |
| **M2** | Tauri 桌宠最小版：透明窗口、一只熊站在任务栏上、托盘切换形象、拖动 | 可运行的桌宠 |
| **M3** | 自己玩的行为调度、双熊互动、投喂进回收站 + 撤销 | 功能完整的桌宠 |
| **M4** | 自动更新、开机自启、节日 / 生日彩蛋、更多道具与服装、CI 发布三平台安装包 | v1.0 |

---

## 7. 署名规范

所有对外的界面都必须带上：

```text
形象设计：黄小B · powered by nosugark
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
