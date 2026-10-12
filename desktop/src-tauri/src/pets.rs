//! Codex / Petdex pet packages: a folder with `pet.json` and a sprite sheet (8 × 9 cells of 192 × 208).
//! They live in our own pets folder (`<app data>/pets`) and in Codex's (`~/.codex/pets`, where
//! `npx petdex install <name>` puts them). A folder holding one package is a solo cast; a folder holding
//! two package folders (e.g. littlegqqq/Yier-Bubu's `pets/`) is a pair, named after that folder.
//! The installer also ships a set of them (desktop/src-tauri/pets, a bundle resource; fetched with
//! desktop/scripts/install-pets.mjs --out), looked at last: a package the user has with the same name wins.
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Manifest {
    id: Option<String>,
    display_name: Option<String>,
    spritesheet_path: Option<String>,
    credit: Option<String>, // written by desktop/scripts/install-pets.mjs: who owns the character, who drew the frames
    awu: Option<serde_json::Value>, // also written by it: action names, rows for states, swapped running rows
}

#[derive(Serialize)]
pub struct Member {
    name: String,
    sheet: PathBuf,
    credit: Option<String>,
    awu: Option<serde_json::Value>,
}

#[derive(Serialize)]
pub struct Pack {
    key: String,
    name: String,
    members: Vec<Member>,
}

#[derive(Deserialize)]
pub struct DownloadMember {
    manifest: Vec<u8>,
    sheet: Vec<u8>,
}

fn download_dirs(id: &str) -> Option<(&'static str, &'static [&'static str])> {
    match id {
        "dogs" => Some(("小白和小金毛", &["1-小白", "2-小金毛"])),
        "lulu" => Some(("噜噜和噜妹", &["1-噜噜", "2-噜妹"])),
        "dragon" => Some(("奶龙", &[""])),
        "frog" => Some(("奶蛙", &[""])),
        _ => None,
    }
}

fn valid_download(m: &DownloadMember) -> bool {
    m.manifest.len() <= 64 * 1024 && m.sheet.len() <= 10 * 1024 * 1024
        && m.sheet.starts_with(b"RIFF") && m.sheet.get(8..12) == Some(b"WEBP")
        && serde_json::from_slice::<Manifest>(&m.manifest).is_ok_and(|p| p.spritesheet_path.as_deref() == Some("spritesheet.webp"))
}

/// Install only named packs from the built-in catalogue; bytes are downloaded by the page.
#[tauri::command]
pub fn install_pet_pack(app: AppHandle, id: String, members: Vec<DownloadMember>) -> Result<(), String> {
    let (name, dirs) = download_dirs(&id).ok_or("未知宠物包")?;
    if members.len() != dirs.len() { return Err("宠物包文件不完整".into()); }
    if !members.iter().all(valid_download) { return Err("宠物包格式不正确或文件过大".into()); }
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?.join("pets");
    std::fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let target = root.join(name);
    if target.exists() { return Err("已安装这个宠物包；请先在宠物包文件夹中管理它".into()); }
    let staging = root.join(format!(".{id}-download-{}", std::process::id()));
    std::fs::create_dir(&staging).map_err(|e| e.to_string())?;
    let result = (|| -> std::io::Result<()> {
        for (m, dir) in members.iter().zip(dirs) {
            let folder = staging.join(dir);
            std::fs::create_dir_all(&folder)?;
            std::fs::write(folder.join("pet.json"), &m.manifest)?;
            std::fs::write(folder.join("spritesheet.webp"), &m.sheet)?;
        }
        std::fs::rename(&staging, target)
    })();
    if result.is_err() { let _ = std::fs::remove_dir_all(staging); }
    result.map_err(|e| e.to_string())
}

/// Where packages are looked for; the first one is ours (created on demand).
fn roots(app: &AppHandle) -> Vec<PathBuf> {
    let mut roots = vec![];
    if let Ok(dir) = app.path().app_data_dir() {
        roots.push(dir.join("pets"));
    }
    if let Some(home) = crate::feed::home() {
        roots.push(home.join(".codex").join("pets"));
    }
    if let Ok(dir) = app.path().resource_dir() {
        roots.push(dir.join("pets"));
    }
    roots
}

fn subdirs(dir: &Path) -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = std::fs::read_dir(dir)
        .map(|it| it.flatten().map(|e| e.path()).filter(|p| p.is_dir()).collect())
        .unwrap_or_default();
    dirs.sort();
    dirs
}

fn member(dir: &Path) -> Option<Member> {
    let m: Manifest = serde_json::from_slice(&std::fs::read(dir.join("pet.json")).ok()?).ok()?;
    let sheet = dir.join(m.spritesheet_path.as_deref().unwrap_or("spritesheet.webp"));
    let fallback = dir.file_name()?.to_string_lossy().into_owned();
    sheet.is_file().then(|| Member { name: m.display_name.or(m.id).unwrap_or(fallback), sheet, credit: m.credit, awu: m.awu })
}

#[tauri::command]
pub fn list_pets(app: AppHandle) -> Vec<Pack> {
    let mut packs = vec![];
    for (i, root) in roots(&app).iter().enumerate() {
        for dir in subdirs(root) {
            let folder = dir.file_name().unwrap_or_default().to_string_lossy().into_owned();
            // one package: named after the pet; a pair: named after the folder holding both
            let (members, name) = match member(&dir) {
                Some(one) => {
                    let name = one.name.clone();
                    (vec![one], name)
                }
                None => (subdirs(&dir).iter().filter_map(|d| member(d)).take(2).collect(), folder.clone()),
            };
            if members.is_empty() || packs.iter().any(|p: &Pack| p.name == name) {
                continue;
            }
            let key = format!("{i}/{folder}");
            packs.push(Pack { key, name, members });
        }
    }
    packs
}

/// The bytes of a sprite sheet — only images inside one of the pets folders.
#[tauri::command]
pub fn read_pet_sheet(app: AppHandle, path: PathBuf) -> Result<tauri::ipc::Response, String> {
    let real = path.canonicalize().map_err(|e| e.to_string())?;
    let image = matches!(real.extension().and_then(|e| e.to_str()).map(str::to_ascii_lowercase).as_deref(), Some("webp" | "png"));
    let inside = roots(&app).iter().filter_map(|r| r.canonicalize().ok()).any(|r| real.starts_with(r));
    if !image || !inside {
        return Err("不是宠物包里的图片".into());
    }
    std::fs::read(&real).map(tauri::ipc::Response::new).map_err(|e| e.to_string())
}

/// Opens our pets folder so pet packages can be dropped in.
pub fn open_folder(app: &AppHandle) {
    if let Some(dir) = roots(app).into_iter().next() {
        let _ = std::fs::create_dir_all(&dir);
        crate::platform::open_dir(&dir);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalogue_accepts_only_named_webp_members() {
        assert!(download_dirs("dogs").is_some());
        assert!(download_dirs("../dogs").is_none());
        let mut m = DownloadMember { manifest: br#"{"spritesheetPath":"spritesheet.webp"}"#.to_vec(), sheet: b"RIFF1234WEBP".to_vec() };
        assert!(valid_download(&m));
        m.manifest = br#"{"spritesheetPath":"../outside.webp"}"#.to_vec();
        assert!(!valid_download(&m));
    }
}
