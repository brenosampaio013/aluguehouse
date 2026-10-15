"use client";

import { useEffect } from "react";

/**
 * Revela os elementos `.revelar` uma única vez, quando entram na tela (a
 * animação é CSS, em globals.css). O que já está visível ao abrir a página
 * aparece pronto, sem animar. Com "reduzir movimento" ou sem suporte, não
 * faz nada e todo o conteúdo fica visível.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const root = document.documentElement;
    const elements = [...document.querySelectorAll<HTMLElement>(".revelar")];
    const pending = elements.filter((element) => {
      const { top, bottom } = element.getBoundingClientRect();
      const visible = top < window.innerHeight && bottom > 0;
      if (visible) element.classList.add("revelado");
      return !visible;
    });
    root.classList.add("revelar-ativo");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("revelado", "revelando");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    for (const element of pending) observer.observe(element);

    return () => {
      observer.disconnect();
      root.classList.remove("revelar-ativo");
      for (const element of elements) element.classList.add("revelado");
    };
  }, []);

  return null;
}
