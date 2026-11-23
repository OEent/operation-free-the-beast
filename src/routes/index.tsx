import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IRONFANG: BEASTFIRE — Arcade Action" },
      { name: "description", content: "Play IRONFANG: BEASTFIRE, an original pixel-art arcade brawler with a fire-wolf transformation." },
      { property: "og:title", content: "IRONFANG: BEASTFIRE" },
      { property: "og:description", content: "Original pixel-art arcade brawler: melee, guns, beast form and an epic boss." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" }],
  }),
  component: Index,
});

function Index() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let eng: { destroy: () => void } | null = null;
    let dead = false;
    void Promise.all([import("@/game/engine"), import("@/game/storage")]).then(([m, s]) => {
      if (dead || !ref.current) return;
      const e = new m.Engine(ref.current, { standalone: true, settings: s.loadSettings() });
      e.start(); eng = e;
    });
    return () => { dead = true; eng?.destroy(); };
  }, []);
  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-background">
      <canvas ref={ref} tabIndex={0} aria-label="IRONFANG: BEASTFIRE game" style={{ imageRendering: "pixelated" }} />
    </main>
  );
}