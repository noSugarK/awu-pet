//! Windows Explorer integration: the "请一二删除" right-click entries (per-user registry, no admin)
//! and finding where the chosen file sits on screen so the bears can run to it.
use std::path::Path;

/// (registry key, menu text, who) — which ones are registered follows the pet's 显示 setting.
pub const VERBS: [(&str, &str, &str); 3] = [
    ("YierBubu-Pet.yier", "请一二删除", "yier"),
    ("YierBubu-Pet.bubu", "请布布删除", "bubu"),
    ("YierBubu-Pet.both", "请一二布布删除", "both"),
];
/// Keys written by builds from before the rename; removed so no stale entries remain.
const OLD_KEYS: [&str; 3] = ["YierBubu.yier", "YierBubu.bubu", "YierBubu.both"];

/// Registers the entries for `who` on files and folders, removing the others.
/// Explorer then runs `YierBubu-Pet.exe --eat <who> "<path>"` (once per selected item).
#[cfg(windows)]
pub fn set_menu(who: &[&str]) -> std::io::Result<()> {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let exe = std::env::current_exe()?.display().to_string();
    for base in [r"Software\Classes\*\shell", r"Software\Classes\Directory\shell"] {
        for key in OLD_KEYS {
            let _ = hkcu.delete_subkey_all(format!(r"{base}\{key}"));
        }
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
    notify_shell();
    Ok(())
}

/// Explorer caches context-menu verbs; tell it associations changed so new entries show up right away.
#[cfg(windows)]
fn notify_shell() {
    #[link(name = "shell32")]
    extern "system" {
        fn SHChangeNotify(event: i32, flags: u32, item1: *const std::ffi::c_void, item2: *const std::ffi::c_void);
    }
    const SHCNE_ASSOCCHANGED: i32 = 0x0800_0000;
    const SHCNF_IDLIST: u32 = 0;
    // SAFETY: documented usage; SHCNE_ASSOCCHANGED takes no items.
    unsafe { SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, std::ptr::null(), std::ptr::null()) };
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
