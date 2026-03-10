import { expect, test } from "@playwright/test";
import { API_BASE, deleteAllTodos } from "../helpers";

/**
 * Parse an oklch() or rgb() color string into sRGB {r, g, b} in 0-255.
 * Browsers compute border-color as either oklch(...) or rgb(...).
 */
function parseColor(raw: string): { r: number; g: number; b: number } | null {
  const rgbMatch = raw.match(
    /rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)[\s,)]/,
  );
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }
  // oklch(L C H) → approximate sRGB via linear conversion
  const oklchMatch = raw.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (oklchMatch) {
    const L = Number(oklchMatch[1]);
    const C = Number(oklchMatch[2]);
    const H = (Number(oklchMatch[3]) * Math.PI) / 180;
    const a_ = C * Math.cos(H);
    const b_ = C * Math.sin(H);
    const l_ = L + 0.3963377774 * a_ + 0.2158037573 * b_;
    const m_ = L - 0.1055613458 * a_ - 0.0638541728 * b_;
    const s_ = L - 0.0894841775 * a_ - 1.291485548 * b_;
    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;
    const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    const toSrgb = (c: number) =>
      Math.round(
        Math.max(
          0,
          Math.min(
            255,
            (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255,
          ),
        ),
      );
    return { r: toSrgb(lr), g: toSrgb(lg), b: toSrgb(lb) };
  }
  return null;
}

/** Relative luminance per WCAG 2.x */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG contrast ratio between two relative luminances */
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get the foreground color (border or SVG stroke) and the nearest
 * ancestor background color for an element.
 */
async function getElementColors(
  page: import("@playwright/test").Page,
  selector: string,
): Promise<{ fgColor: string; bgColor: string }> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`Element not found: ${sel}`);
    const style = window.getComputedStyle(el);
    // Use stroke for SVG elements, borderColor for HTML elements
    const fgColor = el instanceof SVGElement ? style.stroke : style.borderColor;

    // Walk up to find the effective background
    let bgEl: Element | null = el.parentElement;
    let bgColor = "rgba(0, 0, 0, 0)";
    while (bgEl) {
      const bg = window.getComputedStyle(bgEl).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        bgColor = bg;
        break;
      }
      bgEl = bgEl.parentElement;
    }
    return { fgColor, bgColor };
  }, selector);
}

test.beforeEach(async ({ request }) => {
  await deleteAllTodos(request);
});

test("theme toggle switches light to dark and persists across reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("theme"));
  await page.reload();

  const toggle = page.getByRole("button", { name: "Switch to dark mode" });
  await expect(toggle).toBeVisible();

  await toggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("theme toggle aria-label is dynamic", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("theme"));
  await page.reload();

  await expect(
    page.getByRole("button", { name: "Switch to dark mode" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
});

test("all interactive elements have cursor-pointer", async ({
  page,
  request,
}) => {
  await request.post(`${API_BASE}/todos`, {
    data: { text: "Cursor test todo" },
  });
  await page.goto("/");
  await expect(page.getByText("Cursor test todo")).toBeVisible();

  const themeToggleCursor = await page
    .getByRole("button", { name: /switch to/i })
    .evaluate((el) => window.getComputedStyle(el).cursor);
  expect(themeToggleCursor).toBe("pointer");

  const checkboxCursor = await page
    .getByRole("checkbox")
    .evaluate((el) => window.getComputedStyle(el).cursor);
  expect(checkboxCursor).toBe("pointer");

  const deleteButtonCursor = await page
    .getByRole("button", { name: "Delete todo", exact: true })
    .evaluate((el) => window.getComputedStyle(el).cursor);
  expect(deleteButtonCursor).toBe("pointer");

  const addButtonCursor = await page
    .getByRole("button", { name: "Add todo" })
    .evaluate((el) => window.getComputedStyle(el).cursor);
  expect(addButtonCursor).toBe("pointer");
});

test("all interactive elements reachable via Tab key", async ({
  page,
  request,
  browserName,
}) => {
  await request.post(`${API_BASE}/todos`, {
    data: { text: "Tab navigation test" },
  });
  await page.goto("/");
  await expect(page.getByText("Tab navigation test")).toBeVisible();

  // Click on the page heading (non-interactive) to get a consistent starting
  // focus context across browsers, before starting Tab navigation.
  await page.click("h1");

  // Collect all labels/roles reached by Tab navigation.
  const reachedLabels = new Set<string>();
  const reachedRoles = new Set<string>();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => ({
      tag: document.activeElement?.tagName ?? "",
      label:
        document.activeElement?.getAttribute("aria-label") ??
        document.activeElement?.tagName ??
        "",
      role: document.activeElement?.getAttribute("role") ?? "",
    }));
    if (info.tag === "BODY") break;
    reachedLabels.add(info.label);
    if (info.role) reachedRoles.add(info.role);
  }

  // Input is universally Tab-accessible in all browsers
  expect(reachedLabels.has("Add a task")).toBe(true);

  // Buttons and checkboxes are Tab-accessible in Chromium and Firefox.
  // WebKit (Safari) defaults to not Tab-focusing buttons unless Full Keyboard
  // Access is enabled — this is a known macOS platform behaviour, not a code bug.
  if (browserName !== "webkit") {
    expect([...reachedLabels].some((l) => /switch to/i.test(l))).toBe(true);
    expect(reachedLabels.has("Delete todo")).toBe(true);
    // Checkbox (Mark as complete) should be reachable
    expect(
      reachedLabels.has("Mark as complete") ||
        reachedLabels.has("Mark as active"),
    ).toBe(true);
    expect(reachedLabels.size).toBeGreaterThanOrEqual(4);
  }
});

