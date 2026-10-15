/**
 * Funções de vídeo que só rodam no navegador do admin: leitura do arquivo
 * (duração, tamanho, miniatura) e envio com progresso.
 */

export type VideoInfo = {
  poster: Blob;
  width: number;
  height: number;
  /** null quando o arquivo não informa a duração. */
  duration: number | null;
};

const POSTER_MAX_WIDTH = 1280;

function once(target: EventTarget, event: string, timeoutMs = 20_000) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    const done = () => {
      clearTimeout(timer);
      target.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => {
      clearTimeout(timer);
      target.removeEventListener(event, done);
      reject(new Error("video_unreadable"));
    };
    target.addEventListener(event, done, { once: true });
    target.addEventListener("error", fail, { once: true });
  });
}

/**
 * Abre o vídeo sem som, lê as dimensões e a duração e captura um quadro
 * (perto de 1 s) como miniatura WebP. Falha se o navegador não conseguir
 * decodificar o vídeo — o mesmo problema que o visitante teria.
 */
export async function readVideoFile(file: File): Promise<VideoInfo> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    const loaded = once(video, "loadeddata");
    video.src = url;
    await loaded;
    if (!video.videoWidth || !video.videoHeight) throw new Error("video_unreadable");

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;
    const target = duration ? Math.min(1, duration / 4) : 0;
    if (target > 0) {
      const seeked = once(video, "seeked");
      video.currentTime = target;
      await seeked;
    }

    const scale = Math.min(1, POSTER_MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas_unavailable");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82),
    );
    if (!poster || poster.type !== "image/webp") throw new Error("webp_unsupported");

    return { poster, width: video.videoWidth, height: video.videoHeight, duration };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

/** Envia o arquivo para a URL assinada do Storage, informando o progresso (0–1). */
export function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  apiKey: string,
  onProgress: (fraction: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", signedUrl);
    request.setRequestHeader("apikey", apiKey);
    request.setRequestHeader("content-type", file.type);
    request.setRequestHeader("cache-control", "max-age=31536000");
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`upload_${request.status}`));
    request.onerror = () => reject(new Error("upload_network"));
    request.send(file);
  });
}
