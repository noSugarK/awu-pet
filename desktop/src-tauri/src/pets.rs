//! Codex / Petdex pet packages: a folder with `pet.json` and a sprite sheet (8 × 9 cells of 192 × 208).
//! They live in our own pets folder (`<app data>/pets`) and in Codex's (`~/.codex/pets`, where
//! `npx petdex install <name>` puts them). A folder holding one package is a solo cast; a folder holding
//! two package folders (e.g. littlegqqq/Yier-Bubu's `pets/`) is a pair, named after that folder.
//! We never ship anyone's art: desktop/scripts/install-pets.mjs fetches packages into our folder.
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
}

#[derive(Serialize)]
pub struct Member {
    name: String,
    sheet: PathBuf,
    credit: Option<String>,
}

#[derive(Serialize)]
pub struct Pack {
    key: String,
    name: String,
    members: Vec<Member>,
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
    sheet.is_file().then(|| Member { name: m.display_name.or(m.id).unwrap_or(fallback), sheet, credit: m.credit })
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
            if members.is_empty() {
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
