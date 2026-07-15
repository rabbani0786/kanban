import { test, expect, APIRequestContext, Page } from "@playwright/test";

const API_URL = "http://localhost:8100";

function columnByTitle(page: Page, title: string) {
  return page.locator("section.kanban-column").filter({
    has: page.getByRole("button", { name: `Rename column ${title}` }),
  });
}

function cardByTitle(page: Page, title: string) {
  return page.locator("article.kanban-card").filter({ hasText: title });
}

async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  // LoginForm's own <h1> also reads "Project Board", so asserting on that heading
  // alone would pass immediately, before the async login call actually resolves and
  // stores the session token. Wait for "Log out", which only renders once signed in.
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

async function authHeader(page: Page): Promise<Record<string, string>> {
  const token = await page.evaluate(() => sessionStorage.getItem("kanban-token"));
  return { Authorization: `Bearer ${token}` };
}

async function getFirstBoardId(page: Page, request: APIRequestContext): Promise<number> {
  const headers = await authHeader(page);
  const boards = await (await request.get(`${API_URL}/boards`, { headers })).json();
  return boards[0].id;
}

async function addCard(page: Page, columnTitle: string, cardTitle: string, details = "") {
  const column = columnByTitle(page, columnTitle);
  await column.getByRole("button", { name: "+ Add card" }).click();
  await column.getByLabel("Card title").fill(cardTitle);
  if (details) {
    await column.getByLabel("Card details").fill(details);
  }
  await column.getByRole("button", { name: "Add card" }).click();
  await expect(page.getByText(cardTitle)).toBeVisible();
}

async function deleteCardByTitle(page: Page, cardTitle: string) {
  const card = cardByTitle(page, cardTitle);
  await card.hover();
  await card.getByRole("button", { name: `Delete card ${cardTitle}` }).click();
  await expect(page.getByText(cardTitle)).toHaveCount(0);
}

async function boxOf(locator: ReturnType<Page["locator"]>) {
  await locator.scrollIntoViewIfNeeded();
  return locator.boundingBox();
}

async function dragCardToColumn(page: Page, cardTitle: string, targetColumnTitle: string) {
  const card = cardByTitle(page, cardTitle);
  const targetColumn = columnByTitle(page, targetColumnTitle);
  const handle = card.getByRole("button", { name: `Drag card ${cardTitle}` });

  const handleBox = await boxOf(handle);
  const columnBox = await boxOf(targetColumn);
  if (!handleBox || !columnBox) {
    throw new Error("Could not resolve drag targets");
  }

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + 120, { steps: 15 });
  await page.mouse.up();

  await expect(targetColumn.getByText(cardTitle)).toBeVisible();
  // Let the drop animation and layout settle before any follow-up drag measures positions.
  await page.waitForTimeout(300);
}

type Box = { x: number; y: number; width: number; height: number };

async function rawDrag(page: Page, fromBox: Box | null, toBox: Box | null) {
  if (!fromBox || !toBox) {
    throw new Error("Could not resolve drag targets");
  }
  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 10 });
  await page.mouse.up();
}

test.describe("Sign-in", () => {
  test("rejects the wrong password", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Username").fill("user");
    await page.getByLabel("Password").fill("wrong");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid username or password.")).toBeVisible();
  });

  test("signs in and persists the session across a refresh", async ({ page }) => {
    await login(page);

    await page.reload();

    await expect(page.getByRole("heading", { name: "Project Board" })).toBeVisible();
  });

  test("logs out back to the login form", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: "Log out" }).click();

    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("registers a new account and lands on a fresh board", async ({ page }) => {
    const username = `e2e-user-${Date.now()}`;
    await page.goto("/");
    await page.getByRole("button", { name: "Need an account? Register" }).click();
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();

    // Same LoginForm-heading ambiguity as login() above — wait for "Log out" instead.
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
    await expect(page.getByRole("button", { name: "My Board", exact: true })).toBeVisible();
    await expect(columnByTitle(page, "Backlog")).toBeVisible();
    await expect(page.getByText("Customer login page redesign")).toHaveCount(0);
  });

  test("rejects registering a username that is already taken", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Need an account? Register" }).click();
    await page.getByLabel("Username").fill("user");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByText(
        "Could not create an account. The username may already be taken, or the password is too short (min 8 characters)."
      )
    ).toBeVisible();
  });
});

