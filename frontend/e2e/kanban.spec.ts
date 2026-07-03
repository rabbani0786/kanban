import { test, expect } from "@playwright/test";

test.describe("Kanban board", () => {
  test("loads dummy data with five columns", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Project Board" })).toBeVisible();
    await expect(page.getByTestId("column-col-backlog")).toBeVisible();
    await expect(page.getByTestId("column-col-todo")).toBeVisible();
    await expect(page.getByTestId("column-col-in-progress")).toBeVisible();
    await expect(page.getByTestId("column-col-review")).toBeVisible();
    await expect(page.getByTestId("column-col-done")).toBeVisible();
    await expect(page.getByTestId("card-card-1")).toBeVisible();
  });

  test("renames a column title", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Rename column To Do" }).click();
    const input = page.getByLabel("Column title");
    await input.fill("Ready");
    await input.press("Enter");

    await expect(
      page.getByRole("button", { name: "Rename column Ready" })
    ).toBeVisible();
  });

  test("adds a card to a column", async ({ page }) => {
    await page.goto("/");

    const backlog = page.getByTestId("column-col-backlog");
    await backlog.getByRole("button", { name: "+ Add card" }).click();
    await backlog.getByLabel("Card title").fill("New backlog item");
    await backlog.getByLabel("Card details").fill("Added from E2E test");
    await backlog.getByRole("button", { name: "Add card" }).click();

    await expect(page.getByText("New backlog item")).toBeVisible();
    await expect(page.getByText("Added from E2E test")).toBeVisible();
  });

  test("deletes a card", async ({ page }) => {
    await page.goto("/");

    const cardTitle = "Research competitors";
    const card = page.getByTestId("card-card-1");
    await card.hover();
    await card.getByRole("button", { name: `Delete card ${cardTitle}` }).click();

    await expect(page.getByText(cardTitle)).toHaveCount(0);
  });

  test("drags a card to another column", async ({ page }) => {
    await page.goto("/");

    const cardTitle = "Set up project scaffold";
    const card = page.getByTestId("card-card-3");
    const targetColumn = page.getByTestId("column-col-in-progress");
    const handle = card.getByRole("button", { name: `Drag card ${cardTitle}` });

    const handleBox = await handle.boundingBox();
    const columnBox = await targetColumn.boundingBox();

    if (!handleBox || !columnBox) {
      throw new Error("Could not resolve drag targets");
    }

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      columnBox.x + columnBox.width / 2,
      columnBox.y + 120,
      { steps: 15 }
    );
    await page.mouse.up();

    await expect(targetColumn.getByText(cardTitle)).toBeVisible();
  });
});
