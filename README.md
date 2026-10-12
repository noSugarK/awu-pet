<p align="center"><img src="docs/img/icon.png" width="96" alt="Awu Pet"></p>

<h1 align="center">Awu Pet · 嗷呜桌宠</h1>

<p align="center"><b>住在任务栏上的桌宠：会陪你玩，还会帮你“嗷呜”一口吃掉文件。</b></p>

<p align="center">
  <a href="https://github.com/noSugarK/awu-pet/releases/latest"><img src="https://img.shields.io/github/v/release/noSugarK/awu-pet?sort=semver&label=release" alt="最新版本"></a>
  <a href="desktop/src-tauri/tauri.conf.json"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FnoSugarK%2Fawu-pet%2Fmain%2Fdesktop%2Fsrc-tauri%2Ftauri.conf.json&query=%24.version&label=version&color=orange" alt="当前版本"></a>
  <a href="https://github.com/noSugarK/awu-pet/stargazers"><img src="https://img.shields.io/github/stars/noSugarK/awu-pet?style=flat&logo=github" alt="Stars"></a>
  <a href="https://github.com/noSugarK/awu-pet/releases"><img src="https://img.shields.io/github/downloads/noSugarK/awu-pet/total?label=downloads" alt="下载量"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT（仅代码）"></a>
  <br>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-informational" alt="Windows · macOS · Linux">
  <img src="https://img.shields.io/badge/Tauri-v2-24C8DB?logo=tauri&logoColor=white" alt="Tauri v2">
  <img src="https://img.shields.io/badge/Rust-stable-B7410E?logo=rust&logoColor=white" alt="Rust">
  <a href="https://github.com/noSugarK/awu-pet/actions/workflows/release.yml"><img src="https://img.shields.io/github/actions/workflow/status/noSugarK/awu-pet/release.yml?label=release%20build" alt="打包状态"></a>
</p>

<p align="center">一二、布布 Designed by <b>黄小B</b> · Powered by <b>noSugarK</b></p>

Awu Pet（原名 YierBubu-Pet）是一款桌面宠物。它们站在任务栏上，没人理时自己散步、玩耍，你离开电脑就打盹；把文件拖给它们，文件会移进系统回收站，宠物随机吃掉或踢走，之后仍可找回。