test.describe("Kanban board", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("loads the board from the backend with five columns", async ({ page }) => {
    await expect(columnByTitle(page, "Backlog")).toBeVisible();
    await expect(columnByTitle(page, "To Do")).toBeVisible();
    await expect(columnByTitle(page, "In Progress")).toBeVisible();
    await expect(columnByTitle(page, "Review")).toBeVisible();
    await expect(columnByTitle(page, "Done")).toBeVisible();
    await expect(page.getByText("Customer login page redesign")).toBeVisible();
  });

  test("renames a column and the rename persists after a reload", async ({ page }) => {
    await columnByTitle(page, "To Do").getByRole("button", { name: "Rename column To Do" }).click();
    const input = page.getByLabel("Column title");
    await input.fill("Ready");
    await input.press("Enter");

    await expect(page.getByRole("button", { name: "Rename column Ready" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Rename column Ready" })).toBeVisible();

    // Restore the title so later test runs start from the seeded name again.
    await page.getByRole("button", { name: "Rename column Ready" }).click();
    const revertInput = page.getByLabel("Column title");
    await revertInput.fill("To Do");
    await revertInput.press("Enter");
    await expect(page.getByRole("button", { name: "Rename column To Do" })).toBeVisible();
  });

  test("adds a card, it persists after a reload, then cleans up", async ({ page }) => {
    await addCard(page, "Backlog", "E2E added card", "Added from a Playwright test");

    await page.reload();
    await expect(page.getByText("E2E added card")).toBeVisible();
    await expect(page.getByText("Added from a Playwright test")).toBeVisible();

    await deleteCardByTitle(page, "E2E added card");
  });

  test("deletes a card and the deletion persists after a reload", async ({ page }) => {
    await addCard(page, "Backlog", "E2E card to delete");

    await deleteCardByTitle(page, "E2E card to delete");

    await page.reload();
    await expect(page.getByText("E2E card to delete")).toHaveCount(0);
  });

  test("drags a card to another column and the move persists after a reload", async ({ page }) => {
    await addCard(page, "Backlog", "E2E draggable card");

    await dragCardToColumn(page, "E2E draggable card", "In Progress");

    await page.reload();
    await expect(
      columnByTitle(page, "In Progress").getByText("E2E draggable card")
    ).toBeVisible();

    await deleteCardByTitle(page, "E2E draggable card");
  });

  test("drags a card sequentially through every column", async ({ page }) => {
    await addCard(page, "Backlog", "E2E cross-column card");

    await dragCardToColumn(page, "E2E cross-column card", "To Do");
    await dragCardToColumn(page, "E2E cross-column card", "In Progress");
    await dragCardToColumn(page, "E2E cross-column card", "Review");
    await dragCardToColumn(page, "E2E cross-column card", "Done");

    await page.reload();
    await expect(columnByTitle(page, "Done").getByText("E2E cross-column card")).toBeVisible();

    await deleteCardByTitle(page, "E2E cross-column card");
  });

  test("drags a card back and forth between two columns repeatedly without failing", async ({
    page,
  }) => {
    await addCard(page, "Backlog", "E2E reliability card");
    const card = cardByTitle(page, "E2E reliability card");
    const handle = card.getByRole("button", { name: "Drag card E2E reliability card" });
    const backlog = columnByTitle(page, "Backlog");
    const review = columnByTitle(page, "Review");

    for (let i = 0; i < 6; i++) {
      const targetColumn = i % 2 === 0 ? review : backlog;
      const targetColumnBox = await boxOf(targetColumn);
      const handleBox = await boxOf(handle);
      await rawDrag(
        page,
        handleBox,
        targetColumnBox ? { ...targetColumnBox, y: targetColumnBox.y + 100 } : null
      );
      await expect(targetColumn.getByText("E2E reliability card")).toBeVisible();
      // A brief pause for the sortable reorder transition to finish before the next
      // drag measures positions again — no real pointer could grab a card mid-animation
      // any more reliably than this test can.
      await page.waitForTimeout(300);
    }

    await deleteCardByTitle(page, "E2E reliability card");
  });

  test("drops a dragged card precisely onto another card to reorder it", async ({ page }) => {
    await addCard(page, "Backlog", "E2E card A");
    await addCard(page, "Backlog", "E2E card B");
    await addCard(page, "Backlog", "E2E card C");

    // Drag "C" and drop it directly on top of "A" — this exercises the collision
    // refinement that resolves a column-body hit down to the exact card underneath
    // the pointer, not just "somewhere in this column".
    const cardC = cardByTitle(page, "E2E card C");
    const cardA = cardByTitle(page, "E2E card A");
    const handle = cardC.getByRole("button", { name: "Drag card E2E card C" });

    await rawDrag(page, await boxOf(handle), await boxOf(cardA));

    const backlog = columnByTitle(page, "Backlog");
    const titles = await backlog.locator("article.kanban-card .kanban-card-title").allTextContents();
    const indexOfC = titles.indexOf("E2E card C");
    const indexOfA = titles.indexOf("E2E card A");
    expect(indexOfC).toBeLessThan(indexOfA);

    await deleteCardByTitle(page, "E2E card A");
    await deleteCardByTitle(page, "E2E card B");
    await deleteCardByTitle(page, "E2E card C");
  });

  test("edits a card through the API and the frontend shows it after a reload", async ({
    page,
    request,
  }) => {
    await addCard(page, "Backlog", "E2E card to edit");

    const headers = await authHeader(page);
    const boardId = await getFirstBoardId(page, request);
    const board = await (await request.get(`${API_URL}/boards/${boardId}`, { headers })).json();
    const cardId = Object.keys(board.cards).find(
      (id) => board.cards[id].title === "E2E card to edit"
    );
    expect(cardId).toBeTruthy();

    const response = await request.patch(`${API_URL}/boards/${boardId}/cards/${cardId}`, {
      headers,
      data: { title: "E2E card edited via API" },
    });
    expect(response.ok()).toBeTruthy();

    await page.reload();
    await expect(page.getByText("E2E card edited via API")).toBeVisible();
    await expect(page.getByText("E2E card to edit")).toHaveCount(0);

    await deleteCardByTitle(page, "E2E card edited via API");
  });

  test("shows the AI chat panel alongside the board at all times", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "AI Assistant" })).toBeVisible();
    await expect(page.getByLabel("Chat message")).toBeVisible();
    await expect(columnByTitle(page, "Backlog")).toBeVisible();
  });

  test("sends a chat instruction and shows the assistant's reply", async ({ page }) => {
    await page.route(`${API_URL}/boards/*/chat`, async (route) => {
      const body = route.request().postDataJSON();
      expect(body.message).toBe("Add a card called E2E chat card to Backlog");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Added the card to Backlog." }),
      });
    });

    await page.getByLabel("Chat message").fill("Add a card called E2E chat card to Backlog");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Added the card to Backlog.")).toBeVisible();
  });

  test("performs a full AI chat scenario: create, edit, and move a card in sequence", async ({
    page,
    request,
  }) => {
    // The Anthropic API call itself is mocked (no key in this environment), but every
    // mutation below goes through the real backend CRUD endpoints, exactly as the AI's
    // tool calls would — this exercises the real create/edit/move path end-to-end.
    const headers = await authHeader(page);
    const boardId = await getFirstBoardId(page, request);
    const board = await (await request.get(`${API_URL}/boards/${boardId}`, { headers })).json();
    const backlogId = board.columns[0].id;
    const doneId = board.columns[4].id;
    let cardId = "";

    await page.route(`${API_URL}/boards/*/chat`, async (route) => {
      const message = route.request().postDataJSON().message as string;

      if (message.startsWith("Create")) {
        const response = await request.post(
          `${API_URL}/boards/${boardId}/columns/${backlogId}/cards`,
          {
            headers,
            data: { title: "E2E AI card", details: "made by the assistant" },
          }
        );
        cardId = (await response.json()).id;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ reply: "Created 'E2E AI card' in Backlog." }),
        });
        return;
      }

      if (message.startsWith("Rename")) {
        await request.patch(`${API_URL}/boards/${boardId}/cards/${cardId}`, {
          headers,
          data: { title: "E2E AI card edited" },
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ reply: "Renamed the card." }),
        });
        return;
      }

      await request.post(`${API_URL}/boards/${boardId}/cards/${cardId}/move`, {
        headers,
        data: { toColumnId: doneId, toIndex: 0 },
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Moved the card to Done." }),
      });
    });

    await page.getByLabel("Chat message").fill("Create a card called E2E AI card in Backlog");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Created 'E2E AI card' in Backlog.")).toBeVisible();
    await expect(columnByTitle(page, "Backlog").getByText("E2E AI card")).toBeVisible();

    await page.getByLabel("Chat message").fill("Rename that card to E2E AI card edited");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Renamed the card.")).toBeVisible();
    await expect(columnByTitle(page, "Backlog").getByText("E2E AI card edited")).toBeVisible();

    await page.getByLabel("Chat message").fill("Move that card to Done");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Moved the card to Done.")).toBeVisible();
    await expect(columnByTitle(page, "Done").getByText("E2E AI card edited")).toBeVisible();

    await page.reload();
    await expect(columnByTitle(page, "Done").getByText("E2E AI card edited")).toBeVisible();

    await deleteCardByTitle(page, "E2E AI card edited");
  });
});

