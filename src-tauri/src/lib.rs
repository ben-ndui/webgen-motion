/// webgen-motion Tauri shell.
///
/// Architecture en deux modes :
///
/// **Dev** (`npm run tauri:dev`) : Tauri's `beforeDevCommand` lance
/// `PORT=3030 npm run dev` en parallèle, et la fenêtre pointe sur
/// `http://localhost:3030`. Pas de sidecar Rust ici — on laisse
/// Next dev faire son job HMR.
///
/// **Release** (`npm run tauri:build` → .dmg / .exe / .AppImage) :
/// le shell Rust spawn lui-même un serveur Node (à terme bundlé
/// via le sidecar binary mécanisme de Tauri) qui charge le bundle
/// Next.js standalone (`.next/standalone/server.js`). On attend que
/// le port 3030 réponde avant de naviguer la fenêtre, sinon on
/// voit un écran blanc le temps que Node boote.
///
/// Le child Node est tué automatiquement quand l'app se ferme.
use std::net::TcpStream;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Manager;

/// Port where the embedded Next.js server listens. Has to match
/// the URL passed in `tauri.conf.json` window config.
const SERVER_PORT: u16 = 3030;
/// Max time we wait for the server to start before giving up
/// and showing the window anyway (the user sees an error from
/// the WebView in that case — better than a blank window forever).
const SERVER_BOOT_TIMEOUT_SECS: u64 = 30;

/// Holds the child handle so we can `kill()` it on app exit and
/// avoid orphan Node processes after the user quits.
struct SidecarState(Mutex<Option<std::process::Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarState(Mutex::new(None)))
        .setup(|app| {
            // Dev mode already has `beforeDevCommand` running the
            // Next.js dev server externally — skip the sidecar.
            #[cfg(not(debug_assertions))]
            {
                spawn_next_sidecar(app.handle())?;
            }
            // In dev we just trust the externally-managed server.
            #[cfg(debug_assertions)]
            {
                eprintln!(
                    "[webgen-motion] dev mode — relying on `npm run dev` (port {})",
                    SERVER_PORT
                );
            }
            Ok(())
        })
        // On window close, kill the sidecar so we don't leak
        // a stray Node process on the user's machine.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state = window.state::<SidecarState>();
                let mut guard = state.0.lock().unwrap();
                if let Some(mut child) = guard.take() {
                    let _ = child.kill();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running webgen-motion tauri app");
}

