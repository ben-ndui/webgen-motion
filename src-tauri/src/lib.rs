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
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

/// Port where the embedded Next.js server listens. Has to match
/// the URL passed in `tauri.conf.json` window config.
const SERVER_PORT: u16 = 3030;
/// Max time we wait for the server to start before giving up
/// and showing the window anyway (the user sees an error from
/// the WebView in that case — better than a blank window forever).
const SERVER_BOOT_TIMEOUT_SECS: u64 = 30;

/// Holds the child handle so we can `kill()` it on app exit and
/// avoid orphan Node processes after the user quits.
struct SidecarState(Mutex<Option<CommandChild>>);

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
                if let Some(child) = guard.take() {
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

    eprintln!("[webgen-motion] spawning Node sidecar : {server_js:?}");

    // `tauri-plugin-shell` runs through the configured permission
    // capability — see capabilities/default.json `shell:default`.
    // Using `command("node")` calls the system Node for now ;
    // stage 3 swaps this for a bundled `binaries/node-<triple>`.
    let (mut rx, child) = app
        .shell()
        .command("node")
        .args([server_js.to_string_lossy().to_string()])
        .env("PORT", SERVER_PORT.to_string())
        .env("HOSTNAME", "127.0.0.1")
        .current_dir(standalone_dir)
        .spawn()
        .map_err(|e| format!("spawn node : {e}"))?;

    // Stash the child handle so the close handler can kill it.
    let state = app.state::<SidecarState>();
    *state.0.lock().unwrap() = Some(child);

    // Forward Node's stdout/stderr to the Tauri shell stderr so
    // we have a chance to read crashes when launched from .app.
    tauri::async_runtime::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) | CommandEvent::Stderr(line) => {
                    let s = String::from_utf8_lossy(&line);
                    eprintln!("[next] {s}");
                }
                CommandEvent::Terminated(payload) => {
                    eprintln!("[next] terminated : code={:?}", payload.code);
                }
                _ => {}
            }
        }
    });

    // Block (with timeout) until the server actually listens.
    wait_for_port(SERVER_PORT, SERVER_BOOT_TIMEOUT_SECS);
    Ok(())
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
