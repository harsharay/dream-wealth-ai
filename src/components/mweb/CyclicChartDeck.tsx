import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode, type TransitionEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CyclicChartCard {
  id: string;
  title: string;
  caption: string;
  content: ReactNode;
}

interface CyclicChartDeckProps {
  cards: CyclicChartCard[];
  storageKey?: string;
}

const SWIPE_THRESHOLD = 56;
const EXIT_DISTANCE = 420;
const PEEK = 22;
const CARD_BORDER = "border border-neutral-200/80 dark:border-white/10";

function readStoredId(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredId(key: string, id: string) {
  try {
    sessionStorage.setItem(key, id);
  } catch {
    // Ignore quota / private mode.
  }
}

function rotateToFront(ids: string[], frontId: string | null): string[] {
  if (!frontId) return ids;
  const idx = ids.indexOf(frontId);
  if (idx <= 0) return ids;
  return [...ids.slice(idx), ...ids.slice(0, idx)];
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function CyclicChartDeck({
  cards,
  storageKey = "wealthpilot_mweb_chart_deck",
}: CyclicChartDeckProps) {
  const reduceMotion = usePrefersReducedMotion();
  const cardIds = useMemo(() => cards.map((card) => card.id), [cards]);
  const cardById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  const [queue, setQueue] = useState<string[]>(() => rotateToFront(cardIds, readStoredId(storageKey)));
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);

  const dxRef = useRef(0);
  const draggingRef = useRef(false);
  const exitingRef = useRef<"left" | "right" | null>(null);
  const cycleLockRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const frontCardRef = useRef<HTMLElement>(null);
  const [stageHeight, setStageHeight] = useState(320);

  useEffect(() => {
    setQueue((prev) => {
      const missing = cardIds.filter((id) => !prev.includes(id));
      const kept = prev.filter((id) => cardIds.includes(id));
      const merged = [...kept, ...missing];
      return merged.length ? merged : cardIds;
    });
  }, [cardIds]);

  const frontId = queue[0] ?? null;

  useEffect(() => {
    if (frontId) writeStoredId(storageKey, frontId);
  }, [frontId, storageKey]);

  useEffect(() => {
    const el = frontCardRef.current;
    if (!el) return;

    const syncHeight = () => {
      if (draggingRef.current || exitingRef.current) return;
      const next = Math.ceil(el.getBoundingClientRect().height) + PEEK;
      setStageHeight((prev) => (Math.abs(prev - next) < 2 ? prev : next));
    };

    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frontId, cards.length]);

  const cycle = useCallback((direction: "left" | "right") => {
    if (cycleLockRef.current) return;
    cycleLockRef.current = true;
    setQueue((prev) => {
      if (prev.length < 2) return prev;
      if (direction === "left") {
        return [...prev.slice(1), prev[0]];
      }
      return [prev[prev.length - 1], ...prev.slice(0, -1)];
    });
    dxRef.current = 0;
    draggingRef.current = false;
    exitingRef.current = null;
    setDx(0);
    setExiting(null);
    setDragging(false);
    requestAnimationFrame(() => {
      cycleLockRef.current = false;
    });
  }, []);

  const commitSwipe = useCallback((direction: "left" | "right") => {
    if (exitingRef.current || cycleLockRef.current || queue.length < 2) {
      dxRef.current = 0;
      setDx(0);
      return;
    }
    exitingRef.current = direction;
    const nextDx = direction === "left" ? -EXIT_DISTANCE : EXIT_DISTANCE;
    dxRef.current = nextDx;
    setExiting(direction);
    draggingRef.current = false;
    setDragging(false);
    setDx(nextDx);
  }, [queue.length]);

  const onTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.propertyName !== "transform") return;
      const direction = exitingRef.current;
      if (!direction) return;
      cycle(direction);
    },
    [cycle]
  );

  useEffect(() => {
    if (!exiting) return;
    const timeoutId = window.setTimeout(() => {
      if (exitingRef.current) cycle(exitingRef.current);
    }, 360);
    return () => window.clearTimeout(timeoutId);
  }, [cycle, exiting]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || reduceMotion || queue.length < 2) return;

    const ptr = {
      id: -1,
      startX: 0,
      startY: 0,
      axis: "undecided" as "undecided" | "x" | "y",
    };

    const onDown = (event: PointerEvent) => {
      if (exitingRef.current) return;
      ptr.id = event.pointerId;
      ptr.startX = event.clientX;
      ptr.startY = event.clientY;
      ptr.axis = "undecided";
    };

    const onMove = (event: PointerEvent) => {
      if (ptr.id !== event.pointerId || exitingRef.current) return;
      const moveX = event.clientX - ptr.startX;
      const moveY = event.clientY - ptr.startY;

      if (ptr.axis === "undecided") {
        if (Math.abs(moveX) < 10 && Math.abs(moveY) < 10) return;
        ptr.axis = Math.abs(moveX) > Math.abs(moveY) * 1.1 ? "x" : "y";
        if (ptr.axis === "x") {
          draggingRef.current = true;
          setDragging(true);
          try {
            el.setPointerCapture(event.pointerId);
          } catch {
            // Capture can fail if the pointer was already released.
          }
        }
      }

      if (ptr.axis !== "x") return;
      event.preventDefault();
      dxRef.current = moveX;
      setDx(moveX);
    };

    const onUp = (event: PointerEvent) => {
      if (ptr.id !== event.pointerId) return;
      const wasHorizontal = ptr.axis === "x";
      ptr.id = -1;
      ptr.axis = "undecided";
      if (!wasHorizontal) {
        draggingRef.current = false;
        setDragging(false);
        return;
      }
      if (Math.abs(dxRef.current) >= SWIPE_THRESHOLD) {
        commitSwipe(dxRef.current < 0 ? "left" : "right");
      } else {
        dxRef.current = 0;
        draggingRef.current = false;
        setDx(0);
        setDragging(false);
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove, { passive: false });
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [commitSwipe, queue.length, reduceMotion]);

  const goToIndex = (targetId: string) => {
    setQueue((prev) => rotateToFront(prev, targetId));
    dxRef.current = 0;
    exitingRef.current = null;
    setDx(0);
    setExiting(null);
  };

  const onNavClick = (direction: "left" | "right") => (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.blur();
    commitSwipe(direction);
  };

  if (cards.length === 0) return null;

  const frontIndex = frontId ? cardIds.indexOf(frontId) : 0;
  const revealPrevious = exiting === "right" || dx > 8;
  const peekId = revealPrevious ? queue[queue.length - 1] : queue[1];
  const stackIds = [queue[0], peekId].filter((id, index, ids) => Boolean(id) && ids.indexOf(id) === index);
  const visible = stackIds.map((id) => cardById.get(id)).filter(Boolean) as CyclicChartCard[];
  const navLocked = cards.length < 2 || Boolean(exiting);

  if (reduceMotion) {
    return (
      <section aria-label="Financial charts" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            Your numbers
          </p>
          <p className="text-[11px] font-semibold tabular-nums text-neutral-500">
            {cards.length} charts
          </p>
        </div>
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 no-scrollbar">
          {cards.map((card) => (
            <article
              key={card.id}
              className={cn("min-w-[85%] snap-center rounded-2xl bg-card p-4", CARD_BORDER)}
            >
              <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
              <p className="text-xs text-neutral-500 mt-0.5 mb-3">{card.caption}</p>
              <div className="mweb-chart-embed">{card.content}</div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Financial charts" className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          Your numbers
        </p>
        <p className="text-[11px] font-semibold tabular-nums text-neutral-500">
          {frontIndex + 1} / {cards.length} · swipe
        </p>
      </div>

      <div
        ref={stageRef}
        className="relative overflow-hidden touch-pan-y select-none transition-[height] duration-300 ease-out"
        style={{ height: stageHeight }}
        role="group"
        aria-roledescription="card deck"
        aria-label={`${visible[0]?.title ?? "Chart"}, ${frontIndex + 1} of ${cards.length}. Swipe left or right.`}
      >
        {visible.map((card, stackIndex) => {
          const isFront = stackIndex === 0;
          const peekScale = isFront ? 1 : 0.96;
          const peekY = isFront ? 0 : 10;
          const cardHeight = Math.max(0, stageHeight - PEEK);
          const transform = isFront
            ? `translateX(${dx}px) rotate(${dx / 22}deg)`
            : `translateY(${peekY}px) scale(${peekScale})`;

          return (
            <article
              key={card.id}
              ref={isFront ? frontCardRef : undefined}
              aria-hidden={!isFront}
              onTransitionEnd={isFront ? onTransitionEnd : undefined}
              className={cn(
                "absolute inset-x-0 top-0 flex flex-col rounded-2xl bg-card p-4 overflow-hidden",
                CARD_BORDER,
                isFront ? "h-auto cursor-grab active:cursor-grabbing" : "pointer-events-none"
              )}
              style={{
                height: isFront ? undefined : cardHeight,
                zIndex: isFront ? 30 : 20,
                transform,
                opacity: 1,
                transition: dragging && isFront ? "none" : isFront ? "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
              }}
            >
              <h3 className="text-sm font-bold text-foreground pr-8 shrink-0">{card.title}</h3>
              <p className="text-xs text-neutral-500 mt-0.5 mb-3 shrink-0">{card.caption}</p>
              <div className="mweb-chart-embed">
                {card.content}
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 pt-1">
        <button
          type="button"
          aria-label="Previous chart"
          aria-disabled={navLocked}
          onMouseDown={(event) => event.preventDefault()}
          onClick={navLocked ? undefined : onNavClick("right")}
          className={cn(
            "h-11 w-11 rounded-full bg-card text-foreground flex items-center justify-center",
            CARD_BORDER,
            navLocked && "opacity-40 pointer-events-none"
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Chart position">
          {cards.map((card) => {
            const active = card.id === frontId;
            return (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={card.title}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => goToIndex(card.id)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  active ? "w-5 bg-primary" : "w-2 bg-neutral-300 dark:bg-white/25"
                )}
              />
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Next chart"
          aria-disabled={navLocked}
          onMouseDown={(event) => event.preventDefault()}
          onClick={navLocked ? undefined : onNavClick("left")}
          className={cn(
            "h-11 w-11 rounded-full bg-card text-foreground flex items-center justify-center",
            CARD_BORDER,
            navLocked && "opacity-40 pointer-events-none"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}
