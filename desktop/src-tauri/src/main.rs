// YierBubu-Pet (一二布布桌宠) · Designed by 黄小B · Powered by noSugarK
//
// One transparent, always-on-top window covers the work area; the bears are drawn by the shared
// web engine in docs/. Rust makes the window click-through except over the bears, feeds the page the
// global cursor + OS idle time, owns the tray / right-click menu, and moves eaten files to the OS trash.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod explorer;

use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    io::Write,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
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

#[derive(Default)]
struct Shared {
    hit_rects: Mutex<Vec<Rect>>,
    last_meal: Mutex<Vec<PathBuf>>,
}

struct Menus {
    menu: Menu<Wry>,
    checks: HashMap<&'static str, CheckMenuItem<Wry>>,
    toggle: MenuItem<Wry>,
}

// ---------- click-through, cursor, idle ----------

#[tauri::command]
fn set_hit_rects(rects: Vec<Rect>, shared: State<Shared>) {
    *shared.hit_rects.lock().unwrap() = rects;
}

/// Polls the global cursor: the window only takes the mouse while it is over a bear,
/// so the rest of the desktop stays usable. Also streams cursor + idle time to the page.
fn watch_cursor(app: AppHandle, win: WebviewWindow) {
    thread::spawn(move || {
        let mut ignoring = true;
        let mut last = (f64::NAN, f64::NAN);
        for tick in 0u64.. {
            thread::sleep(Duration::from_millis(16));
            let (Ok(cur), Ok(pos), Ok(scale)) = (app.cursor_position(), win.inner_position(), win.scale_factor()) else {
                continue;
            };
            let (x, y) = ((cur.x - pos.x as f64) / scale, (cur.y - pos.y as f64) / scale);
            let inside = app
                .state::<Shared>()
                .hit_rects
                .lock()
                .unwrap()
                .iter()
                .any(|r| x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
            if inside == ignoring {
                ignoring = !inside;
                let _ = win.set_ignore_cursor_events(ignoring);
            }
            if tick % 2 == 0 && ((x - last.0).abs() > 1.0 || (y - last.1).abs() > 1.0) {
                last = (x, y);
                let _ = win.emit("cursor", (x, y));
            }
            if tick % 60 == 0 {
                if let Ok(idle) = user_idle::UserIdle::get_time() {
                    let _ = win.emit("idle", idle.as_seconds());
                }
            }
        }
    });
}

// ---------- feeding: files go to the OS recycle bin, never deleted permanently ----------

/// Directories and files a bear refuses to eat: drive roots, the home folder itself,
/// OS / program folders and the app's own folder.
fn protected() -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = ["SystemRoot", "ProgramFiles", "ProgramFiles(x86)", "ProgramW6432", "ProgramData"]
        .iter()
        .filter_map(std::env::var_os)
        .map(PathBuf::from)
        .collect();
    dirs.extend(["/bin", "/sbin", "/usr", "/etc", "/lib", "/boot", "/System", "/Library", "/Applications"].map(PathBuf::from));
    if let Some(dir) = std::env::current_exe().ok().and_then(|e| e.parent().map(Path::to_path_buf)) {
        dirs.push(dir);
    }
    dirs.into_iter().filter_map(|d| d.canonicalize().ok()).collect()
}

fn edible(path: &Path, protected: &[PathBuf], home: Option<&Path>) -> bool {
    let Ok(p) = path.canonicalize() else { return false };
    p.parent().is_some() && home != Some(p.as_path()) && !protected.iter().any(|d| p.starts_with(d))
}

fn home() -> Option<PathBuf> {
    std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")).and_then(|h| PathBuf::from(h).canonicalize().ok())
}

/// Size of a file or folder, giving up once it passes `limit` (we only need "is it huge?").
fn size_upto(path: &Path, limit: u64) -> u64 {
    let Ok(meta) = path.symlink_metadata() else { return 0 };
    if !meta.is_dir() {
        return meta.len();
    }
    let mut total = 0;
    for entry in std::fs::read_dir(path).into_iter().flatten().flatten() {
        total += size_upto(&entry.path(), limit - total.min(limit));
        if total > limit {
            break;
        }
    }
    total
}

const BIG_MEAL: u64 = 1 << 30;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Meal {
    allowed: Vec<PathBuf>,
    blocked: Vec<PathBuf>,
    has_dirs: bool,
    needs_confirm: bool,
}

