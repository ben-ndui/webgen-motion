"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { isWebPublic } from "@/lib/consent";

interface Device {
  platform: "ios" | "android";
  id: string;
  name: string;
  kind: "device" | "simulator" | "emulator";
}

/**
 * Indicateur de device connecté, dans le header du hub. Poll
 * `/api/motion/mobile/devices` toutes les 5 s : l'utilisateur voit son
 * téléphone (ou simulateur booté) apparaître dès qu'il le branche. Masqué
 * quand rien n'est connecté, et inactif sur le web public.
 */
export default function DeviceIndicator() {
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    if (isWebPublic()) return; // jamais sur le site public
    let alive = true;
    const poll = () =>
      fetch("/api/motion/mobile/devices")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setDevices(d.devices ?? []))
        .catch(() => {});
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (devices.length === 0) return null;

  const label =
    devices.length === 1 ? devices[0].name : `${devices.length} devices`;
  const title = devices
    .map((d) => {
      const base = `${d.name} · ${d.platform} ${d.kind}`;
      return d.platform === "ios" && d.kind === "device"
        ? `${base} — pilotable (enregistrement iOS via simulateur)`
        : base;
    })
    .join("\n");

  return (
    <span
      data-wm-id="dashboard.device-indicator"
      title={title}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      <Smartphone className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
