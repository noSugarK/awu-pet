// YierBubu-Pet (一二布布桌宠) · Designed by 黄小B · Powered by noSugarK
//
// One transparent overlay window covers the work area; the bears are drawn by the shared web runtime
// in docs/. Rust makes the window click-through except over the bears, tells the page what the computer
// is doing (cursor, idle time, fullscreen apps), owns the bear / tray menus, and runs 文件投喂 (feed.rs).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod explorer;
mod feed;
mod platform;

use serde::{Deserialize, Serialize};
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{
    menu::{CheckMenuItem, IsMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WebviewWindow, Wry,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

#[derive(Deserialize, Clone, Copy)]
struct Rect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

struct Shared {
    hit_rects: Mutex<Vec<Rect>>,
    on_top: AtomicBool,     // the user's 置顶 setting
    fullscreen: AtomicBool, // a fullscreen app is in front: step back behind it
}

// ---------- the overlay: click-through, cursor, idle, fullscreen ----------

#[tauri::command]
fn set_hit_rects(rects: Vec<Rect>, shared: State<Shared>) {
    *shared.hit_rects.lock().unwrap() = rects;
}

fn apply_on_top(win: &WebviewWindow, shared: &Shared) {
    let _ = win.set_always_on_top(shared.on_top.load(Ordering::SeqCst) && !shared.fullscreen.load(Ordering::SeqCst));
}

#[cfg(windows)]
fn own_handle(win: &WebviewWindow) -> isize {
    win.hwnd().map_or(0, |h| h.0 as isize)
}
#[cfg(not(windows))]
fn own_handle(_: &WebviewWindow) -> isize {
    0
}

/// Polls the global cursor: the window only takes the mouse while it is over a bear, so the rest of
/// the desktop stays usable. Also streams cursor, idle time and fullscreen changes to the page.
fn watch(app: AppHandle, win: WebviewWindow) {
    thread::spawn(move || {
        let mut ignoring = true;
        let mut last = (f64::NAN, f64::NAN);
        let own = own_handle(&win);
        let mut fs_seen = 0; // consecutive fullscreen samples; one blip doesn't count
        for tick in 0u64.. {
            thread::sleep(Duration::from_millis(16));
            let shared = app.state::<Shared>();
            if tick % 60 == 0 {
                if let Ok(idle) = user_idle::UserIdle::get_time() {
                    let _ = win.emit("idle", idle.as_seconds());
                }
                fs_seen = if platform::fullscreen_app(own) { fs_seen + 1 } else { 0 };
                let fs = fs_seen >= 2;
                if fs != shared.fullscreen.swap(fs, Ordering::SeqCst) {
                    apply_on_top(&win, &shared);
                    let _ = win.emit("fullscreen", fs);
                }
            }
            let (Ok(cur), Ok(pos), Ok(scale)) = (app.cursor_position(), win.inner_position(), win.scale_factor()) else {
                continue;
            };
            let (x, y) = ((cur.x - pos.x as f64) / scale, (cur.y - pos.y as f64) / scale);
            let inside = shared.hit_rects.lock().unwrap().iter().any(|r| x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
            if inside == ignoring {
                ignoring = !inside;
                let _ = win.set_ignore_cursor_events(ignoring);
            }
            if tick % 2 == 0 && ((x - last.0).abs() > 1.0 || (y - last.1).abs() > 1.0) {
                last = (x, y);
                let _ = win.emit("cursor", (x, y));
            }
        }
    });
}

// ---------- errands from the Explorer right-click menu ----------

/// "请X删除": who should go, which files, and where the file is on the page (CSS px).
#[derive(Serialize, Clone)]
struct Errand {
    who: String,
    paths: Vec<PathBuf>,
    target: Option<(f64, f64)>,
}

#[derive(Default)]
struct Errands {
    pending: Mutex<Vec<(String, PathBuf)>>,
    queued: Mutex<Vec<Errand>>, // errands that arrived before the page finished loading
    ready: AtomicBool,
}

/// Screen point (physical px) → page coordinates of the overlay window.
fn to_page(win: &WebviewWindow, x: f64, y: f64) -> Option<(f64, f64)> {
    let (pos, scale) = (win.inner_position().ok()?, win.scale_factor().ok()?);
    Some(((x - pos.x as f64) / scale, (y - pos.y as f64) / scale))
}

/// Handles `--eat <yier|bubu|both> <path>...`, from a fresh launch or forwarded by a second instance.
/// Explorer starts one process per selected item, so requests are gathered for a moment into one errand.
fn handle_args(app: &AppHandle, args: &[String]) {
    let Some(i) = args.iter().position(|a| a == "--eat") else { return };
    let (Some(who), Some(paths)) = (args.get(i + 1), args.get(i + 2..)) else { return };
    if paths.is_empty() {
        return;
    }
    let errands = app.state::<Errands>();
    let mut pending = errands.pending.lock().unwrap();
    let first = pending.is_empty();
    pending.extend(paths.iter().map(|p| (who.clone(), PathBuf::from(p))));
    if !first {
        return;
    }
    let (app, probe) = (app.clone(), PathBuf::from(&paths[0]));
    thread::spawn(move || {
        // look now, while Explorer still has the file focused; fall back to where the cursor is
        let screen = explorer::focused_item(&probe)
            .map(|(l, t, r, b)| ((l + r) as f64 / 2.0, (t + b) as f64 / 2.0))
            .or_else(|| app.cursor_position().ok().map(|c| (c.x, c.y)));
        let Some(win) = app.get_webview_window("main") else { return };
        let target = screen.and_then(|(x, y)| to_page(&win, x, y));
        thread::sleep(Duration::from_millis(400));
        let mut groups: Vec<Errand> = Vec::new();
        for (who, path) in std::mem::take(&mut *app.state::<Errands>().pending.lock().unwrap()) {
            match groups.iter_mut().find(|g| g.who == who) {
                Some(g) => g.paths.push(path),
                None => groups.push(Errand { who, paths: vec![path], target }),
            }
        }
        set_visible(&app, true);
        let errands = app.state::<Errands>();
        let mut queued = errands.queued.lock().unwrap();
        if errands.ready.load(Ordering::SeqCst) {
            for g in groups {
                let _ = app.emit("errand", g);
            }
        } else {
            queued.extend(groups);
        }
    });
}

/// Called by the page once the bears exist; delivers errands that arrived during start-up.
#[tauri::command]
fn pet_ready(app: AppHandle, errands: State<Errands>) {
    let mut queued = errands.queued.lock().unwrap();
    errands.ready.store(true, Ordering::SeqCst);
    for g in queued.drain(..) {
        let _ = app.emit("errand", g);
    }
}

// ---------- menus: the bear's right click is about the characters, the tray about the app ----------

struct Menus {
    pet: Menu<Wry>,
    tray: Menu<Wry>,
    checks: Vec<CheckMenuItem<Wry>>, // every check item; the same id can appear in both menus
    toggle: MenuItem<Wry>,
}

impl Menus {
    fn set_checked(&self, id: &str, on: bool) {
        for c in self.checks.iter().filter(|c| c.id() == id) {
            let _ = c.set_checked(on);
        }
    }
}

fn build_menus(app: &AppHandle) -> tauri::Result<Menus> {
    let item = |id: &str, text: &str| MenuItem::with_id(app, id, text, true, None::<&str>);
    let sep = || PredefinedMenuItem::separator(app);
    let sub = |text: &str, items: &[&dyn IsMenuItem<Wry>]| Submenu::with_items(app, text, true, items);
    let mut checks = Vec::new();
    let mut check = |id: &str, text: &str, on: bool| -> tauri::Result<CheckMenuItem<Wry>> {
        let c = CheckMenuItem::with_id(app, id, text, true, on, None::<&str>)?;
        checks.push(c.clone());
        Ok(c)
    };
    let autostart_on = app.autolaunch().is_enabled().unwrap_or(false);
    // 设置 appears in both menus (as separate items kept in sync)
    let mut settings = || -> tauri::Result<Submenu<Wry>> {
        let size = sub("大小", &[&item("size:130", "小")?, &item("size:180", "中")?, &item("size:240", "大")?])?;
        sub(
            "设置",
            &[
                &check("on_top", "置顶", true)?,
                &check("autoplay", "自己玩", true)?,
                &check("autostart", "开机自启", autostart_on)?,
                &check("explorer_menu", "文件右键菜单", true)?,
                &sep()?,
                &size,
            ],
        )
    };
    let pet_settings = settings()?;
    let tray_settings = settings()?;
    let bin = || sub("回收站", &[&item("open_trash", "打开")?, &item("empty_trash", "清空…")?]);

    let pet = Menu::with_items(
        app,
        &[
            &sub("互动", &[&item("act:hug", "抱抱")?, &item("act:wave", "挥手")?, &item("act:dance", "跳舞")?, &item("act:shy", "害羞")?, &item("act:rose", "送花")?])?,
            &sub("动作", &[&item("act:think", "思考")?, &item("act:sleep", "睡觉")?, &item("act:noodle", "吃面")?, &item("act:boba", "奶茶")?])?,
            &sub("装扮", &[&check("outfit:glasses", "墨镜", false)?, &check("outfit:scarf", "围巾", false)?])?,
            &sub("投喂", &[&item("diary", "今日食谱")?, &item("undo", "吐出来")?])?,
            &bin()?,
            &sep()?,
            &pet_settings,
            &item("about", "关于")?,
        ],
    )?;
    let toggle = item("toggle", "隐藏")?;
    let tray = Menu::with_items(
        app,
        &[
            &toggle,
            &sub("角色", &[&item("show:both", "一二和布布")?, &item("show:yier", "只有一二")?, &item("show:bubu", "只有布布")?])?,
            &tray_settings,
            &bin()?,
            &sep()?,
            &item("about", "关于")?,
            &item("quit", "退出")?,
        ],
    )?;
    Ok(Menus { pet, tray, checks, toggle })
}

fn set_visible(app: &AppHandle, show: bool) {
    let (Some(win), menus) = (app.get_webview_window("main"), app.state::<Menus>()) else { return };
    let _ = if show { win.show() } else { win.hide() };
    let _ = menus.toggle.set_text(if show { "隐藏" } else { "显示" });
}

fn toggle_window(app: &AppHandle) {
    let visible = app.get_webview_window("main").and_then(|w| w.is_visible().ok()).unwrap_or(true);
    set_visible(app, !visible);
}

fn on_menu(app: &AppHandle, event: MenuEvent) {
    let id = event.id().as_ref();
    let notice = |msg: String| {
        let _ = app.emit("notice", msg);
    };
    match id {
        "quit" => app.exit(0),
        "toggle" => toggle_window(app),
        "open_trash" => platform::open_trash(),
        "autostart" => {
            let launcher = app.autolaunch();
            let on = !launcher.is_enabled().unwrap_or(false);
            let _ = if on { launcher.enable() } else { launcher.disable() };
            app.state::<Menus>().set_checked(id, on);
        }
        "undo" => {
            let last = app.state::<feed::LastMeal>();
            let meal = last.0.lock().unwrap().clone();
            if meal.is_empty() {
                return notice("还没吃过东西呢".into());
            }
            match feed::spit_out(&meal) {
                Ok(n) => {
                    last.0.lock().unwrap().clear();
                    notice(format!("呸！吐出来了 {n} 个"));
                }
                Err(e) => notice(format!("吐不出来…\n{e}")),
            }
        }
        "empty_trash" => match feed::trash_len() {
            Ok(0) => notice("回收站已经是空的啦".into()),
            Ok(n) => {
                let _ = app.emit("ask_empty", n);
            }
            Err(e) => notice(e),
        },
        // everything else is about the bears or their settings, which the page owns
        _ => {
            let _ = app.emit("menu", id);
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    show: Vec<String>,
    glasses: bool,
    scarf: bool,
    autoplay: bool,
    on_top: bool,
    explorer_menu: bool,
}

/// The page owns the saved settings; it reports them on load and after every change.
#[tauri::command]
fn sync_menu(settings: Settings, menus: State<Menus>, shared: State<Shared>, win: WebviewWindow) {
    shared.on_top.store(settings.on_top, Ordering::SeqCst);
    apply_on_top(&win, &shared);
    for (id, on) in [
        ("outfit:glasses", settings.glasses),
        ("outfit:scarf", settings.scarf),
        ("on_top", settings.on_top),
        ("autoplay", settings.autoplay),
        ("explorer_menu", settings.explorer_menu),
    ] {
        menus.set_checked(id, on);
    }
    // Explorer entries follow who is shown: both → all three, one → just that one
    let who: Vec<&str> = match (settings.explorer_menu, settings.show.len()) {
        (false, _) => vec![],
        (true, 2) => vec!["yier", "bubu", "both"],
        _ => settings.show.iter().map(String::as_str).collect(),
    };
    if let Err(e) = explorer::set_menu(&who) {
        eprintln!("could not update the Explorer menu: {e}");
    }
}

#[tauri::command]
fn show_menu(win: WebviewWindow, menus: State<Menus>) {
    let _ = win.popup_menu(&menus.pet);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| handle_args(app, &argv)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .manage(Shared { hit_rects: Mutex::default(), on_top: AtomicBool::new(true), fullscreen: AtomicBool::new(false) })
        .manage(Errands::default())
        .manage(feed::LastMeal::default())
        .on_menu_event(on_menu)
        .invoke_handler(tauri::generate_handler![
            set_hit_rects,
            feed::check_meal,
            feed::eat_files,
            feed::empty_trash,
            sync_menu,
            show_menu,
            pet_ready
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            app.manage(build_menus(&handle)?);
            let win = app.get_webview_window("main").expect("main window");
            // cover the work area of the primary monitor (the bears walk along its bottom edge = the taskbar top)
            if let Some(monitor) = win.primary_monitor()? {
                let area = monitor.work_area();
                win.set_position(area.position)?;
                win.set_size(area.size)?;
            }
            win.set_ignore_cursor_events(true)?;
            TrayIconBuilder::with_id("tray")
                .icon(app.default_window_icon().cloned().expect("app icon"))
                .tooltip("YierBubu-Pet")
                .menu(&app.state::<Menus>().tray)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        toggle_window(tray.app_handle());
                    }
                })
                .build(app)?;
            watch(handle.clone(), win);
            handle_args(&handle, &std::env::args().collect::<Vec<_>>());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the desktop pet");
}
