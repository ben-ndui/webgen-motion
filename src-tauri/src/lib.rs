/// webgen-motion Tauri shell.
///
/// Stage 1 (this commit) : opens a native window pointing at the
/// Next.js dev server (http://localhost:3000 in dev, the standalone
/// build in release — see tauri.conf.json `app.windows[0].url`).
///
/// Stage 2 (next commit) : spawn `node .next/standalone/server.js`
/// as a sidecar so the bundled .dmg / .exe ships its own server
/// without needing `npm run dev` running externally.
///
/// Stage 3 : bundle ffmpeg + Chromium per-platform.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running webgen-motion tauri app");
}
