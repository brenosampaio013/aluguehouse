"use client";

import { useEffect, useRef, useState } from "react";

import { PauseIcon, PlayIcon } from "@/components/ui/icons";
import { HERO_VIDEO_NARROW, pickHeroVideo, type HeroVideo } from "@/lib/home/hero-photo";

/*
 * Movimento do fundo do topo (vídeo do mar ou ondas desenhadas).
 * O botão marca a seção com data-movimento="pausado" (o CSS congela as
 * animações) e avisa o vídeo pelo evento abaixo. Com "reduzir movimento" no
 * sistema nada se move e o botão nem aparece.
 */
const EVENT = "movimento-inicio";
const STORAGE_KEY = "inicio-movimento";

function readPaused() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "pausado";
  } catch {
    return false;
  }
}

function applyPaused(section: HTMLElement | null, paused: boolean) {
  if (!section) return;
  if (paused) section.dataset.movimento = "pausado";
  else delete section.dataset.movimento;
  section.dispatchEvent(new Event(EVENT));
}

/** Pausar/retomar o movimento do fundo (WCAG 2.2.2). */
export function HeroMotionToggle() {
  const ref = useRef<HTMLButtonElement>(null);
  // null até montar: sem JavaScript o botão não faria nada, então não aparece.
  const [paused, setPaused] = useState<boolean | null>(null);

  useEffect(() => {
    const initial = readPaused();
    applyPaused(ref.current?.closest("section") ?? null, initial);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência salva só existe no navegador
    setPaused(initial);
  }, []);

  function toggle() {
    const next = !paused;
    setPaused(next);
    applyPaused(ref.current?.closest("section") ?? null, next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, "pausado");
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sem armazenamento a escolha vale só para esta visita.
    }
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={toggle}
      hidden={paused === null}
      aria-label={paused ? "Retomar o movimento do mar" : "Pausar o movimento do mar"}
      title={paused ? "Retomar o movimento do mar" : "Pausar o movimento do mar"}
      className="sobre-escuro grid size-11 place-items-center rounded-full border border-marfim/35 bg-abismo/45 text-marfim backdrop-blur-sm transition-colors duration-200 hover:bg-abismo/70 motion-reduce:hidden"
    >
      {paused ? <PlayIcon width={18} height={18} /> : <PauseIcon width={18} height={18} />}
    </button>
  );
}

type Connection = { saveData?: boolean; effectiveType?: string };

/**
 * Vídeo do mar por cima da foto de capa. Só começa a baixar depois que a
 * página terminou de carregar, e não baixa com "reduzir movimento", economia
 * de dados ou conexão 2G. Aparece com um esmaecer quando de fato começa a
 * tocar; se falhar, a foto continua lá. Pausa fora da tela e em outra aba.
 */
export function HeroBackgroundVideo({ video, position }: { video: HeroVideo; position?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const section = el.closest("section");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    if (reduce.matches || connection?.saveData || /2g/.test(connection?.effectiveType ?? "")) {
      return;
    }
    const src = pickHeroVideo(video, {
      narrow: window.matchMedia(`(max-width: ${HERO_VIDEO_NARROW}px)`).matches,
      canPlay: (type) => el.canPlayType(type) !== "",
    });
    if (!src) return;

    let started = false;
    let visible = true;
    const update = () => {
      if (!started) return;
      const play =
        visible && !document.hidden && !reduce.matches && section?.dataset.movimento !== "pausado";
      if (play) el.play().catch(() => {});
      else el.pause();
    };
    const start = () => {
      started = true;
      el.muted = true;
      el.src = src;
      update();
    };

    // Depois do carregamento e de um respiro: não disputa banda com a página.
    let timer: number | undefined;
    const schedule = () => {
      timer = window.setTimeout(start, 300);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", update);
    reduce.addEventListener("change", update);
    section?.addEventListener(EVENT, update);

    return () => {
      window.removeEventListener("load", schedule);
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      reduce.removeEventListener("change", update);
      section?.removeEventListener(EVENT, update);
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [video]);

  return (
    <video
      ref={ref}
      aria-hidden="true"
      tabIndex={-1}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      disableRemotePlayback
      onPlaying={() => setPlaying(true)}
      data-tocando={playing || undefined}
      className="absolute inset-0 -z-20 size-full object-cover opacity-0 transition-opacity duration-[1500ms] data-tocando:opacity-100 motion-reduce:hidden"
      style={position ? { objectPosition: position } : undefined}
    />
  );
}
