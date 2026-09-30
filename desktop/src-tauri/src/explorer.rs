//! Windows Explorer integration: the "请一二帮你删除文件" right-click entries (per-user registry, no admin)
//! and finding where the chosen file sits on screen so the bears can run to it.
use std::path::Path;

/// (registry key, menu text, who) — which ones are registered follows the pet's 显示 setting.
pub const VERBS: [(&str, &str, &str); 3] = [
    ("YierBubu.yier", "请一二帮你删除文件", "yier"),
    ("YierBubu.bubu", "请布布帮你删除文件", "bubu"),
    ("YierBubu.both", "请一二和布布帮你删除文件", "both"),
];

/// Registers the entries for `who` on files and folders, removing the others.
/// Explorer then runs `yierbubu.exe --eat <who> "<path>"` (once per selected item).
#[cfg(windows)]
pub fn set_menu(who: &[&str]) -> std::io::Result<()> {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let exe = std::env::current_exe()?.display().to_string();
    for base in [r"Software\Classes\*\shell", r"Software\Classes\Directory\shell"] {
        for (key, text, id) in VERBS {
            let path = format!(r"{base}\{key}");
            let _ = hkcu.delete_subkey_all(&path);
            if !who.contains(&id) {
                continue;
            }
            let (verb, _) = hkcu.create_subkey(&path)?;
            verb.set_value("", &text)?;
            verb.set_value("Icon", &exe)?;
            verb.set_value("MultiSelectModel", &"Player")?; // stay visible when many items are selected
            let (cmd, _) = verb.create_subkey("command")?;
            cmd.set_value("", &format!("\"{exe}\" --eat {id} \"%1\""))?;
        }
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn set_menu(_: &[&str]) -> std::io::Result<()> {
    Ok(())
}

/// Screen rectangle (physical px: left, top, right, bottom) of the item that has keyboard focus in
/// Explorer or on the desktop — right after choosing a context-menu entry that is the file itself.
/// Returns None if the focused element isn't that file.
#[cfg(windows)]
pub fn focused_item(path: &Path) -> Option<(i32, i32, i32, i32)> {
    let el = uiautomation::UIAutomation::new().ok()?.get_focused_element().ok()?;
    let name = el.get_name().ok()?;
    let shown_as = |s: Option<&std::ffi::OsStr>| s.is_some_and(|s| s.to_string_lossy() == name);
    if !shown_as(path.file_name()) && !shown_as(path.file_stem()) {
        return None; // extensions may be hidden in Explorer, so accept either
    }
    let r = el.get_bounding_rectangle().ok()?;
    (r.get_right() > r.get_left()).then(|| (r.get_left(), r.get_top(), r.get_right(), r.get_bottom()))
}

#[cfg(not(windows))]
pub fn focused_item(_: &Path) -> Option<(i32, i32, i32, i32)> {
    None
}
