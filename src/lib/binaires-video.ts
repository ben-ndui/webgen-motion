/**
 * Les chemins de ffmpeg et ffprobe, pour tout le code serveur.
 *
 * L'app de bureau embarque les siens et donne leurs chemins par
 * WEBGEN_FFMPEG_BIN / WEBGEN_FFPROBE_BIN (src-tauri/src/lib.rs). Lancer
 * ffmpeg par son seul nom le cherche dans le PATH : lancée depuis le Finder,
 * l'app n'y a pas Homebrew, et le dépôt d'une musique échouait avec « ce
 * fichier ne se lit pas comme de l'audio » (16/10/2026). En dev, la
 * variable est absente et on retombe sur le ffmpeg du système.
 *
 * Lu à chaque appel : l'environnement est celui du processus au moment
 * où l'on s'en sert.
 */
export function ffmpeg(): string {
  return process.env.WEBGEN_FFMPEG_BIN || "ffmpeg";
}

export function ffprobe(): string {
  return process.env.WEBGEN_FFPROBE_BIN || "ffprobe";
}