test.describe("Backend errors", () => {
  test("shows an error banner when the board cannot be loaded", async ({ page }) => {
    await page.route(`${API_URL}/boards/*`, (route) => {
      if (route.request().method() === "GET") {
        return route.abort();
      }
      return route.continue();
    });

    await login(page);

    await expect(
      page.getByText("Could not load the board. Is the backend running?")
    ).toBeVisible();
  });
});

test.describe("Multiple boards", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("creates a second board, switches to it, and it starts empty", async ({ page }) => {
    await page.getByRole("button", { name: "+ New board" }).click();
    await page.getByLabel("New board name").fill("Marketing");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByRole("button", { name: "Marketing", exact: true })).toBeVisible();
    await expect(columnByTitle(page, "Backlog")).toBeVisible();
    await expect(page.getByText("Customer login page redesign")).toHaveCount(0);

    await page.getByRole("button", { name: "My Board", exact: true }).click();
    await expect(page.getByText("Customer login page redesign")).toBeVisible();
  });

  test("renames a board", async ({ page }) => {
    await page.getByLabel("Rename board My Board").click();
    const input = page.getByLabel("Board name");
    await input.fill("Renamed board");
    await input.press("Enter");

    await expect(page.getByRole("button", { name: "Renamed board", exact: true })).toBeVisible();

    // Restore the original name so later test runs start from a clean seed state.
    await page.getByLabel("Rename board Renamed board").click();
    const revertInput = page.getByLabel("Board name");
    await revertInput.fill("My Board");
    await revertInput.press("Enter");
    await expect(page.getByRole("button", { name: "My Board", exact: true })).toBeVisible();
  });

  test("deletes a board after confirming", async ({ page }) => {
    await page.getByRole("button", { name: "+ New board" }).click();
    await page.getByLabel("New board name").fill("Temporary board");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("button", { name: "Temporary board", exact: true })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByLabel("Delete board Temporary board").click();

    await expect(page.getByRole("button", { name: "Temporary board" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "My Board", exact: true })).toBeVisible();
  });
});
