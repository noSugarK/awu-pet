# Awu Pet 嗷呜桌宠 · 桌面端

> 一二、布布 Designed by **黄小B** · Powered by **noSugarK**

Rust + Tauri v2。宠物的画法、动作和菜单来自 `../docs/`（和网站同一份代码，窗口加载 `pet.html`）；Rust 只做网页做不到的事。

## Rust 负责什么

| 文件 | 内容 |
|---|---|
| `src/main.rs` | 覆盖所有显示器的透明置顶窗口、点击穿透（只有宠物身上接收鼠标）、全局光标 / 空闲时间 / 全屏检测、托盘菜单、资源管理器「请X删除」的跑腿请求、开机自启 |
| `src/feed.rs` | 文件投喂：检查能不能吃、移进系统回收站、吐出来、清空回收站、`meals.log` |
| `src/pets.rs` | 宠物包：在 `<应用数据>/pets` 和 `~/.codex/pets` 里找 Codex / Petdex 宠物包，读取精灵图（只允许这两个文件夹里的图片） |
| `src/explorer.rs` | 资源管理器右键菜单（当前用户注册表，不需要管理员）、定位被选中的文件 |
| `src/platform.rs` | 全屏程序检测、打开回收站 / 文件夹 |
| `installer-hooks.nsh` | Windows 安装包：先卸载旧版 YierBubu-Pet |
| `scripts/install-pets.mjs` | 把选好的宠物包装进 `<应用数据>/pets`，或 `--out src-tauri/pets` 更新安装程序自带的那份（含动作名、状态用哪一行等 `awu` 字段） |

应用数据目录：Windows `%APPDATA%\com.nosugark.yierbubupet`（identifier 沿用旧名，升级后设置和位置都保留）。

## 运行和打包

```bash
cd src-tauri
cargo run                          # 调试版，直接运行
cargo install tauri-cli --version "^2"
cd .. && cargo tauri build         # 打包安装程序（NSIS / MSI / dmg / AppImage / deb）
```

装宠物包（帧动画角色）：

```bash
node scripts/install-pets.mjs      # 走代理时：NODE_USE_ENV_PROXY=1 node scripts/install-pets.mjs
```

## 前后端接口

| 方向 | 名称 | 说明 |
|---|---|---|
| JS → Rust | `set_hit_rects(rects)` | 宠物和气泡的位置，用于点击穿透 |
| JS → Rust | `sync_menu(settings)` | 设置、托盘「角色」列表、资源管理器菜单项（页面算好，Rust 照着注册） |
| JS → Rust | `check_meal` / `eat_files` / `empty_trash` | 投喂前检查、移进回收站、清空 |
| JS → Rust | `list_pets()` / `read_pet_sheet(path)` | 找到的宠物包；读一张精灵图 |
| JS → Rust | `screen_areas()` | 各显示器工作区（页面坐标，主屏在前） |
| JS → Rust | `menu_action(id)` / `autostart_enabled()` / `pet_ready()` | 需要 Rust 做的菜单项；开机自启状态；页面就绪 |
| Rust → JS | `cursor` / `idle` / `fullscreen` | 全局光标、系统空闲秒数、前台是否全屏 |
| Rust → JS | `screens` | 显示器变化后的新工作区 |
| Rust → JS | `menu` / `notice` / `ask_empty` / `errand` | 托盘菜单指令、让宠物说话、确认清空、资源管理器跑腿 |
