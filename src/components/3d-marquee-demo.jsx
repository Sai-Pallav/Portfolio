"use client";
import { ThreeDMarquee } from "@/components/ui/3d-marquee";

// Skill metadata: each entry maps to the image URL
const SKILL_DATA = {
  "python-original.svg": {
    name: "Python",
    level: 90,
    years: 4,
    tag: "ML, Scripting, Backend",
    project: "Language-Agnostic Chatbot",
  },
  "cplusplus-original.svg": {
    name: "C++",
    level: 75,
    years: 3,
    tag: "Systems, Algorithms",
    project: "Competitive Programming",
  },
  "javascript-original.svg": {
    name: "JavaScript",
    level: 92,
    years: 4,
    tag: "Web, Full-Stack",
    project: "Portfolio Website",
  },
  "typescript-original.svg": {
    name: "TypeScript",
    level: 85,
    years: 3,
    tag: "Type-Safe Development",
    project: "Portfolio Website",
  },
  "react-original.svg": {
    name: "React",
    level: 88,
    years: 3,
    tag: "Frontend, SPA",
    project: "Portfolio Website",
  },
  "nextjs-original.svg": {
    name: "Next.js",
    level: 80,
    years: 2,
    tag: "SSR, Full-Stack",
    project: "Full-Stack Web App",
  },
  "tailwindcss-original.svg": {
    name: "Tailwind CSS",
    level: 90,
    years: 3,
    tag: "Styling, UI",
    project: "Portfolio Website",
  },
  "threejs-original.svg": {
    name: "Three.js",
    level: 65,
    years: 1,
    tag: "3D Graphics, WebGL",
    project: "3D Skills Section",
  },
  "nodejs-original.svg": {
    name: "Node.js",
    level: 82,
    years: 3,
    tag: "Backend, REST API",
    project: "REST API Backend",
  },
  "express-original.svg": {
    name: "Express.js",
    level: 80,
    years: 3,
    tag: "Backend, Middleware",
    project: "REST API Backend",
  },
  "fastapi-original.svg": {
    name: "FastAPI",
    level: 78,
    years: 2,
    tag: "Python, Backend",
    project: "Language-Agnostic Chatbot",
  },
  "postgresql-original.svg": {
    name: "PostgreSQL",
    level: 75,
    years: 2,
    tag: "Relational DB, SQL",
    project: "Backend Database",
  },
  "mongodb-original.svg": {
    name: "MongoDB",
    level: 72,
    years: 2,
    tag: "NoSQL, Database",
    project: "Chatbot Data Store",
  },
  "git-original.svg": {
    name: "Git",
    level: 88,
    years: 4,
    tag: "Version Control",
    project: "Every Project",
  },
  "docker-original.svg": {
    name: "Docker",
    level: 70,
    years: 2,
    tag: "Containerization, DevOps",
    project: "Chatbot Deployment",
  },
  "linux-original.svg": {
    name: "Linux",
    level: 78,
    years: 4,
    tag: "OS, CLI, Servers",
    project: "Dev Environment",
  },
  "redis-original.svg": {
    name: "Redis",
    level: 65,
    years: 1,
    tag: "Caching, Sessions",
    project: "API Rate Limiter",
  },
  "figma-original.svg": {
    name: "Figma",
    level: 70,
    years: 2,
    tag: "UI Design, Prototyping",
    project: "Portfolio Design",
  },
  "rust-original.svg": {
    name: "Rust",
    level: 55,
    years: 1,
    tag: "Systems, Performance",
    project: "Learning Project",
  },
  "amazonwebservices-original-wordmark.svg": {
    name: "AWS",
    level: 65,
    years: 2,
    tag: "Cloud, Deployment",
    project: "Cloud Deployment",
  },
};

// Build a list of { url, skill } so the marquee component can access metadata
const images = [
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/threejs/threejs-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/express/express-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/fastapi/fastapi-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mongodb/mongodb-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redis/redis-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/figma/figma-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/rust/rust-original.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-original-wordmark.svg",
];

// Resolve skill metadata by matching the filename part of the URL
function getSkillData(url) {
  const filename = url.split("/").pop();
  return SKILL_DATA[filename] || { name: filename.replace(/-original.*\.svg$/, ""), level: 70, years: 1, tag: "Tech", project: "—" };
}

export default function ThreeDMarqueeDemo() {
  const skillImages = images.map((url) => ({ url, skill: getSkillData(url) }));
  return (
    <div className="mx-auto w-full max-w-7xl relative">
      <ThreeDMarquee images={skillImages} />
    </div>
  );
}
