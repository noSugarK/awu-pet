//! OS-specific bits that aren't about feeding: spotting a fullscreen app, opening the recycle bin.

/// Is the foreground window a fullscreen app (game, video) covering its whole monitor, taskbar included?
/// `own` is our overlay window, which never counts.
#[cfg(windows)]
pub fn fullscreen_app(own: isize) -> bool {
    use std::ffi::c_void;
    #[repr(C)]
    #[derive(Default)]
    struct Rect {
        l: i32,
        t: i32,
        r: i32,
        b: i32,
    }
    #[repr(C)]
    #[derive(Default)]
    struct MonitorInfo {
        size: u32,
        monitor: Rect,
        work: Rect,
        flags: u32,
    }
    #[link(name = "user32")]
    extern "system" {
        fn GetForegroundWindow() -> *mut c_void;
        fn GetShellWindow() -> *mut c_void;
        fn GetWindowRect(hwnd: *mut c_void, rect: *mut Rect) -> i32;
        fn GetClassNameW(hwnd: *mut c_void, buf: *mut u16, len: i32) -> i32;
        fn MonitorFromWindow(hwnd: *mut c_void, flags: u32) -> *mut c_void;
        fn GetMonitorInfoW(monitor: *mut c_void, info: *mut MonitorInfo) -> i32;
        fn IsWindowVisible(hwnd: *mut c_void) -> i32;
    }
    #[link(name = "dwmapi")]
    extern "system" {
        fn DwmGetWindowAttribute(hwnd: *mut c_void, attr: u32, value: *mut c_void, size: u32) -> i32;
    }
    const DWMWA_CLOAKED: u32 = 14;
    const MONITOR_DEFAULTTONEAREST: u32 = 2;
    // SAFETY: plain Win32 queries on the current foreground window with correctly sized out-structs.
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() || hwnd as isize == own || hwnd == GetShellWindow() || IsWindowVisible(hwnd) == 0 {
            return false;
        }
        // invisible full-screen system hosts are "cloaked" by the compositor
        let mut cloaked = 0u32;
        let got = DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, (&mut cloaked as *mut u32).cast(), 4);
        if got == 0 && cloaked != 0 {
            return false;
        }
        let mut buf = [0u16; 64];
        let n = GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32).max(0) as usize;
        if matches!(String::from_utf16_lossy(&buf[..n]).as_str(), "Progman" | "WorkerW" | "Shell_TrayWnd") {
            return false; // the desktop / taskbar
        }
        let (mut win, mut info) = (Rect::default(), MonitorInfo { size: size_of::<MonitorInfo>() as u32, ..Default::default() });
        if GetWindowRect(hwnd, &mut win) == 0 || GetMonitorInfoW(MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST), &mut info) == 0 {
            return false;
        }
        let m = &info.monitor;
        let full = win.l <= m.l && win.t <= m.t && win.r >= m.r && win.b >= m.b;
        #[cfg(debug_assertions)]
        if full {
            eprintln!("fullscreen app: class={}", String::from_utf16_lossy(&buf[..n]));
        }
        full
    }
}

#[cfg(not(windows))]
pub fn fullscreen_app(_own: isize) -> bool {
    false
}

pub fn open_trash() {
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("explorer").arg("shell:RecycleBinFolder").spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(crate::feed::home().unwrap_or_default().join(".Trash")).spawn();
    #[cfg(all(unix, not(target_os = "macos")))]
    let _ = std::process::Command::new("xdg-open").arg("trash:///").spawn();
}
