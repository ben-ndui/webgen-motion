/**
 * Au démarrage du serveur Next. Dans l'app de bureau seulement (le jeton
 * de fenêtre n'existe que là), le serveur s'arrête si la coque qui l'a
 * lancé disparaît : sinon il restait orphelin sur son port.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.WEBGEN_DESKTOP_TOKEN) return;
  const { surveillerLeParent } = await import("./lib/server/surveiller-le-parent");
  surveillerLeParent({
    parentAuDepart: process.ppid,
    parentActuel: () => process.ppid,
    arreter: () => {
      console.error("[webgen-motion] l'application s'est fermée : arrêt du serveur");
      process.exit(0);
    },
  });
}
