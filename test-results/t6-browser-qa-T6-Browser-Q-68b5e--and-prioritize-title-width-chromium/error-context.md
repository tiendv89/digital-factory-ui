# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: t6-browser-qa.spec.ts >> T6 Browser QA — Feature Card Regression >> feature cards render ID smaller than title and prioritize title width
- Location: tests/browser-qa/t6-browser-qa.spec.ts:33:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForLoadState: Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "T6 Browser QA — Component Verification" [level=1] [ref=e3]
    - generic [ref=e4]:
      - heading "1. Feature Cards — ID smaller than title" [level=2] [ref=e5]
      - generic [ref=e6]:
        - generic [ref=e7]:
          - paragraph [ref=e8]: Normal — ID + Title
          - button "Open feature tab for Feature Kanban Board" [ref=e9] [cursor=pointer]:
            - paragraph [ref=e11]: Feature Kanban Board
            - paragraph [ref=e12]: kanban-board-feature
            - generic [ref=e14]: 3 tasks
        - generic [ref=e15]:
          - paragraph [ref=e16]: Long ID — truncates
          - button "Open feature tab for Short Title" [ref=e17] [cursor=pointer]:
            - paragraph [ref=e19]: Short Title
            - paragraph [ref=e20]: very-long-feature-id-that-would-overflow-the-card
            - generic [ref=e22]: 0 tasks
        - generic [ref=e23]:
          - paragraph [ref=e24]: Long Title — wraps (line-clamp-2)
          - button "Open feature tab for This is a very long feature title that should wrap across multiple lines rather than being cut off abruptly by the card layout" [ref=e25] [cursor=pointer]:
            - paragraph [ref=e27]: This is a very long feature title that should wrap across multiple lines rather than being cut off abruptly by the card layout
            - paragraph [ref=e28]: SHORT-1
            - generic [ref=e30]: 0 tasks
        - generic [ref=e31]:
          - paragraph [ref=e32]: Same ID/Title — ID hidden
          - button "Open feature tab for simple-feature" [ref=e33] [cursor=pointer]:
            - paragraph [ref=e35]: simple-feature
            - generic [ref=e37]: 0 tasks
    - generic [ref=e38]:
      - heading "2. Feature Cards — No status pill" [level=2] [ref=e39]
      - paragraph [ref=e40]: All feature cards below should NOT contain status label badges (In Design, In Progress, etc.)
      - generic [ref=e41]:
        - generic [ref=e42]:
          - paragraph [ref=e43]: "Status: in_design"
          - button "Open feature tab for Feature In Design" [ref=e44] [cursor=pointer]:
            - paragraph [ref=e46]: Feature In Design
            - paragraph [ref=e47]: feat-design
            - generic [ref=e49]: 0 tasks
        - generic [ref=e50]:
          - paragraph [ref=e51]: "Status: in_tdd"
          - button "Open feature tab for Feature In TDD" [ref=e52] [cursor=pointer]:
            - paragraph [ref=e54]: Feature In TDD
            - paragraph [ref=e55]: feat-tdd
            - generic [ref=e57]: 0 tasks
        - generic [ref=e58]:
          - paragraph [ref=e59]: "Status: ready_for_implementation"
          - button "Open feature tab for Feature Ready" [ref=e60] [cursor=pointer]:
            - paragraph [ref=e62]: Feature Ready
            - paragraph [ref=e63]: feat-ready
            - generic [ref=e65]: 0 tasks
        - generic [ref=e66]:
          - paragraph [ref=e67]: "Status: in_implementation"
          - button "Open feature tab for Feature In Progress" [ref=e68] [cursor=pointer]:
            - paragraph [ref=e70]: Feature In Progress
            - paragraph [ref=e71]: feat-impl
            - generic [ref=e73]: 0 tasks
        - generic [ref=e74]:
          - paragraph [ref=e75]: "Status: in_handoff"
          - button "Open feature tab for Feature Handoff" [ref=e76] [cursor=pointer]:
            - paragraph [ref=e78]: Feature Handoff
            - paragraph [ref=e79]: feat-handoff
            - generic [ref=e81]: 0 tasks
        - generic [ref=e82]:
          - paragraph [ref=e83]: "Status: done"
          - button "Open feature tab for Feature Done" [ref=e84] [cursor=pointer]:
            - paragraph [ref=e86]: Feature Done
            - paragraph [ref=e87]: feat-done
            - generic [ref=e89]: 0 tasks
        - generic [ref=e90]:
          - paragraph [ref=e91]: "Status: blocked"
          - button "Open feature tab for Feature Blocked" [ref=e92] [cursor=pointer]:
            - paragraph [ref=e94]: Feature Blocked
            - paragraph [ref=e95]: feat-blocked
            - generic [ref=e97]: 0 tasks
        - generic [ref=e98]:
          - paragraph [ref=e99]: "Status: cancelled"
          - button "Open feature tab for Feature Cancelled" [ref=e100] [cursor=pointer]:
            - paragraph [ref=e102]: Feature Cancelled
            - paragraph [ref=e103]: feat-cancelled
            - generic [ref=e105]: 0 tasks
    - generic [ref=e106]:
      - heading "3. Feature Rows — Lifecycle status rendering" [level=2] [ref=e107]
      - generic [ref=e108]:
        - button "feat-design In Design 0/0" [ref=e110]:
          - generic [ref=e111]:
            - img [ref=e112]
            - img [ref=e114]
            - generic "feat-design" [ref=e118]
          - generic [ref=e119]:
            - generic [ref=e120]: In Design
            - generic [ref=e122]: 0/0
        - button "feat-tdd In TDD 0/0" [ref=e125]:
          - generic [ref=e126]:
            - img [ref=e127]
            - img [ref=e129]
            - generic "feat-tdd" [ref=e133]
          - generic [ref=e134]:
            - generic [ref=e135]: In TDD
            - generic [ref=e137]: 0/0
        - button "feat-ready Ready 0/0" [ref=e140]:
          - generic [ref=e141]:
            - img [ref=e142]
            - img [ref=e144]
            - generic "feat-ready" [ref=e148]
          - generic [ref=e149]:
            - generic [ref=e150]: Ready
            - generic [ref=e152]: 0/0
        - button "feat-impl In Progress 0/0" [ref=e155]:
          - generic [ref=e156]:
            - img [ref=e157]
            - img [ref=e159]
            - generic "feat-impl" [ref=e163]
          - generic [ref=e164]:
            - generic [ref=e165]: In Progress
            - generic [ref=e167]: 0/0
        - button "feat-handoff Handoff 0/0" [ref=e170]:
          - generic [ref=e171]:
            - img [ref=e172]
            - img [ref=e174]
            - generic "feat-handoff" [ref=e178]
          - generic [ref=e179]:
            - generic [ref=e180]: Handoff
            - generic [ref=e182]: 0/0
        - button "feat-done Done 0/0" [ref=e185]:
          - generic [ref=e186]:
            - img [ref=e187]
            - img [ref=e189]
            - generic "feat-done" [ref=e193]
          - generic [ref=e194]:
            - generic [ref=e195]: Done
            - generic [ref=e197]: 0/0
        - button "feat-blocked Blocked 0/0" [ref=e200]:
          - generic [ref=e201]:
            - img [ref=e202]
            - img [ref=e204]
            - generic "feat-blocked" [ref=e208]
          - generic [ref=e209]:
            - generic [ref=e210]: Blocked
            - generic [ref=e212]: 0/0
        - button "feat-cancelled Cancelled 0/0" [ref=e215]:
          - generic [ref=e216]:
            - img [ref=e217]
            - img [ref=e219]
            - generic "feat-cancelled" [ref=e223]
          - generic [ref=e224]:
            - generic [ref=e225]: Cancelled
            - generic [ref=e227]: 0/0
    - generic [ref=e229]:
      - heading "4. Task Cards — Tab-first click behavior" [level=2] [ref=e230]
      - generic [ref=e231]:
        - 'button "Task T-done: Done task" [ref=e233] [cursor=pointer]':
          - generic [ref=e235]: T-done
          - paragraph [ref=e236]: Done task
        - 'button "Task T-progress: In progress task" [ref=e238] [cursor=pointer]':
          - generic [ref=e240]: T-progress
          - paragraph [ref=e241]: In progress task
          - generic [ref=e242]:
            - img [ref=e243]
            - generic [ref=e245]: Waiting for result
        - 'button "Task T-ready: Ready task" [ref=e247] [cursor=pointer]':
          - generic [ref=e249]: T-ready
          - paragraph [ref=e250]: Ready task
          - generic [ref=e251]:
            - img [ref=e252]
            - generic [ref=e254]: Start implementation
        - 'button "Task T-blocked: Blocked task" [ref=e256] [cursor=pointer]':
          - generic [ref=e258]: T-blocked
          - paragraph [ref=e259]: Blocked task
          - generic [ref=e260]:
            - img [ref=e261]
            - generic [ref=e263]: Human resolves
        - 'button "Task T-todo: Todo task" [ref=e265] [cursor=pointer]':
          - generic [ref=e267]: T-todo
          - paragraph [ref=e268]: Todo task
          - generic [ref=e269]:
            - img [ref=e270]
            - generic [ref=e272]: Auto-ready when last dependency is done
    - generic [ref=e273]:
      - heading "5. Feature Tasks Panel — Tasks List & Task Docs" [level=2] [ref=e274]
      - generic [ref=e276]:
        - generic [ref=e277]:
          - generic [ref=e278]:
            - img [ref=e279]
            - heading "Feature Tasks" [level=2] [ref=e280]
            - generic [ref=e281]: "3"
          - generic [ref=e282]:
            - button "Tasks List" [ref=e283]:
              - img [ref=e284]
              - text: Tasks List
            - button "Task Docs" [ref=e285]:
              - img [ref=e286]
              - text: Task Docs
        - generic [ref=e289]:
          - button "Open task T1" [ref=e290]:
            - generic [ref=e291]: T1
            - generic [ref=e292]: done
            - generic [ref=e293]: Implement pagination
          - button "Open task T2" [ref=e294]:
            - generic [ref=e295]: T2
            - generic [ref=e296]: in progress
            - generic [ref=e297]: Build card layout
          - button "Open task T3" [ref=e298]:
            - generic [ref=e299]: T3
            - generic [ref=e300]: ready
            - generic [ref=e301]: Write tests
    - generic [ref=e302]:
      - heading "6. Pagination Controls" [level=2] [ref=e303]
      - generic [ref=e304]:
        - generic [ref=e305]:
          - paragraph [ref=e306]: Page 1 of 5 (200 items)
          - navigation "Pagination" [ref=e307]:
            - paragraph [ref=e308]:
              - generic [ref=e309]: 1–50
              - text: of 200
            - generic [ref=e310]:
              - generic [ref=e311]: Page 1 of 4
              - button "Previous page" [disabled] [ref=e312]:
                - img [ref=e313]
              - button "Next page" [ref=e315]:
                - img [ref=e316]
        - generic [ref=e318]:
          - paragraph [ref=e319]: Page 3 of 5
          - navigation "Pagination" [ref=e320]:
            - paragraph [ref=e321]:
              - generic [ref=e322]: 101–150
              - text: of 200
            - generic [ref=e323]:
              - generic [ref=e324]: Page 3 of 4
              - button "Previous page" [ref=e325]:
                - img [ref=e326]
              - button "Next page" [ref=e328]:
                - img [ref=e329]
        - generic [ref=e331]:
          - paragraph [ref=e332]: Single page
          - navigation "Pagination" [ref=e333]:
            - paragraph [ref=e334]:
              - generic [ref=e335]: 1–3
              - text: of 3
            - generic [ref=e336]:
              - generic [ref=e337]: Page 1 of 1
              - button "Previous page" [disabled] [ref=e338]:
                - img [ref=e339]
              - button "Next page" [disabled] [ref=e341]:
                - img [ref=e342]
  - button "Open Next.js Dev Tools" [ref=e349] [cursor=pointer]:
    - img [ref=e350]
  - alert [ref=e353]
