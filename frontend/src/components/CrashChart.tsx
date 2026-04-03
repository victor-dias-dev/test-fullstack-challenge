import { useEffect, useRef } from "react";
import { useGameStore, GamePhase } from "../stores/gameStore";

const CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 60 };

function getMultiplierColor(multiplier: number, phase: GamePhase): string {
  if (phase === "CRASHED") return "#ff3366";
  if (multiplier >= 5) return "#00ff88";
  if (multiplier >= 2) return "#ffcc00";
  return "#6366f1";
}

export function CrashChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { phase, currentMultiplier, serverSeedHash } = useGameStore();
  const historyRef = useRef<number[]>([1.0]);

  useEffect(() => {
    if (phase === "BETTING" || phase === "WAITING") {
      historyRef.current = [1.0];
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "RUNNING" || phase === "CRASHED") {
      historyRef.current.push(currentMultiplier);
      if (historyRef.current.length > 500) historyRef.current.shift();
    }
  }, [currentMultiplier, phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const padT = CHART_PADDING.top;
    const padB = CHART_PADDING.bottom;
    const padL = CHART_PADDING.left;
    const padR = CHART_PADDING.right;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    const history = historyRef.current;
    const maxM = Math.max(...history, 2.0);

    // Grid lines
    ctx.strokeStyle = "#1e1e2e";
    ctx.lineWidth = 1;
    const gridMultipliers = [1, 1.5, 2, 3, 5, 10].filter((v) => v <= maxM + 0.5);
    for (const gm of gridMultipliers) {
      const y = padT + chartH - ((gm - 1) / (maxM - 1)) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();

      ctx.fillStyle = "#4a4a6a";
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText(`${gm.toFixed(2)}x`, 4, y + 4);
    }

    if (history.length < 2) {
      // Show waiting state
      drawMultiplierText(ctx, W, H, currentMultiplier, phase);
      return;
    }

    // Draw curve
    const color = getMultiplierColor(currentMultiplier, phase);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    history.forEach((m, i) => {
      const x = padL + (i / (history.length - 1)) * chartW;
      const y = padT + chartH - ((m - 1) / Math.max(maxM - 1, 0.001)) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill area under curve
    const lastX = padL + chartW;
    const lastM = history[history.length - 1];
    const lastY = padT + chartH - ((lastM - 1) / Math.max(maxM - 1, 0.001)) * chartH;

    ctx.lineTo(lastX, padT + chartH);
    ctx.lineTo(padL, padT + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    grad.addColorStop(0, `${color}33`);
    grad.addColorStop(1, `${color}00`);
    ctx.fillStyle = grad;
    ctx.fill();

    // Current dot
    ctx.beginPath();
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    drawMultiplierText(ctx, W, H, currentMultiplier, phase);
  });

  function drawMultiplierText(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    multiplier: number,
    phase: GamePhase,
  ) {
    ctx.textAlign = "center";
    const color = getMultiplierColor(multiplier, phase);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;

    if (phase === "BETTING") {
      ctx.font = "bold 36px Inter, sans-serif";
      ctx.fillText("PLACE YOUR BETS", W / 2, H / 2 - 16);
      ctx.font = "16px Inter, sans-serif";
      ctx.fillStyle = "#6366f1";
      ctx.shadowBlur = 0;
      if (serverSeedHash) {
        ctx.fillText(`Hash: ${serverSeedHash.slice(0, 16)}...`, W / 2, H / 2 + 16);
      }
    } else if (phase === "CRASHED") {
      ctx.font = "bold 56px Inter, sans-serif";
      ctx.fillText(`CRASHED @ ${multiplier.toFixed(2)}x`, W / 2, H / 2 + 20);
    } else if (phase === "RUNNING") {
      ctx.font = "bold 64px Inter, sans-serif";
      ctx.fillText(`${multiplier.toFixed(2)}x`, W / 2, H / 2 + 24);
    } else {
      ctx.font = "bold 28px Inter, sans-serif";
      ctx.fillText("Starting...", W / 2, H / 2);
    }

    ctx.textAlign = "left";
    ctx.shadowBlur = 0;
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={320}
      className="w-full rounded-xl border border-[#1e1e2e]"
      style={{ background: "#0a0a0f" }}
    />
  );
}
