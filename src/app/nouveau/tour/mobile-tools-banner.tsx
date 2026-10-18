import { AlertCircle, Check } from "lucide-react";

export interface MobileToolsStatus {
  platforms: { ios: boolean; android: boolean };
  maestro: { present: boolean };
  adb: { present: boolean };
  simctl: { present: boolean };
}

export default function MobileToolsBanner({
  platform,
  tools,
}: {
  platform: "ios" | "android";
  tools: MobileToolsStatus | null;
}) {
  if (!tools) {
    return <p className="text-[11px] text-faint">Détection des outils mobiles…</p>;
  }
  const ready = platform === "ios" ? tools.platforms.ios : tools.platforms.android;
  const missing: string[] = [];
  if (!tools.maestro.present) missing.push("Maestro");
  if (platform === "ios" && !tools.simctl.present) missing.push("Xcode/Simulateur");
  if (platform === "android" && !tools.adb.present) missing.push("adb");

  if (ready) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        <p className="text-xs text-emerald-900">Outils {platform} détectés.</p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-amber-900">
        Manquant : <strong>{missing.join(" · ")}</strong>.{" "}
        <a href="/help#mobile" className="underline">
          comment installer
        </a>
      </p>
    </div>
  );
}