#[tauri::command]
fn check_meal(paths: Vec<PathBuf>) -> Meal {
    let (prot, home) = (protected(), home());
    let (allowed, blocked): (Vec<_>, Vec<_>) = paths.into_iter().partition(|p| edible(p, &prot, home.as_deref()));
    let has_dirs = allowed.iter().any(|p| p.is_dir());
    let bytes: u64 = allowed.iter().map(|p| size_upto(p, BIG_MEAL)).sum();
    // very large items may not fit in the recycle bin, so ask first
    let needs_confirm = allowed.len() > 20 || bytes > BIG_MEAL;
    Meal { allowed, blocked, has_dirs, needs_confirm }
}

#[tauri::command]
fn eat_files(paths: Vec<PathBuf>, app: AppHandle, shared: State<Shared>) -> Result<usize, String> {
    let (prot, home) = (protected(), home());
    let food: Vec<PathBuf> = paths.into_iter().filter(|p| edible(p, &prot, home.as_deref())).collect();
    if food.is_empty() {
        return Ok(0);
    }
    trash::delete_all(&food).map_err(|e| e.to_string())?;
    log_meal(&app, &food);
    *shared.last_meal.lock().unwrap() = food.clone();
    Ok(food.len())
}

/// Appends what was eaten to <app data>/meals.log so every meal can be traced later.
fn log_meal(app: &AppHandle, food: &[PathBuf]) {
    let Ok(dir) = app.path().app_data_dir() else { return };
    let _ = std::fs::create_dir_all(&dir);
    let Ok(mut log) = std::fs::OpenOptions::new().create(true).append(true).open(dir.join("meals.log")) else { return };
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_secs());
    for p in food {
        let _ = writeln!(log, "{now}\t{}", p.display());
    }
}

#[cfg(not(target_os = "macos"))]
fn spit_out(paths: &[PathBuf]) -> Result<usize, String> {
    use trash::os_limited::{list, restore_all};
    // most recently trashed item for each path we ate last time
    let mut picked: HashMap<PathBuf, trash::TrashItem> = HashMap::new();
    for item in list().map_err(|e| e.to_string())? {
        let orig = item.original_path();
        if paths.contains(&orig) && picked.get(&orig).is_none_or(|p| p.time_deleted < item.time_deleted) {
            picked.insert(orig, item);
        }
    }
    let n = picked.len();
    restore_all(picked.into_values()).map_err(|e| e.to_string())?;
    Ok(n)
}

#[cfg(target_os = "macos")]
fn spit_out(_: &[PathBuf]) -> Result<usize, String> {
    Err("macOS 不支持在程序里还原，请在废纸篓里「放回原处」".into())
}

