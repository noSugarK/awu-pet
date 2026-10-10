//! Windows Explorer integration: the "请X删除" right-click entries (per-user registry, no admin)
//! and finding where the chosen file sits on screen so the pets can run to it.
use serde::Deserialize;
use std::path::Path;

/// One "请X删除" entry: `who` is a character id or `all`; the page decides which exist (who is shown).
#[derive(Deserialize)]
#[cfg_attr(not(windows), allow(dead_code))]
pub struct Verb {
    id: String,
    label: String,
}

/// Registry keys are `<PREFIX>.<who>`; keys under older prefixes are removed so no stale entries remain.
#[cfg(windows)]
const PREFIX: &str = "Awu-Pet";
#[cfg(windows)]
const ALL_PREFIXES: [&str; 3] = ["Awu-Pet.", "YierBubu-Pet.", "YierBubu."];

/// Registers `verbs` on files and folders, removing every other entry of ours.
/// Explorer then runs `Awu-Pet.exe --eat <who> "<path>"` (once per selected item).
#[cfg(windows)]
pub fn set_menu(verbs: &[Verb]) -> std::io::Result<()> {
    use winreg::{
        enums::{HKEY_CURRENT_USER, KEY_READ},
        RegKey,
    };
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let exe = std::env::current_exe()?.display().to_string();
    for base in [r"Software\Classes\*\shell", r"Software\Classes\Directory\shell"] {
        if let Ok(shell) = hkcu.open_subkey_with_flags(base, KEY_READ) {
            let ours: Vec<String> = shell.enum_keys().flatten().filter(|k| ALL_PREFIXES.iter().any(|p| k.starts_with(p))).collect();
            for key in ours {
                let _ = hkcu.delete_subkey_all(format!(r"{base}\{key}"));
            }
        }
        for Verb { id, label } in verbs {
            // ids go into a registry path and a command line: plain ids only
            if id.is_empty() || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
                continue;
            }
            let (verb, _) = hkcu.create_subkey(format!(r"{base}\{PREFIX}.{id}"))?;
            verb.set_value("", label)?;
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
pub fn set_menu(_: &[Verb]) -> std::io::Result<()> {
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
