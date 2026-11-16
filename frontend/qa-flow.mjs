export default async function run(page, ui) {
  const checks = {};
  await page.getByRole("button", { name: "Add attachments" }).click();
  checks.attachmentMenu = await page
    .getByText("Add files", { exact: true })
    .isVisible();
  await page.getByText("Browse library", { exact: true }).click();
  checks.libraryRendered = await page
    .getByRole("heading", { name: "Library" })
    .isVisible();
  checks.documentRows = await page.locator(".document-row").count();
  await page.getByRole("button", { name: "Chats", exact: true }).click();
  await page.getByRole("button", { name: "Sources" }).click();
  checks.citationSource = await page.locator(".citation-drawer").isVisible();
  const input = page.getByRole("textbox", { name: /Ask a follow-up/ });
  await input.fill("What should we evaluate first?");
  await input.press("Enter");
  checks.userMessage = await page
    .getByText("What should we evaluate first?", { exact: true })
    .isVisible();
  checks.streamingStarted = await page
    .locator(".streaming-indicator")
    .isVisible();
  await page.waitForTimeout(700);
  checks.streamingContinues = await page
    .locator(".streaming-indicator")
    .isVisible();
  await page.getByRole("button", { name: "Stop generation" }).click();
  checks.stopWorks = await page
    .getByText("Generation stopped", { exact: true })
    .isVisible();
  return checks;
}
