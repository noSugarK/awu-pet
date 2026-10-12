//! 文件投喂: what the bears may eat, moving it to the OS recycle bin (never a permanent delete),
//! spitting the last meal back out, and emptying the recycle bin after the user confirmed.
use serde::Serialize;
use std::{
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, State};

/// The last meal, so "吐出来" can restore it.
#[derive(Default)]
pub struct LastMeal(pub Mutex<Vec<PathBuf>>);

fn last_meal_file(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join("last-meal.json"))
}

pub fn load_last(app: &AppHandle) -> Vec<PathBuf> {
    last_meal_file(app)
        .and_then(|path| std::fs::read(path).ok())
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

pub fn clear_last(app: &AppHandle) {
    if let Some(path) = last_meal_file(app) {
        let _ = std::fs::remove_file(path);
    }
}

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

pub fn home() -> Option<PathBuf> {
    std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")).and_then(|h| PathBuf::from(h).canonicalize().ok())
}

fn edible(path: &Path, protected: &[PathBuf], home: Option<&Path>) -> bool {
    let Ok(p) = path.canonicalize() else { return false };
    p.parent().is_some() && home != Some(p.as_path()) && !protected.iter().any(|d| p.starts_with(d))
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

const BIG_MEAL: u64 = 500 * 1024 * 1024;

/// One edible thing; the page picks the bears' reaction from its extension / folder-ness / size.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    path: PathBuf,
    is_dir: bool,
    bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Meal {
    items: Vec<Item>,
    blocked: Vec<PathBuf>,
    has_dirs: bool,
    needs_confirm: bool,
}

#[tauri::command]
pub fn check_meal(paths: Vec<PathBuf>) -> Meal {
    let (prot, home) = (protected(), home());
    let (allowed, blocked): (Vec<_>, Vec<_>) = paths.into_iter().partition(|p| edible(p, &prot, home.as_deref()));
    let items: Vec<Item> = allowed.into_iter().map(|p| Item { is_dir: p.is_dir(), bytes: size_upto(&p, BIG_MEAL), path: p }).collect();
    let has_dirs = items.iter().any(|i| i.is_dir);
    // Ask for a large file/folder, a large total, or a batch with many items.
    let needs_confirm = items.len() > 20 || items.iter().any(|i| i.bytes >= BIG_MEAL)
        || items.iter().map(|i| i.bytes).sum::<u64>() >= BIG_MEAL;
    Meal { items, blocked, has_dirs, needs_confirm }
}

#[tauri::command]
pub fn eat_files(paths: Vec<PathBuf>, app: AppHandle, last: State<LastMeal>) -> Result<usize, String> {
    let (prot, home) = (protected(), home());
    // checked again here: never trust the page
    let food: Vec<PathBuf> = paths.into_iter().filter(|p| edible(p, &prot, home.as_deref())).collect();
    if food.is_empty() {
        return Ok(0);
    }
    trash::delete_all(&food).map_err(|e| e.to_string())?;
    log_meal(&app, &food);
    *last.0.lock().unwrap() = food.clone();
    if let Some(path) = last_meal_file(&app) {
        if let Some(dir) = path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        if let Ok(bytes) = serde_json::to_vec(&food) {
            if std::fs::write(&path, bytes).is_err() { clear_last(&app); }
        }
    }
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

/// Restores the last meal from the recycle bin.
#[cfg(not(target_os = "macos"))]
pub fn spit_out(paths: &[PathBuf]) -> Result<usize, String> {
    use std::collections::HashMap;
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
pub fn spit_out(_: &[PathBuf]) -> Result<usize, String> {
    Err("macOS 不支持在程序里还原，请在废纸篓里「放回原处」".into())
}

#[cfg(not(target_os = "macos"))]
pub fn trash_len() -> Result<usize, String> {
    trash::os_limited::list().map(|l| l.len()).map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
pub fn trash_len() -> Result<usize, String> {
    Err("macOS 请在废纸篓里清空".into())
}

/// Permanently empties the OS recycle bin. Only called after the user confirmed in the pet's bubble.
#[tauri::command]
pub fn empty_trash() -> Result<usize, String> {
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
