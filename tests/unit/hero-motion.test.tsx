import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeroBackgroundVideo, HeroMotionToggle } from "@/components/home/hero-motion";
import type { HeroVideo } from "@/lib/home/hero-photo";

const video: HeroVideo = { basePath: "/inicio/mar", widths: [960, 1920], formats: ["webm", "mp4"] };

let reduceMotion = false;
let narrow = false;
let observerCallback: IntersectionObserverCallback = () => {};
const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();

function setup() {
  return render(
    <section data-testid="topo">
      <HeroBackgroundVideo video={video} />
      <HeroMotionToggle />
    </section>,
  );
}

const videoEl = () => document.querySelector("video")!;

beforeEach(() => {
  vi.useFakeTimers();
  reduceMotion = false;
  narrow = false;
  play.mockClear();
  pause.mockClear();
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("reduced-motion") ? reduceMotion : narrow,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockImplementation((type) =>
    type.startsWith("video/webm") ? "probably" : "",
  );
});

afterEach(() => {
  // Desmonta antes de devolver os métodos de mídia (o jsdom não os implementa).
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "connection");
});

describe("vídeo do mar no topo", () => {
  it("só baixa depois da página carregada e toca sem som, em loop", () => {
    setup();
    expect(videoEl()).not.toHaveAttribute("src");
    expect(videoEl()).toHaveAttribute("preload", "none");
    expect(videoEl()).toHaveAttribute("aria-hidden", "true");
    act(() => vi.advanceTimersByTime(300));
    expect(videoEl().getAttribute("src")).toBe("/inicio/mar-1920.webm");
    expect(videoEl().muted).toBe(true);
    expect(videoEl().loop).toBe(true);
    expect(play).toHaveBeenCalled();
  });

  it("usa o arquivo menor no celular", () => {
    narrow = true;
    setup();
    act(() => vi.advanceTimersByTime(300));
    expect(videoEl().getAttribute("src")).toBe("/inicio/mar-960.webm");
  });

  it("aparece só quando começa a tocar (até lá, fica a foto)", () => {
    setup();
    act(() => vi.advanceTimersByTime(300));
    expect(videoEl()).not.toHaveAttribute("data-tocando");
    fireEvent.playing(videoEl());
    expect(videoEl()).toHaveAttribute("data-tocando", "true");
  });

  it("não baixa nada com reduzir movimento ou economia de dados", () => {
    reduceMotion = true;
    const { unmount } = setup();
    act(() => vi.advanceTimersByTime(1000));
    expect(videoEl()).not.toHaveAttribute("src");
    unmount();

    reduceMotion = false;
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true },
      configurable: true,
    });
    setup();
    act(() => vi.advanceTimersByTime(1000));
    expect(videoEl()).not.toHaveAttribute("src");
    expect(play).not.toHaveBeenCalled();
  });

  it("pausa fora da tela e volta a tocar quando reaparece", () => {
    setup();
    act(() => vi.advanceTimersByTime(300));
    act(() =>
      observerCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(pause).toHaveBeenCalled();
    play.mockClear();
    act(() =>
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(play).toHaveBeenCalled();
  });
});

describe("botão de pausar o movimento", () => {
  it("pausa e retoma o vídeo e as ondas, e lembra a escolha", () => {
    setup();
    act(() => vi.advanceTimersByTime(300));
    const topo = screen.getByTestId("topo");

    fireEvent.click(screen.getByRole("button", { name: "Pausar o movimento do mar" }));
    expect(topo).toHaveAttribute("data-movimento", "pausado");
    expect(pause).toHaveBeenCalled();
    expect(localStorage.getItem("inicio-movimento")).toBe("pausado");

    play.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Retomar o movimento do mar" }));
    expect(topo).not.toHaveAttribute("data-movimento");
    expect(play).toHaveBeenCalled();
    expect(localStorage.getItem("inicio-movimento")).toBeNull();
  });

  it("volta pausado se o visitante pausou antes", () => {
    localStorage.setItem("inicio-movimento", "pausado");
    setup();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId("topo")).toHaveAttribute("data-movimento", "pausado");
    expect(screen.getByRole("button", { name: "Retomar o movimento do mar" })).toBeVisible();
    expect(play).not.toHaveBeenCalled();
  });
});
