"use client";

import { toPng, toSvg } from "html-to-image";

import { downloadFile } from "@/lib/utils";

export async function exportCanvasAsPng(node: HTMLElement, filename: string) {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#f8fafc",
  });

  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export async function exportCanvasAsSvg(node: HTMLElement, filename: string) {
  const dataUrl = await toSvg(node, {
    cacheBust: true,
    backgroundColor: "#f8fafc",
  });

  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export function exportJson(data: unknown, filename: string) {
  downloadFile(JSON.stringify(data, null, 2), filename, "application/json");
}
