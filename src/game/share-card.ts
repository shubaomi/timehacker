import type { Locale } from "@/i18n/config";

export interface ShareCardPayload {
  durationMs: number;
  errorMs: number;
  success: boolean;
  level: number;
  discoveredCheats: number;
  totalCheats: number;
  mode: "HACKER" | "PURE";
}

export const SHARE_CARD_DIMENSIONS = { width: 1080, height: 1350 } as const;

const CARD_COPY = {
  en: {
    brand: "TIME HACKER",
    successKicker: "TIME CONQUERED",
    missKicker: "TIME ALMOST CAUGHT",
    successTitle: "I made time stop.",
    missTitle: "One more try and time is mine.",
    target: "TARGET  10.00 s",
    error: "ERROR",
    level: "LEVEL",
    discovered: "SECRETS FOUND",
    hackerMode: "SECRET RUN",
    pureMode: "PURE RUN",
    challenge: "Can you stop time at 10.00 seconds?",
  },
  zh: {
    brand: "TIME HACKER  时间黑客",
    successKicker: "征服时间",
    missKicker: "差一点抓住时间",
    successTitle: "我让时间停下来了。",
    missTitle: "再来一次，时间就是我的。",
    target: "目标  10.00 秒",
    error: "误差",
    level: "等级",
    discovered: "已发现秘密",
    hackerMode: "秘密挑战",
    pureMode: "纯净挑战",
    challenge: "你能让时间停在 10.00 秒吗？",
  },
} as const;

function drawRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawClock(context: CanvasRenderingContext2D, x: number, y: number) {
  drawRoundRect(context, x, y, 82, 82, 24);
  context.fillStyle = "#ffd868";
  context.fill();

  context.strokeStyle = "#1f2747";
  context.lineWidth = 5;
  context.beginPath();
  context.arc(x + 41, y + 41, 23, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(x + 41, y + 26);
  context.lineTo(x + 41, y + 43);
  context.lineTo(x + 54, y + 43);
  context.stroke();
}

function drawMetric(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
) {
  drawRoundRect(context, x, y, width, 142, 30);
  context.fillStyle = "rgba(255, 255, 255, 0.72)";
  context.fill();
  context.strokeStyle = "rgba(71, 83, 125, 0.12)";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#6d789d";
  context.font = "700 23px system-ui, sans-serif";
  context.fillText(label, x + 30, y + 44);
  context.fillStyle = "#1f2747";
  context.font = "750 39px system-ui, sans-serif";
  context.fillText(value, x + 30, y + 101);
}

export function getShareCardUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://timehacker.hihongrun.com";
}

export async function renderShareCard(payload: ShareCardPayload, locale: Locale): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const { width, height } = SHARE_CARD_DIMENSIONS;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");

  const copy = CARD_COPY[locale];
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#e5f8ff");
  background.addColorStop(0.5, "#f8f5cc");
  background.addColorStop(1, "#dfe6ff");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(116, 219, 191, 0.5)";
  context.beginPath();
  context.arc(38, 382, 150, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255, 112, 96, 0.11)";
  context.beginPath();
  context.arc(1005, 145, 145, 0, Math.PI * 2);
  context.fill();

  drawRoundRect(context, 62, 62, 956, 1226, 58);
  context.fillStyle = "rgba(255, 255, 255, 0.82)";
  context.fill();
  context.strokeStyle = "rgba(255, 255, 255, 0.94)";
  context.lineWidth = 4;
  context.stroke();

  drawClock(context, 112, 112);
  context.fillStyle = "#1f2747";
  context.font = "800 31px ui-monospace, monospace";
  context.fillText(copy.brand, 222, 163);

  const kicker = payload.success ? copy.successKicker : copy.missKicker;
  context.fillStyle = payload.success ? "#278c72" : "#ef5f52";
  context.font = "800 24px system-ui, sans-serif";
  context.fillText(kicker, 112, 292);

  context.fillStyle = "#1f2747";
  context.font = locale === "zh"
    ? "800 62px system-ui, sans-serif"
    : "800 68px system-ui, sans-serif";
  context.fillText(payload.success ? copy.successTitle : copy.missTitle, 112, 380);

  context.fillStyle = "#6d789d";
  context.font = "700 25px system-ui, sans-serif";
  context.fillText(copy.target, 112, 455);

  context.fillStyle = "#1f2747";
  context.font = "800 190px system-ui, sans-serif";
  context.fillText((payload.durationMs / 1_000).toFixed(2), 104, 665);
  context.fillStyle = "#6d789d";
  context.font = "700 40px system-ui, sans-serif";
  context.fillText("s", 840, 656);

  const errorSign = payload.errorMs >= 0 ? "+" : "−";
  const error = `${errorSign}${(Math.abs(payload.errorMs) / 1_000).toFixed(3)}s`;
  drawRoundRect(context, 112, 720, 856, 94, 47);
  context.fillStyle = payload.success ? "#e3f8f1" : "#fff0ec";
  context.fill();
  context.fillStyle = payload.success ? "#278c72" : "#d94f45";
  context.font = "800 27px system-ui, sans-serif";
  context.fillText(`${copy.error}  ${error}`, 150, 780);
  context.textAlign = "right";
  context.fillText(payload.mode === "PURE" ? copy.pureMode : copy.hackerMode, 930, 780);
  context.textAlign = "left";

  drawMetric(context, 112, 866, 270, copy.level, String(payload.level));
  drawMetric(
    context,
    404,
    866,
    564,
    copy.discovered,
    `${payload.discoveredCheats} / ${payload.totalCheats}`,
  );

  context.fillStyle = "#1f2747";
  context.font = "800 35px system-ui, sans-serif";
  context.fillText(copy.challenge, 112, 1110);
  context.fillStyle = "#6d789d";
  context.font = "650 25px system-ui, sans-serif";
  context.fillText(getShareCardUrl().replace(/^https?:\/\//, ""), 112, 1163);

  context.fillStyle = "#ffd868";
  context.beginPath();
  context.arc(937, 1135, 29, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#78ddbf";
  context.beginPath();
  context.arc(866, 1198, 16, 0, Math.PI * 2);
  context.fill();

  return canvas;
}

export async function createShareCardDataUrl(payload: ShareCardPayload, locale: Locale): Promise<string> {
  return (await renderShareCard(payload, locale)).toDataURL("image/png", 0.96);
}

export async function createShareCardBlob(payload: ShareCardPayload, locale: Locale): Promise<Blob> {
  const canvas = await renderShareCard(payload, locale);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Share card export failed")),
      "image/png",
      0.96,
    );
  });
}

export function downloadShareCard(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