/// Production mode only. Spawns the bundled Next.js standalone
/// server as a child process, then blocks until its TCP port is
/// reachable (so the WebView doesn't paint a blank white page
/// while Node is still booting).
#[cfg(not(debug_assertions))]
fn spawn_next_sidecar(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use std::io::{BufRead, BufReader};
    use std::process::{Command, Stdio};
    use tauri::path::BaseDirectory;

    // Resolve `<bundle>/Resources/standalone/server.js` cross-platform.
    // The standalone build is copied there by the bundler at build time.
    let server_js = app
        .path()
        .resolve("standalone/server.js", BaseDirectory::Resource)
        .map_err(|e| format!("resolve server.js: {e}"))?;
    let standalone_dir = server_js
        .parent()
        .ok_or("standalone parent missing")?
        .to_path_buf();

    // Resolve the runners directory (scripts/ + node_modules for
    // Puppeteer / Remotion / etc.). API routes use this path via
    // the `WEBGEN_RUNNERS_DIR` env var to locate which command to
    // spawn (see src/lib/runner-spawn.ts).
    let runners_dir = app
        .path()
        .resolve("runners", BaseDirectory::Resource)
        .map_err(|e| format!("resolve runners dir: {e}"))?;

    // Bundled ffmpeg + ffprobe sidecars — exposed via env to the
    // routes so audio-tour / capture-tour / compose-tour / analyze-audio
    // use the bundled binaries instead of falling back to a system
    // install that doesn't exist on a vanilla user's machine.
    let ffmpeg_path = sidecar_binary_path(app, "ffmpeg")?;
    let ffprobe_path = sidecar_binary_path(app, "ffprobe")?;
    // adb bundlé (Android) — exposé aux runners via WEBGEN_ADB_BIN pour
    // que la capture Android marche sans Android platform-tools installé.
    let adb_path = sidecar_binary_path(app, "adb")?;

    // Token de session aléatoire (par lancement) partagé avec le
    // serveur Next via env. La garde server-side `/api/motion/**`
    // l'exige (cf. src/lib/server/desktop-guard.ts) ; le webview le
    // renvoie via le header x-webgen-desktop-token (desktop-token-bridge).
    let desktop_token = uuid::Uuid::new_v4().to_string();

    eprintln!("[webgen-motion] spawning Node sidecar : {server_js:?}");
    eprintln!("[webgen-motion] runners dir : {runners_dir:?}");
    eprintln!("[webgen-motion] ffmpeg path : {ffmpeg_path:?}");
    eprintln!("[webgen-motion] ffprobe path : {ffprobe_path:?}");

    // Node tourne dans un bundle « agent » (LSUIElement) embarqué en
    // resource — cf. scripts/desktop-prepare-node-helper.mjs. On le
    // lance par son chemin pour que macOS l'associe à CE bundle (et non
    // à l'app GUI principale) → pas de tuile Dock / d'entrée Cmd-Tab
    // « node » parasite. On passe par std::process plutôt que le plugin
    // shell : aucun scope/capability à gérer, et on tue proprement le
    // child à la fermeture de la fenêtre.
    let node_exe = app
        .path()
        .resolve(
            "node-helper/WebgenMotionNode.app/Contents/MacOS/node",
            BaseDirectory::Resource,
        )
        .map_err(|e| format!("resolve node helper : {e}"))?;

    let mut child = Command::new(&node_exe)
        .arg(&server_js)
        .env("PORT", SERVER_PORT.to_string())
        .env("HOSTNAME", "127.0.0.1")
        .env("WEBGEN_RUNNERS_DIR", runners_dir.to_string_lossy().to_string())
        .env("WEBGEN_FFMPEG_BIN", ffmpeg_path.to_string_lossy().to_string())
        .env("WEBGEN_FFPROBE_BIN", ffprobe_path.to_string_lossy().to_string())
        .env("WEBGEN_ADB_BIN", adb_path.to_string_lossy().to_string())
        .env("WEBGEN_DESKTOP_TOKEN", desktop_token)
        .current_dir(&standalone_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn node : {e}"))?;

    // Forward Node's stdout/stderr so a crash leaves a trace when
    // launched from the .app. Each pipe on its own thread (std pipes
    // block on read).
    if let Some(out) = child.stdout.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(out).lines().map_while(Result::ok) {
                eprintln!("[next] {line}");
            }
        });
    }
    if let Some(err) = child.stderr.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(err).lines().map_while(Result::ok) {
                eprintln!("[next] {line}");
            }
        });
    }

    // Stash the child handle so the close handler can kill it.
    let state = app.state::<SidecarState>();
    *state.0.lock().unwrap() = Some(child);

    // Block (with timeout) until the server actually listens.
    wait_for_port(SERVER_PORT, SERVER_BOOT_TIMEOUT_SECS);
    Ok(())
}

/// Resolves the absolute path to a Tauri-bundled sidecar binary
/// (e.g. `ffmpeg`). Tauri strips the platform-triple suffix at
/// bundling time and drops the binary next to the main executable
/// — `Contents/MacOS/<name>` on macOS, `<install>/<name>.exe` on
/// Windows, etc. So we resolve from `current_exe().parent()` with
/// the bare name (no triple).
#[cfg(not(debug_assertions))]
fn sidecar_binary_path(
    _app: &tauri::AppHandle,
    name: &str,
) -> Result<std::path::PathBuf, String> {
    let exe = std::env::current_exe()
        .map_err(|e| format!("current_exe : {e}"))?;
    let exe_dir = exe
        .parent()
        .ok_or_else(|| "current_exe has no parent".to_string())?;
    let file_name = if cfg!(target_os = "windows") {
        format!("{name}.exe")
    } else {
        name.to_string()
    };
    Ok(exe_dir.join(file_name))
}

/// Polls `127.0.0.1:<port>` every 150ms until the connect succeeds
/// or the timeout elapses. Silent on failure — caller's responsibility
/// to surface a visual error.
fn wait_for_port(port: u16, timeout_secs: u64) {
    let deadline = Instant::now() + Duration::from_secs(timeout_secs);
    let target = format!("127.0.0.1:{port}");
    while Instant::now() < deadline {
        if TcpStream::connect(&target).is_ok() {
            eprintln!("[webgen-motion] server ready on {target}");
            return;
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    eprintln!(
        "[webgen-motion] WARN: server didn't come up after {timeout_secs}s — opening window anyway"
    );
}
