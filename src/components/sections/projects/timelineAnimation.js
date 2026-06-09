export const TIMELINE_ANIM = {
  LINE_DRAW_DELAY: 0.8,
  LINE_DRAW_DURATION: 6.5,
  BRANCH_DRAW_DURATION: 1.1,
  CARD_REVEAL_DURATION: 0.85,
  CARD_GAP: 0.12,
  HEADER_SPACING: 150,
  ITEM_GAP: 900,
  CARD_CENTER_Y: 230,
  LINE_DRAW_EASE: [0.25, 0.1, 0.25, 1],
  BRANCH_EASE: [0.22, 1, 0.36, 1],
  CARD_EASE: [0.16, 1, 0.3, 1],
  ORB_EASE: [0.34, 1.56, 0.64, 1],
};

export function getTimelineHeight(totalProjects) {
  return TIMELINE_ANIM.HEADER_SPACING + totalProjects * TIMELINE_ANIM.ITEM_GAP;
}

/** 0–1 progress along the vertical line where this project's branch junction sits */
export function getDesktopJunctionProgress(index, totalProjects) {
  const { HEADER_SPACING, ITEM_GAP, CARD_CENTER_Y } = TIMELINE_ANIM;
  const timelineHeight = getTimelineHeight(totalProjects);
  const junctionY = HEADER_SPACING + index * ITEM_GAP + CARD_CENTER_Y;
  return junctionY / timelineHeight;
}

/** Estimated junction progress for mobile stacked layout */
export function getMobileJunctionProgress(index, totalProjects) {
  const CARD_EST = 380;
  const GAP = 64;
  const PAD = 32;
  const totalHeight = PAD * 2 + totalProjects * CARD_EST + (totalProjects - 1) * GAP;
  const junctionY = PAD + index * (CARD_EST + GAP) + CARD_EST / 2;
  return junctionY / totalHeight;
}
