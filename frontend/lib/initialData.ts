import type { Board } from "./types";

const NOW = new Date().toISOString();

export const initialBoard: Board = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-todo", title: "To Do", cardIds: ["card-3", "card-4"] },
    {
      id: "col-in-progress",
      title: "In Progress",
      cardIds: ["card-5", "card-6"],
    },
    { id: "col-review", title: "Review", cardIds: ["card-7", "card-8"] },
    { id: "col-done", title: "Done", cardIds: ["card-9", "card-10"] },
  ],
  cards: {
    "card-1": {
      id: "card-1",
      title: "Research competitors",
      details: "Review top 5 Kanban apps and note UX patterns.",
      statusChangedAt: NOW,
    },
    "card-2": {
      id: "card-2",
      title: "Define color palette",
      details: "Finalize brand colors for headings, accents, and actions.",
      statusChangedAt: NOW,
    },
    "card-3": {
      id: "card-3",
      title: "Set up project scaffold",
      details: "Initialize Next.js app with TypeScript and Tailwind.",
      statusChangedAt: NOW,
    },
    "card-4": {
      id: "card-4",
      title: "Design board layout",
      details: "Sketch five-column layout with responsive horizontal scroll.",
      statusChangedAt: NOW,
    },
    "card-5": {
      id: "card-5",
      title: "Implement drag and drop",
      details: "Wire up @dnd-kit for card moves within and across columns.",
      statusChangedAt: NOW,
    },
    "card-6": {
      id: "card-6",
      title: "Build card components",
      details: "Title, details, delete button, and hover states.",
      statusChangedAt: NOW,
    },
    "card-7": {
      id: "card-7",
      title: "Write unit tests",
      details: "Cover board reducer actions and edge cases.",
      statusChangedAt: NOW,
    },
    "card-8": {
      id: "card-8",
      title: "Add E2E tests",
      details: "Playwright flows for add, delete, rename, and drag.",
      statusChangedAt: NOW,
    },
    "card-9": {
      id: "card-9",
      title: "Populate dummy data",
      details: "Seed board with realistic sample tasks on first load.",
      statusChangedAt: NOW,
    },
    "card-10": {
      id: "card-10",
      title: "Polish UI styling",
      details: "Apply shadows, spacing, and accent colors for a pro look.",
      statusChangedAt: NOW,
    },
  },
  bottlenecks: [],
  staleCardDays: 5,
  columnCardLimit: 6,
};
