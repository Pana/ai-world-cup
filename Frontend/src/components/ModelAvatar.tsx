"use client";
import { useState } from "react";
import Image from "next/image";

export function ModelAvatar({ slug, name, size = 40 }: { slug: string; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-white/10 text-xs font-bold"
        style={{ width: size, height: size }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image
      src={`/models/${slug}.svg`}
      alt={name}
      width={size}
      height={size}
      className="rounded-full bg-white/5"
      unoptimized
      onError={() => setBroken(true)}
    />
  );
}
