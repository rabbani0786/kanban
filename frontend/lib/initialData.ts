import type { Board } from "./types";

const NOW = new Date().toISOString();

function card(id: string, title: string, details: string) {
  return {
    id,
    title,
    details,
    priority: "medium" as const,
    dueDate: null,
    statusChangedAt: NOW,
  };
}

export const initialBoard: Board = {
  id: 1,
  name: "My Board",
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
    "card-1": card(
      "card-1",
      "Research competitors",
      "Review top 5 Kanban apps and note UX patterns."
    ),
    "card-2": card(
      "card-2",
      "Define color palette",
      "Finalize brand colors for headings, accents, and actions."
    ),
    "card-3": card(
      "card-3",
      "Set up project scaffold",
      "Initialize Next.js app with TypeScript and Tailwind."
    ),
    "card-4": card(
      "card-4",
      "Design board layout",
      "Sketch five-column layout with responsive horizontal scroll."
    ),
    "card-5": card(
      "card-5",
      "Implement drag and drop",
      "Wire up @dnd-kit for card moves within and across columns."
    ),
    "card-6": card(
      "card-6",
      "Build card components",
      "Title, details, delete button, and hover states."
    ),
    "card-7": card(
      "card-7",
      "Write unit tests",
      "Cover board reducer actions and edge cases."
    ),
    "card-8": card(
      "card-8",
      "Add E2E tests",
      "Playwright flows for add, delete, rename, and drag."
    ),
    "card-9": card(
      "card-9",
      "Populate dummy data",
      "Seed board with realistic sample tasks on first load."
    ),
    "card-10": card(
      "card-10",
      "Polish UI styling",
      "Apply shadows, spacing, and accent colors for a pro look."
    ),
  },
  bottlenecks: [],
  staleCardDays: 5,
  columnCardLimit: 6,
};