```

# Test source

```ts
  1   | /**
  2   |  * T6 Browser QA — In-browser verification of regression cases.
  3   |  *
  4   |  * Subtask 8: Verify the status, repository, Task Docs, pagination, and
  5   |  * feature-card regression cases in-browser using Playwright.
  6   |  *
  7   |  * Navigates to /test/board-qa which renders all key components in
  8   |  * isolation with mock data. Verifies DOM structure and captures
  9   |  * screenshots as browser QA evidence.
  10  |  *
  11  |  * Run:  npx playwright test --config=playwright.config.ts
  12  |  */
  13  | 
  14  | import { test, expect } from "@playwright/test";
  15  | 
  16  | // ═══════════════════════════════════════════════════════════════════════
  17  | // Helpers
  18  | // ═══════════════════════════════════════════════════════════════════════
  19  | 
  20  | async function navigateToQAPage(page: ReturnType<typeof test["info"]> extends never ? never : Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  21  |   await page.goto("/test/board-qa");
> 22  |   await page.waitForLoadState("networkidle");
      |              ^ Error: page.waitForLoadState: Test timeout of 60000ms exceeded.
  23  |   // Wait for the page heading to confirm full render
  24  |   await page.waitForSelector("h1", { timeout: 10000 });
  25  | }
  26  | 
  27  | // ═══════════════════════════════════════════════════════════════════════
  28  | // Test: Feature Card Regression
  29  | // ═══════════════════════════════════════════════════════════════════════
  30  | 
  31  | test.describe("T6 Browser QA — Feature Card Regression", () => {
  32  | 
  33  |   test("feature cards render ID smaller than title and prioritize title width", async ({ page }) => {
  34  |     await navigateToQAPage(page);
  35  | 
  36  |     // Scroll to feature cards section
  37  |     await page.locator("#section-feature-cards").scrollIntoViewIfNeeded();
  38  |     await page.waitForTimeout(500);
  39  | 
  40  |     // Take screenshot of the section
  41  |     await page.locator("#section-feature-cards").screenshot({
  42  |       path: "screenshots/t6-feature-cards.png",
  43  |     });
  44  | 
  45  |     // Verify all cards have the expected DOM structure
  46  |     const cards = page.locator("#section-feature-cards [data-feature-card-status]");
  47  |     const count = await cards.count();
  48  |     expect(count).toBeGreaterThanOrEqual(3);
  49  | 
  50  |     // First card (Normal — ID + Title): should have both line-clamp-2 title and uppercase ID
  51  |     const firstCard = cards.nth(0);
  52  |     await expect(firstCard.locator(".line-clamp-2")).toBeVisible();
  53  |     
  54  |     // The ID element should use text-[11px] and uppercase
  55  |     const idEl = firstCard.locator(".text-\\[11px\\].uppercase");
  56  |     await expect(idEl).toBeVisible();
  57  |     const idText = await idEl.textContent();
  58  |     expect(idText).toBe("kanban-board-feature");
  59  | 
  60  |     // Title appears in DOM before ID (title uses line-clamp-2, above the ID line)
  61  |     const firstCardHtml = await firstCard.innerHTML();
  62  |     const titlePos = firstCardHtml.indexOf("Feature Kanban Board");
  63  |     const idPos = firstCardHtml.indexOf("kanban-board-feature");
  64  |     // Title should appear before the ID metadata line in the DOM
  65  |     // (the title element is the first p.line-clamp-2, ID is a later p.truncate)
  66  |     expect(titlePos).toBeLessThan(idPos);
  67  | 
  68  |     // Long ID card: should truncate
  69  |     const longIdCard = cards.nth(1);
  70  |     const longIdEl = longIdCard.locator(".truncate");
  71  |     await expect(longIdEl).toBeVisible();
  72  | 
  73  |     // Long title card: should use line-clamp-2 (wrapping)
  74  |     const longTitleCard = cards.nth(2);
  75  |     await expect(longTitleCard.locator(".line-clamp-2")).toBeVisible();
  76  | 
  77  |     // Same ID/title card: ID line should be hidden
  78  |     const sameCard = cards.nth(3);
  79  |     // Check that the ID doesn't appear twice in text content
  80  |     const sameCardText = await sameCard.textContent();
  81  |     // "simple-feature" should appear only once (just the title)
  82  |     const occurrences = (sameCardText?.match(/simple-feature/g) || []).length;
  83  |     // In HTML, the title appears in: the <p> text, the aria-label, and the title attribute
  84  |     // But the ID metadata line (separate <p>) should NOT be present
  85  |     const idMetadataLines = await sameCard.locator(".truncate.text-\\[11px\\].uppercase").count();
  86  |     expect(idMetadataLines).toBe(0);
  87  | 
  88  |     // Verify aria-label confirms tab-opening behavior
  89  |     const ariaLabel = await firstCard.getAttribute("aria-label");
  90  |     expect(ariaLabel).toContain("Open feature tab for");
  91  |   });
  92  | 
  93  |   test("feature cards suppress status tag in Feature mode", async ({ page }) => {
  94  |     await navigateToQAPage(page);
  95  | 
  96  |     // Scroll to no-status-pill section
  97  |     await page.locator("#section-no-status-pill").scrollIntoViewIfNeeded();
  98  |     await page.waitForTimeout(500);
  99  | 
  100 |     await page.locator("#section-no-status-pill").screenshot({
  101 |       path: "screenshots/t6-no-status-pill.png",
  102 |     });
  103 | 
  104 |     // All 8 feature cards should NOT contain status labels
  105 |     const statusLabels = [
  106 |       "In Design", "In TDD", "Ready", "In Progress",
  107 |       "Handoff", "Done", "Blocked", "Cancelled",
  108 |     ];
  109 | 
  110 |     const cards = page.locator("#section-no-status-pill [data-feature-card-status]");
  111 |     const count = await cards.count();
  112 |     expect(count).toBe(8);
  113 | 
  114 |     for (let i = 0; i < count; i++) {
  115 |       const card = cards.nth(i);
  116 |       for (const label of statusLabels) {
  117 |         // The card itself should not contain the status label text
  118 |         // (status labels may appear in the section description, but not inside cards)
  119 |         const cardText = await card.textContent();
  120 |         expect(cardText).not.toContain(label);
  121 |       }
  122 |     }
```