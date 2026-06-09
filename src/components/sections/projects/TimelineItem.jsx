import { motion } from "framer-motion";
import TimelineNode from "./TimelineNode";
import BranchConnector from "./BranchConnector";
import TimelineProjectCard from "./TimelineProjectCard";
import { TIMELINE_ANIM } from "./timelineAnimation";

const BRANCH_WIDTH = 80;

function TimelineItem({
  project,
  index,
  isLeft,
  topOffset,
  prefersReducedMotion,
  branchRevealed,
  cardRevealed,
}) {
  return (
    <div
      className="absolute left-0 right-0"
      style={{ top: `${topOffset}px` }}
    >
      <div
        className="absolute"
        style={{
          top: 0,
          ...(isLeft
            ? { right: `calc(50% + ${BRANCH_WIDTH}px)` }
            : { left: `calc(50% + ${BRANCH_WIDTH}px)` }),
          width: `calc(50% - ${BRANCH_WIDTH + 90}px)`,
        }}
      >
        {/* Orb */}
        <div
          className="absolute top-1/2 z-30 pointer-events-none -translate-y-1/2 -translate-x-1/2"
          style={{
            ...(isLeft
              ? { left: `calc(100% + ${BRANCH_WIDTH}px)` }
              : { left: `-${BRANCH_WIDTH}px` }),
          }}
        >
          <motion.div
            initial={false}
            animate={
              branchRevealed
                ? { scale: 1, opacity: 1 }
                : { scale: 0, opacity: 0 }
            }
            transition={{
              duration: prefersReducedMotion ? 0 : 0.5,
              ease: TIMELINE_ANIM.ORB_EASE,
            }}
          >
            <TimelineNode />
          </motion.div>
        </div>

        {/* Branch */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{
            ...(isLeft
              ? { right: `calc(-1 * ${BRANCH_WIDTH}px)` }
              : { left: `calc(-1 * ${BRANCH_WIDTH}px)` }),
            transformOrigin: isLeft ? "right center" : "left center",
          }}
          initial={false}
          animate={
            branchRevealed
              ? { scaleX: 1, opacity: 1 }
              : { scaleX: 0, opacity: 0 }
          }
          transition={{
            duration: prefersReducedMotion ? 0 : TIMELINE_ANIM.BRANCH_DRAW_DURATION,
            ease: TIMELINE_ANIM.BRANCH_EASE,
          }}
        >
          <BranchConnector isLeft={isLeft} />
        </motion.div>

        {/* Card */}
        <motion.div
          className="relative"
          initial={false}
          animate={
            cardRevealed
              ? { opacity: 1, x: 0, scale: 1 }
              : { opacity: 0, x: isLeft ? 28 : -28, scale: 0.96 }
          }
          transition={{
            duration: prefersReducedMotion ? 0 : TIMELINE_ANIM.CARD_REVEAL_DURATION,
            ease: TIMELINE_ANIM.CARD_EASE,
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
