import { useRef, useState, useEffect } from "react";
import { motion, useScroll } from "framer-motion";
import TimelineNode from "./TimelineNode";
import BranchConnector from "./BranchConnector";
import TimelineProjectCard from "./TimelineProjectCard";
import { BRANCH_WIDTH, getDesktopJunctionProgress } from "./timelineAnimation";

function TimelineItem({
  project,
  index,
  isLeft,
  topOffset,
  totalProjects,
  timelineInView,
  lineProgress,
}) {
  const itemRef = useRef(null);
  const [hasAwakened, setHasAwakened] = useState(false);

  // Trigger Orb and card activation exactly when the drawing spine line passes this junction
  useEffect(() => {
    if (!timelineInView) {
      Promise.resolve().then(() => {
        setHasAwakened((prev) => (prev ? false : prev));
      });
      return;
    }
    if (lineProgress) {
      const junctionProgress = getDesktopJunctionProgress(index, totalProjects);
      
      const checkProgress = (latest) => {
        if (latest >= junctionProgress) {
          setHasAwakened(true);
        }
      };

      // Check the initial progress value
      checkProgress(lineProgress.get());

      const unsubscribe = lineProgress.on("change", checkProgress);
      return unsubscribe;
    }
  }, [timelineInView, lineProgress, index, totalProjects]);

  // Track scroll position of this item relative to the viewport
  const { scrollYProgress } = useScroll({
    target: itemRef,
    offset: ["start end", "end start"],
  });

  return (
    <div
      ref={itemRef}
      className="absolute left-0 right-0"
      style={{ top: `${topOffset}px` }}
    >
      {/* Symmetrical Date Marker next to spine node */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 font-mono text-[10px] md:text-xs tracking-[0.25em] uppercase opacity-40 select-none ${
          isLeft ? "text-left" : "text-right"
        }`}
        style={{
          width: "90px",
          ...(isLeft
            ? { left: "calc(50% + 28px)" }
            : { right: "calc(50% + 28px)" }),
        }}
      >
        {project.date}
      </div>

      <div
        className="absolute group/item"
        style={{
          top: 0,
          ...(isLeft
            ? { right: `calc(50% + ${BRANCH_WIDTH}px)` }
            : { left: `calc(50% + ${BRANCH_WIDTH}px)` }),
          width: `calc(50% - ${BRANCH_WIDTH + 90}px)`,
        }}
      >
        {/* Clickable Orb Smooth-Scroll Navigation Point */}
        <button
          onClick={() => {
            itemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className="absolute top-1/2 z-30 -translate-y-1/2 -translate-x-1/2 pointer-events-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black rounded-full transition-transform hover:scale-110 active:scale-95"
          style={{
            ...(isLeft
              ? { left: `calc(100% + ${BRANCH_WIDTH}px)` }
              : { left: `-${BRANCH_WIDTH}px` }),
          }}
          aria-label={`Scroll to ${project.title}`}
        >
          <TimelineNode scrollYProgress={scrollYProgress} hasAwakened={hasAwakened} />
        </button>

        {/* Branch with viewport entrance animation */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{
            ...(isLeft
              ? { right: `calc(-1 * ${BRANCH_WIDTH}px)` }
              : { left: `calc(-1 * ${BRANCH_WIDTH}px)` }),
            transformOrigin: isLeft ? "right center" : "left center",
            originX: isLeft ? 1 : 0,
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={hasAwakened ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
          transition={{
            duration: hasAwakened ? 0.5 : 0,
            delay: hasAwakened ? 0.1 : 0,
            ease: [0.22, 1, 0.36, 1],
          }}
          aria-hidden="true"
        >
          <BranchConnector isLeft={isLeft} />
        </motion.div>

        {/* Card with viewport entrance animation */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={hasAwakened ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.96 }}
          transition={{
            duration: hasAwakened ? 0.6 : 0,
            delay: hasAwakened ? 0.35 : 0,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <TimelineProjectCard
            project={project}
            index={index}
            isLeft={isLeft}
          />
        </motion.div>
      </div>
    </div>
  );
}

export default TimelineItem;
