# Awu Pet · 设计与结构

> 一二、布布 Designed by **黄小B** · Powered by **noSugarK**。形象版权归各自权利人；本仓库为非商业粉丝作品。

## 宠物与画面

默认展示一二和布布两只，使用仓库内的 Codex / Petdex 帧动画包。桌面安装包中的原图位于 `desktop/src-tauri/pets/一二布布/`；静态网页使用同一帧图的副本 `docs/img/*-spritesheet.webp`。没有矢量宠物模型或兜底渲染。

每张精灵图由 192 × 208 像素的单元格构成，每行一种动作。`docs/js/core/runtime.js` 加载图片、数出各行有效帧、按 8 fps 切换背景位置。角色数据在 `docs/js/characters/`，包括名字、动作行、性格和台词。`docs/js/packs.js` 把已安装宠物包的成员加入当前角色名单。

网站和桌面共用 `docs/js/core/runtime.js`、`docs/js/behaviors/` 与 `docs/css/pet.css`。网站只展示默认帧图；桌面由 Tauri 读取用户安装的宠物包。额外宠物保存在 `desktop/optional-pets/`，可从角色菜单按需下载或把本地宠物包导入应用数据目录。宠物包至少含 `pet.json` 和 `spritesheet.webp`，来源及署名写在清单中。同屏最多四只。

## 桌面交互

Tauri 的透明窗口覆盖多屏；Rust 发送屏幕工作区和全局指针坐标，前端负责角色移动、动作和菜单。拖文件给宠物，或从 Windows 资源管理器右键请宠物删除，都会先由 Rust 检查文件是否可移入系统回收站。单项或合计达到 500 MiB、或一次超过 20 项时再确认。成功后随机播放吃或踢；失败和取消不播放成功动画。回收站中的文件可以找回，菜单中的“吐出上一餐”尝试恢复最近一次投喂。

`docs/js/platform/desktop.js` 负责 Tauri 命令与事件、角色菜单、下载、设置和拖放；`desktop/src-tauri/src/feed.rs` 负责文件保护与回收站；`desktop/src-tauri/src/pets.rs` 负责宠物包。菜单图标及圆盘仍使用 SVG，它们是界面元素，不是宠物模型。

## 署名

- 一二、布布：黄小B；帧动画包来源 [littlegqqq/Yier-Bubu](https://github.com/littlegqqq/Yier-Bubu)。
- 其他宠物：查看各自 `pet.json` 的 `source` 与 `credit`。