test("interactive elements show a visible focus ring", async ({
  page,
  request,
  browserName,
}) => {
  await request.post(`${API_BASE}/todos`, {
    data: { text: "Focus ring test" },
  });
  await page.goto("/");
  await expect(page.getByText("Focus ring test")).toBeVisible();

  await page.click("h1");

  // Record the form's unfocused background color for comparison.
  const formBgBefore = await page.evaluate(() => {
    const form = document.querySelector("form");
    return form ? window.getComputedStyle(form).backgroundColor : "";
  });

  if (browserName !== "webkit") {
    // Tab through all interactive elements and verify each has a focus indicator.
    // Buttons/checkboxes use focus-visible:ring-2 (box-shadow).
    // The input uses focus-within background change on its parent form row.
    const focusResults: { label: string; hasIndicator: boolean }[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate((bgBefore) => {
        const el = document.activeElement as HTMLElement;
        if (!el || el.tagName === "BODY") return null;
        const style = window.getComputedStyle(el);
        // For the input, the focus indicator is a bg change on the parent form
        let parentBgChanged = false;
        if (el.tagName === "INPUT" && el.closest("form")) {
          const parentBg = window.getComputedStyle(
            el.closest("form")!,
          ).backgroundColor;
          parentBgChanged = parentBg !== bgBefore;
        }
        return {
          label: el.getAttribute("aria-label") ?? el.tagName.toLowerCase(),
          boxShadow: style.boxShadow,
          outline: style.outline,
          parentBgChanged,
        };
      }, formBgBefore);
      if (!info) break;
      const hasRing =
        (info.boxShadow !== "none" && info.boxShadow !== "") ||
        (info.outline !== "" &&
          info.outline !== "none" &&
          !info.outline.includes("0px"));
      focusResults.push({
        label: info.label,
        hasIndicator: hasRing || info.parentBgChanged,
      });
    }

    // Verify we reached multiple elements and all have focus indicators
    expect(focusResults.length).toBeGreaterThanOrEqual(3);
    for (const result of focusResults) {
      expect(
        result.hasIndicator,
        `Expected focus indicator on "${result.label}"`,
      ).toBe(true);
    }
  } else {
    // WebKit: Tab to the text input and verify its parent form shows a focus indicator.
    let foundInput = false;
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      const label = await page.evaluate(
        () => document.activeElement?.getAttribute("aria-label") ?? "",
      );
      if (label === "Add a task") {
        foundInput = true;
        break;
      }
    }
    expect(foundInput).toBe(true);

    const parentBg = await page.evaluate(() => {
      const form = document.activeElement?.closest("form");
      return form ? window.getComputedStyle(form).backgroundColor : "";
    });
    expect(parentBg).not.toBe(formBgBefore);
  }
});

test("checkbox and placeholder border contrast meets WCAG AA 3:1", async ({
  page,
  request,
}) => {
  await request.post(`${API_BASE}/todos`, {
    data: { text: "Contrast test" },
  });
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("theme"));
  await page.reload();
  await expect(page.getByText("Contrast test")).toBeVisible();

  // Helper to assert contrast > 3:1
  function assertContrast(
    label: string,
    fg: ReturnType<typeof parseColor>,
    bg: ReturnType<typeof parseColor>,
  ) {
    expect(fg, `${label}: fg color parsed`).not.toBeNull();
    expect(bg, `${label}: bg color parsed`).not.toBeNull();
    if (fg && bg) {
      const ratio = contrastRatio(
        relativeLuminance(fg.r, fg.g, fg.b),
        relativeLuminance(bg.r, bg.g, bg.b),
      );
      expect(ratio, label).toBeGreaterThan(3);
    }
  }

  // Light mode — checkbox (HTML element, uses borderColor)
  const lightCheckbox = await getElementColors(page, '[role="checkbox"]');
  assertContrast(
    "Light checkbox",
    parseColor(lightCheckbox.fgColor),
    parseColor(lightCheckbox.bgColor),
  );

  // Light mode — TodoForm placeholder (SVG circle, uses stroke)
  const lightPlaceholder = await getElementColors(page, "form svg circle");
  assertContrast(
    "Light placeholder",
    parseColor(lightPlaceholder.fgColor),
    parseColor(lightPlaceholder.bgColor),
  );

  // Switch to dark mode
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  // Dark mode — checkbox
  const darkCheckbox = await getElementColors(page, '[role="checkbox"]');
  assertContrast(
    "Dark checkbox",
    parseColor(darkCheckbox.fgColor),
    parseColor(darkCheckbox.bgColor),
  );

  // Dark mode — TodoForm placeholder
  const darkPlaceholder = await getElementColors(page, "form svg circle");
  assertContrast(
    "Dark placeholder",
    parseColor(darkPlaceholder.fgColor),
    parseColor(darkPlaceholder.bgColor),
  );
});