#[cfg(not(target_os = "macos"))]
fn trash_len() -> Result<usize, String> {
    trash::os_limited::list().map(|l| l.len()).map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
fn trash_len() -> Result<usize, String> {
    Err("macOS 请在废纸篓里清空".into())
}

/// Permanently empties the OS recycle bin. Only called after the user confirmed in the pet's bubble.
#[tauri::command]
fn empty_trash() -> Result<usize, String> {
    #[cfg(not(target_os = "macos"))]
    {
        let items = trash::os_limited::list().map_err(|e| e.to_string())?;
        let n = items.len();
        trash::os_limited::purge_all(items).map_err(|e| e.to_string())?;
        Ok(n)
    }
    #[cfg(target_os = "macos")]
    trash_len()
}

fn open_trash() {
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("explorer").arg("shell:RecycleBinFolder").spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(home().unwrap_or_default().join(".Trash")).spawn();
    #[cfg(all(unix, not(target_os = "macos")))]
    let _ = std::process::Command::new("xdg-open").arg("trash:///").spawn();
}

// ---------- errands from the Explorer right-click menu ----------

/// "请X帮你删除文件": who should go, which files, and where the file is on the page (CSS px).
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

// ---------- menu (tray + right click on a bear) ----------

const ACTIONS: [(&str, &str); 9] = [
    ("think", "💭 思考"),
    ("dance", "🎵 跳舞"),
    ("shy", "😊 害羞"),
    ("sleep", "💤 睡觉"),
    ("noodle", "🍜 吃面"),
    ("boba", "🧋 奶茶"),
    ("rose", "🌹 送花"),
    ("wave", "👋 挥手"),
    ("hug", "🤗 抱抱"),
];

fn build_menu(app: &AppHandle) -> tauri::Result<Menus> {
    let item = |id: &str, text: &str| MenuItem::with_id(app, id, text, true, None::<&str>);
    let check = |id: &str, text: &str, on: bool| CheckMenuItem::with_id(app, id, text, true, on, None::<&str>);
    let sub = |text: &str, items: &[MenuItem<Wry>]| {
        Submenu::with_items(app, text, true, &items.iter().map(|i| i as &dyn IsMenuItem<Wry>).collect::<Vec<_>>())
    };

    let actions = sub("动作", &ACTIONS.iter().map(|(id, t)| item(&format!("act:{id}"), t)).collect::<Result<Vec<_>, _>>()?)?;
    let show = sub("显示", &[item("show:both", "一二和布布")?, item("show:yier", "只有一二")?, item("show:bubu", "只有布布")?])?;
    let size = sub("大小", &[item("size:130", "小")?, item("size:180", "中")?, item("size:240", "大")?])?;
    let glasses = check("outfit:glasses", "🕶️ 墨镜", false)?;
    let scarf = check("outfit:scarf", "🧣 围巾", false)?;
    let outfits = Submenu::with_items(app, "搭配", true, &[&glasses, &scarf])?;
    let autoplay = check("autoplay", "没人理时自己玩", true)?;
    let autostart = check("autostart", "开机自启", app.autolaunch().is_enabled().unwrap_or(false))?;
    let explorer_menu = check("explorer_menu", "资源管理器右键菜单「请一二/布布帮你删除文件」", true)?;
    let toggle = item("toggle", "隐藏到托盘")?;
    let sep = || PredefinedMenuItem::separator(app);

    let menu = Menu::with_items(
        app,
        &[
            &actions,
            &show,
            &size,
            &outfits,
            &autoplay,
            &autostart,
            &explorer_menu,
            &sep()?,
            &item("undo", "吐出来（撤销上一次投喂）")?,
            &item("open_trash", "打开回收站")?,
            &item("empty_trash", "清空回收站…")?,
            &sep()?,
            &toggle,
            &item("about", "关于")?,
            &item("quit", "退出")?,
        ],
    )?;
    let checks = HashMap::from([("outfit:glasses", glasses), ("outfit:scarf", scarf), ("autoplay", autoplay), ("autostart", autostart), ("explorer_menu", explorer_menu)]);
    Ok(Menus { menu, checks, toggle })
}

fn set_visible(app: &AppHandle, show: bool) {
    let (Some(win), menus) = (app.get_webview_window("main"), app.state::<Menus>()) else { return };
    let _ = if show { win.show() } else { win.hide() };
    let _ = menus.toggle.set_text(if show { "隐藏到托盘" } else { "显示桌宠" });
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
        "open_trash" => open_trash(),
        "autostart" => {
            let launcher = app.autolaunch();
            let on = !launcher.is_enabled().unwrap_or(false);
            let _ = if on { launcher.enable() } else { launcher.disable() };
        }
        "undo" => {
            let shared = app.state::<Shared>();
            let meal = shared.last_meal.lock().unwrap().clone();
            if meal.is_empty() {
                return notice("还没吃过东西呢".into());
            }
            match spit_out(&meal) {
                Ok(n) => {
                    shared.last_meal.lock().unwrap().clear();
                    notice(format!("呸！吐出来了 {n} 个"));
                }
                Err(e) => notice(format!("吐不出来…\n{e}")),
            }
        }
        "empty_trash" => match trash_len() {
            Ok(0) => notice("回收站已经是空的啦".into()),
            Ok(n) => {
                let _ = app.emit("ask_empty", n);
            }
            Err(e) => notice(e),
        },
        _ => {
            let checked = app.state::<Menus>().checks.get(id).and_then(|c| c.is_checked().ok());
            let _ = app.emit("menu", (id, checked));
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
    explorer_menu: bool,
}

/// The page owns the saved settings; it reports them on load so the check marks match.
#[tauri::command]
fn sync_menu(settings: Settings, menus: State<Menus>) {
    for (id, on) in [
        ("outfit:glasses", settings.glasses),
        ("outfit:scarf", settings.scarf),
        ("autoplay", settings.autoplay),
        ("explorer_menu", settings.explorer_menu),
    ] {
        let _ = menus.checks[id].set_checked(on);
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
    let _ = win.popup_menu(&menus.menu);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| handle_args(app, &argv)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .manage(Shared::default())
        .manage(Errands::default())
        .on_menu_event(on_menu)
        .invoke_handler(tauri::generate_handler![set_hit_rects, check_meal, eat_files, empty_trash, sync_menu, show_menu, pet_ready])
        .setup(|app| {
            let handle = app.handle().clone();
            app.manage(build_menu(&handle)?);
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
                .tooltip("YierBubu-Pet · Designed by 黄小B · Powered by noSugarK")
                .menu(&app.state::<Menus>().menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        toggle_window(tray.app_handle());
                    }
                })
                .build(app)?;
            watch_cursor(handle.clone(), win);
            handle_args(&handle, &std::env::args().collect::<Vec<_>>());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the desktop pet");
}
