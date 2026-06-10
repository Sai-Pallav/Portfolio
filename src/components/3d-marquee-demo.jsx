"use client";
import { ThreeDMarquee } from "@/components/ui/3d-marquee";
import { skills } from "@/data/skills";

// Helper to build Devicon URLs
const getDeviconUrl = (icon) => {
  if (icon === "framer") {
    return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/framermotion/framermotion-original.svg";
  }
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${icon}/${icon}-original.svg`;
};

// Build the 5 columns from src/data/skills.js
const buildSkillGroups = () => {
  return [
    // Column 0: Core Languages
    (skills.languages || []).map(item => ({
      url: getDeviconUrl(item.icon),
      skill: { ...item }
    })),
    // Column 1: CS Core / Concepts
    (skills.cs_core || []).map(item => ({
      url: getDeviconUrl(item.icon),
      skill: { ...item }
    })),
    // Column 2: Frontend Web
    (skills.frontend || []).map(item => ({
      url: getDeviconUrl(item.icon),
      skill: { ...item }
    })),
    // Column 3: Backend Web
    (skills.backend || []).map(item => ({
      url: getDeviconUrl(item.icon),
      skill: { ...item }
    })),
    // Column 4: Databases & Tools
    [...(skills.databases || []), ...(skills.tools || [])].map(item => ({
      url: getDeviconUrl(item.icon),
      skill: { ...item }
    }))
  ];
};

export default function ThreeDMarqueeDemo() {
  const groupedSkillImages = buildSkillGroups();
  
  return (
    <div className="mx-auto w-full max-w-7xl relative">
      <ThreeDMarquee images={groupedSkillImages} />
    </div>
  );
}