默认是一二和布布两只（帧动画）；也可以按需下载或导入其他宠物包，**最多同时 4 只**同屏：小白和小金毛、噜噜和噜妹、奶龙、奶蛙，或任意 [Petdex](https://petdex.dev) 宠物。

- **下载**：[GitHub Releases](https://github.com/noSugarK/awu-pet/releases)（Windows `.exe` / `.msi`、macOS `.dmg`、Linux `.AppImage` / `.deb`）
- **互动网页**：[`docs/`](docs/index.html)，浏览器直接打开 `docs/index.html`，或部署到 GitHub Pages
- **设计文档**：[`DESIGN.md`](DESIGN.md)

## 能做什么

| | |
|---|---|
| 🐾 **像活的一样** | 按性格自己散步、玩耍、打盹；夜里犯困；两只会互相戳醒、追着玩、抱抱；你离开电脑就睡觉；全屏打游戏 / 看视频时躲到角落 |
| 🍪 **文件投喂** | 把文件 / 文件夹拖到宠物身上，小文件直接移进**系统回收站**，单项或合计达到 500 MiB、或超过 20 项时先确认；成功后随机吃掉或踢走；「今日食谱」记录操作，「吐出上一餐」可在重启后撤销最近一次投喂 |
| 🖱️ **资源管理器右键** | 「请一二删除」「请一二和布布删除」……宠物冲到文件旁边帮忙移入回收站（Windows；Win11 在「显示更多选项」里），菜单项跟着当前显示的角色走 |
| 🔄 **换角色** | 右键宠物 → 圆盘菜单「角色」：点击换成它，按住 Ctrl / Shift 点击添加或移除，最多 4 只 |
| ✨ **每只有自己的动作** | 帧动画宠物的动作按它自己的画命名：小白会比心、撒花、打电话，噜噜会摸肚子、托腮，奶龙会偷笑、扭扭…… 双击宠物随机来一个，鼠标停在它身上它会害羞 |
| 🖥️ **多显示器** | 窗口覆盖所有屏幕，宠物沿着各自所在屏幕的任务栏走，插拔显示器会自动适配 |
| ⚙️ **其他** | 滚轮调大小、记住位置、置顶、开机自启、托盘菜单、点击穿透（只有宠物身上接收鼠标） |

右键宠物弹出**圆盘菜单**：按住右键往某个方向一划、松开即选；也可以松开后再点。

## 宠物包（帧动画）

桌宠能读取 Codex / Petdex 格式的宠物包（`pet.json` + 精灵图）。安装程序只带一二和布布两只（帧动画版，在 [`desktop/src-tauri/pets`](desktop/src-tauri/pets)）。小白和小金毛、噜噜和噜妹、奶龙、奶蛙保存在仓库的 [`desktop/optional-pets`](desktop/optional-pets)，右键宠物 →「角色」可按需在线下载（下载使用仓库固定版本 `v0.5.1` 的同一份数据）。作者和来源写在各 `pet.json` 中。

更新这些宠物包（走代理的网络加 `NODE_USE_ENV_PROXY=1`，Node 24+）：

```bash
node desktop/scripts/install-pets.mjs # 装到自己电脑的宠物包文件夹
```

还可以：

- 用 `npx petdex install <名字>` 装任意 Petdex 宠物（装在 `~/.codex/pets`，桌宠会自动找到）；
- 右键「角色 ▸ 导入本地宠物包」，把含 `pet.json` 和精灵图的文件夹放进打开的位置；一个文件夹里放两个宠物包就是一组。再次右键即可选择。

宠物包的动作取决于精灵图与 `pet.json` 中的动作行；菜单只列当前角色有的动作。

## 开发

需要 [Rust](https://rustup.rs) stable；Windows 自带 WebView2。

```bash
cd desktop/src-tauri
cargo run                 # 直接运行（调试版）
```

打包安装程序需要 Tauri CLI：

```bash
cargo install tauri-cli --version "^2"
cd desktop && cargo tauri build
```

网页和桌宠共用 `docs/` 里同一份代码：改宠物的画法或动作，两边同时生效。目录和架构见 [`DESIGN.md`](DESIGN.md)。

| 目录 | 内容 |
|---|---|
| `docs/` | 网站 + 桌宠共用的前端（帧动画、动作、自主行为、圆盘菜单） |
| `desktop/` | Rust + Tauri v2 桌宠：透明窗口、托盘、回收站、资源管理器菜单、宠物包、多显示器 |
| `desktop/src-tauri/pets/` | 安装程序自带的宠物包 |
| `desktop/optional-pets/` | 仓库中的按需下载宠物包，不打进安装程序 |
| `desktop/scripts/install-pets.mjs` | 下载 / 更新宠物包 |
| `design/` | 品牌素材 |
| `video/` | Remotion 宣传视频（`cd video && npm i && npm run render`） |

### 发布新版本

改 `desktop/src-tauri/tauri.conf.json` 里的 `version`，推送同名 tag（如 `v0.4.0`），GitHub Actions 会打包三个平台并发布到 Releases。

### 部署网站

仓库 Settings → Pages → Deploy from a branch → `main` / `/docs`，地址是 `https://nosugark.github.io/awu-pet/`。

## 许可证与版权

代码以 [MIT](LICENSE) 许可发布。

- 一二、布布形象版权归原作者 **黄小B** 所有（Designed by 黄小B）。
- 线条小狗（小白、小金毛）© moonlab_studio；奶龙 © 第七印象；噜噜与噜妹 © 原作者（抖音）。
- 自带宠物包的精灵图版权归各自作者所有（littlegqqq、Petdex 投稿者，见各 `pet.json`），随本项目分发仅供非商业使用；作者或权利人要求时立即移除。

本项目为非商业粉丝作品，未经授权不得用于商业用途；如权利人提出要求，将立即下架相关内容。

<p align="center">Designed by 黄小B · Powered by noSugarK</p>
