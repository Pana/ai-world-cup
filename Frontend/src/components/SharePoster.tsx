"use client";

import { Download } from "lucide-react";

export function SharePoster({ name, advisor, points }: {
  name: string;
  advisor: string;
  points: number;
}) {
  function download() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(0,224,255,.22)";
    ctx.lineWidth = 2;
    for (let x = 0; x < canvas.width; x += 72) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 72) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.fillStyle = "#00e0ff";
    ctx.font = "700 40px system-ui";
    ctx.fillText("AI WORLD CUP 2026", 80, 110);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 92px system-ui";
    ctx.fillText(name, 80, 310);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 38px system-ui";
    ctx.fillText("TRUSTS", 80, 405);
    ctx.fillStyle = "#39ff14";
    ctx.font = "900 78px system-ui";
    ctx.fillText(advisor, 80, 520);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 260px system-ui";
    ctx.fillText(String(points), 80, 900);
    ctx.fillStyle = "#ffd24a";
    ctx.font = "700 44px system-ui";
    ctx.fillText("FAN PREDICTION POINTS", 88, 975);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 30px system-ui";
    ctx.fillText("Same matches. Same rules. Human instinct.", 80, 1190);
    const link = document.createElement("a");
    link.download = "ai-world-cup-poster.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <button onClick={download} className="flex items-center gap-2 border border-electric px-4 py-2 text-sm font-bold text-electric hover:bg-electric hover:text-night">
      <Download size={16} />
      Download poster
    </button>
  );
}
