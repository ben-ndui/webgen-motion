/**
 * Root template — re-mounts on every navigation (unlike layout), so its
 * entrance animation plays on each route change. Opacity-only fade
 * (`.route-fade`) : no transform/filter, which would create a containing
 * block and break the fixed navs (landing, hub). Honors reduced-motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-fade">{children}</div>;
}
