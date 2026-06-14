"use client";
import { useState } from "react";

function flagFile(name?: string | null): string | null {
  if (!name) return null;
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/\s+/g, "-");
}

export function TeamFlag({ name, code, size = 28 }: { name?: string | null; code?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  const file = flagFile(name);
  if (!file || broken) {
    return (
      <span className="inline-flex items-center justify-center rounded bg-white/10 px-1 text-xs"
        style={{ minWidth: size, height: size * 0.7 }}>
        {code ?? "??"}
      </span>
    );
  }
  return (
    <img src={`/flags/${file}.svg`} alt={name ?? "flag"} height={size * 0.7}
      className="rounded-sm" onError={() => setBroken(true)} />
  );
}
