import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import {
  TIMELINE_ANIM,
  getDesktopJunctionProgress,
  getMobileJunctionProgress,
} from "./timelineAnimation";

const {
  LINE_DRAW_DELAY,
  LINE_DRAW_DURATION,
  LINE_DRAW_EASE,
  BRANCH_DRAW_DURATION,
  CARD_GAP,
} = TIMELINE_ANIM;

export function useProjectTimelineAnimation(
  projectCount,
  isInView,
  prefersReducedMotion,
  isMobile,
) {
  const lineProgress = useMotionValue(0);
  const [branchRevealed, setBranchRevealed] = useState(
    () => new Array(projectCount).fill(false),
  );
  const [cardRevealed, setCardRevealed] = useState(
    () => new Array(projectCount).fill(false),
  );
  const branchRevealedRef = useRef(new Array(projectCount).fill(false));
  const cardTimersRef = useRef([]);

  const getJunction = (index) =>
    isMobile
      ? getMobileJunctionProgress(index, projectCount)
      : getDesktopJunctionProgress(index, projectCount);

  const revealAll = () => {
    branchRevealedRef.current = new Array(projectCount).fill(true);
    setBranchRevealed(new Array(projectCount).fill(true));
    setCardRevealed(new Array(projectCount).fill(true));
  };

  const resetAll = () => {
    branchRevealedRef.current = new Array(projectCount).fill(false);
    setBranchRevealed(new Array(projectCount).fill(false));
    setCardRevealed(new Array(projectCount).fill(false));
    cardTimersRef.current.forEach(clearTimeout);
    cardTimersRef.current = [];
  };

  // Vertical line draw
  useEffect(() => {
    if (prefersReducedMotion) {
      lineProgress.set(1);
      return undefined;
    }

    if (!isInView) {
      lineProgress.set(0);
      return undefined;
    }

    lineProgress.set(0);
    const controls = animate(lineProgress, 1, {
      delay: LINE_DRAW_DELAY,
      duration: LINE_DRAW_DURATION,
      ease: LINE_DRAW_EASE,
    });

    return () => {
      if (controls?.stop) controls.stop();
    };
  }, [isInView, prefersReducedMotion, lineProgress]);

  // Branch + card reveal synced to line position
  useEffect(() => {
    cardTimersRef.current.forEach(clearTimeout);
    cardTimersRef.current = [];

    if (prefersReducedMotion) {
      if (isInView) revealAll();
      return undefined;
    }

    if (!isInView) {
      resetAll();
      return undefined;
    }

    const checkProgress = (progress) => {
      for (let i = 0; i < projectCount; i++) {
        if (branchRevealedRef.current[i]) continue;
        if (progress < getJunction(i)) continue;

        branchRevealedRef.current[i] = true;
        setBranchRevealed((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });

        const timer = setTimeout(() => {
          setCardRevealed((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, (BRANCH_DRAW_DURATION + CARD_GAP) * 1000);

        cardTimersRef.current.push(timer);
      }
    };

    checkProgress(lineProgress.get());
    const unsubscribe = lineProgress.on("change", checkProgress);

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      cardTimersRef.current.forEach(clearTimeout);
      cardTimersRef.current = [];
    };
  }, [isInView, prefersReducedMotion, isMobile, projectCount, lineProgress]);

  return { lineProgress, branchRevealed, cardRevealed };
}
