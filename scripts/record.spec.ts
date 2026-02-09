import { test, chromium, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Load timing configuration
const timingPath = path.join(__dirname, 'timing.json');
let timing: Record<string, number> = {};

if (fs.existsSync(timingPath)) {
    const data = fs.readFileSync(timingPath, 'utf8');
    timing = JSON.parse(data);
} else {
    console.warn("Timing file not found, using default durations.");
}

// Function to wait for audio duration
async function waitForAudio(page: Page, sceneId: string, defaultDuration: number = 5000) {
    const duration = (timing[sceneId] || defaultDuration) * 1000;
    console.log(`Playing scene ${sceneId} for ${duration}ms`);
    await page.waitForTimeout(duration);
}

// Helper to inject and move a fake cursor
async function installMouseHelper(page: Page) {
    await page.addStyleTag({
        content: `
            .mouse-helper {
                pointer-events: none;
                position: absolute;
                top: 0;
                left: 0;
                width: 20px;
                height: 20px;
                background: rgba(0,0,0,.4);
                border: 1px solid white;
                border-radius: 50%;
                margin-left: -10px;
                margin-top: -10px;
                transition: background .2s, border-radius .2s, border-color .2s;
                z-index: 10000;
            }
            .mouse-helper.button-hover {
                background: rgba(255,0,0,.4);
                border-color: red;
            }
            .mouse-helper.text-hover {
                background: rgba(0,0,255,.4);
                border-color: blue;
                border-radius: 4px;
                height: 30px;
                width: 2px;
                margin-left: 0;
            }
        `
    });
    await page.evaluate(() => {
        const box = document.createElement('div');
        box.classList.add('mouse-helper');
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
            .mouse-helper {
                pointer-events: none;
                position: absolute;
                top: 0;
                left: 0;
                width: 30px;
                height: 30px;
                background: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAw 
MjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0ibGF0ZXZpb2xldCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbbc2lkZS1tb3VzZS1wb2ludGVyLTIiPjxwYXRoIGQ9Ik00LjAzIDQuMDNhMiAyIDAgMCAwLTEuNiAxLjZsLTUgMTRhMiAyIDAgMCAwIDMuNCAxLjlsNC02LjQ0IDYtNCAxLjlhMiAyIDAgMCAwIDEuNi0zLjR6Ii8+PC9zdmc+'); 
                background-size: contain;
                z-index: 99999;
                transition: transform 0.1s;
            }
        `;
        document.head.appendChild(styleElement); // Re-injecting simple cursor style if the previous one is too complex or just use an image
        document.body.appendChild(box);

        document.addEventListener('mousemove', event => {
            box.style.left = event.pageX + 'px';
            box.style.top = event.pageY + 'px';
        }, true);
    });
}

test('record video', async () => {
    test.setTimeout(600000); // 10 minutes timeout for extended interaction and 4K recording
    const browser = await chromium.launch({
        headless: false,
    });

    // 4K Resolution
    const width = 3840;
    const height = 2160;

    const context = await browser.newContext({
        recordVideo: {
            dir: 'video',
            size: { width, height }
        },
        viewport: { width, height },
        locale: 'en-US',
        deviceScaleFactor: 1, // Ensure 1:1 pixel mapping for crisp 4K
    });

    const page = await context.newPage();
    await installMouseHelper(page);

    // Scene 1: Direct Navigation & Intro
    console.log("Scene 1: Direct Navigation & Intro");
    await page.goto('https://cryptowalletsx.com/binance-wotd-solver', { waitUntil: 'domcontentloaded' });

    // Wait for content to load
    try {
        await page.waitForSelector('h1', { timeout: 15000 });
    } catch (e) {
        console.warn("H1 not found, continuing anyway...");
    }

    // Move mouse to center to show it's active
    await page.mouse.move(width / 2, height / 2, { steps: 10 });

    await waitForAudio(page, 'intro', 6);

    // Scene 2/3: Solver Demo - Simplified & Narrative 
    console.log("Scene 2/3: Solver Demo - Showing word length selection and color tapping");

    // Scroll to solver view
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(1000);

    // **Show that you CAN change word lengths** - hover over a few to demonstrate
    console.log("Demonstrating word length buttons...");
    const demonstrateButtons = [3, 5, 7];
    for (const len of demonstrateButtons) {
        const btn = page.getByRole('button', { name: `${len} Letters` });
        if (await btn.isVisible()) {
            await btn.hover();
            await page.waitForTimeout(300);
        }
    }

    // **Pick ONE word length** - 5 letters for the demo
    console.log("Selecting 5 letters...");
    const fiveLetterBtn = page.getByRole('button', { name: '5 Letters' });
    if (await fiveLetterBtn.isVisible()) {
        await fiveLetterBtn.hover();
        await page.mouse.down(); await page.mouse.up();
        await fiveLetterBtn.click();
        await page.waitForTimeout(1000);
    }

    // **Type a random word**
    console.log("Typing a word...");
    const input = page.locator('input[type="text"]').first();
    if (await input.isVisible()) {
        await input.fill('');
        await input.pressSequentially('TRADE', { delay: 150 });
        await page.waitForTimeout(500);
    }

    // **Demonstrate color changing - colors cycle: Grey → Yellow → Green**
    // Tiles are just buttons that show the letters
    console.log("Demonstrating color tapping...");

    // Wait for tiles to appear (they render based on input)
    await page.waitForTimeout(500);

    // Find tiles - they're buttons with w-14 h-14 or w-16 h-16 classes (from Solver.tsx line 294)
    // These are the letter tile buttons that cycle colors when clicked
    const tileLike = page.locator('button.w-14.h-14, button.w-16.h-16').filter({
        hasNotText: 'Letters' // Exclude word length buttons
    });

    const tileCount = await tileLike.count();
    console.log(`Found ${tileCount} tile buttons`);

    // Assuming a 5-letter word was typed, so we expect 5 tiles.
    // If less than 5, it might be an issue, but we proceed if at least one is found.
    const wordLength = 5;
    if (tileCount >= wordLength || tileCount > 0) {

        // Click first letter tile to cycle colors
        // Cycle: absent (grey bg-slate-500) → present (yellow bg-amber-400) → correct (green bg-emerald-500)
        const firstTile = tileLike.first();
        await firstTile.scrollIntoViewIfNeeded();
        await firstTile.hover();
        await page.waitForTimeout(300);

        // First tap - grey to yellow (present)
        await firstTile.click();
        await page.waitForTimeout(800);

        // Second tap - yellow to green (correct)
        await firstTile.click();
        await page.waitForTimeout(800);

        // Third tap - green back to grey (absent)
        await firstTile.click();
        await page.waitForTimeout(500);
    } else {
        console.warn("No tile buttons found for color demo");
    }

    // **Click "Add Guess" button** (NOT "Solve")
    console.log("Clicking Add Guess button...");
    const addGuessBtn = page.getByRole('button', { name: /Add Guess/i });
    if (await addGuessBtn.isVisible()) {
        await addGuessBtn.hover();
        await addGuessBtn.click();
        await page.waitForTimeout(1500);
    }

    // **Click on a suggestion if available**
    console.log("Looking for suggestions...");
    // Suggestions are in a scrollable div, they have font-mono class
    const suggestionBtn = page.locator('div.cursor-pointer').filter({ hasText: /^[A-Z]{5}$/ }).first();
    if (await suggestionBtn.count() > 0 && await suggestionBtn.isVisible()) {
        await suggestionBtn.scrollIntoViewIfNeeded();
        await suggestionBtn.hover();
        await suggestionBtn.click();
        await page.waitForTimeout(1000);

        // **Demonstrate color change on the suggestion - tiles will re-appear**
        await page.waitForTimeout(500);
        const tilesAfter = tileLike;
        if (await tilesAfter.count() > 1) {
            const secondTile = tilesAfter.nth(1);
            await secondTile.hover();
            await secondTile.click(); // grey → yellow
            await page.waitForTimeout(500);
            await secondTile.click(); // yellow → green
            await page.waitForTimeout(500);
        }
    }

    // **CRITICAL: Wait for audio AFTER all solver interactions**
    await waitForAudio(page, 'solver_demo', 8);


    // Scene 4: Answer Today
    console.log("Scene 4: Answer Today");

    // Fix: Use correct link text/href
    // Trying generic text match or exact href
    const answerLink = page.getByRole('link', { name: /Binance wotd answer/i }).first();
    const answerHref = '/binance-wotd-answer-today';
    const linkByHref = page.locator(`a[href="${answerHref}"]`);

    let answerPageReached = false;

    if (await answerLink.count() > 0 && await answerLink.isVisible()) {
        await answerLink.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await answerLink.hover();
        await page.waitForTimeout(500);
        await answerLink.click();
        answerPageReached = true;
    } else if (await linkByHref.count() > 0 && await linkByHref.isVisible()) {
        console.log("Using href selector for Answer Link");
        await linkByHref.scrollIntoViewIfNeeded();
        await linkByHref.click();
        answerPageReached = true;
    } else {
        console.warn("Answer Today link not found, forcing navigation");
        await page.goto('https://cryptowalletsx.com/binance-wotd-answer-today', { waitUntil: 'domcontentloaded' });
        answerPageReached = true;
    }

    await page.waitForLoadState('domcontentloaded');
    await waitForAudio(page, 'nav_answers', 5);

    // Scene 5: Reveal Answers - Click ALL buttons for 3-8 letters
    console.log("Scene 5: Reveal Answers - Finding all reveal buttons");

    // Wait for page content to fully load (skeleton loaders to clear)
    try {
        await page.waitForSelector('button', { timeout: 10000, state: 'attached' });
        await page.waitForTimeout(2000); // Extra wait for React hydration
    } catch (e) {
        console.warn("Buttons didn't load properly");
    }

    // **Use multiple strategies to find ALL reveal buttons**
    // Strategy 1: Exact text match "Reveal Answers" (from AnswerDisplay.tsx line 107)
    const revealButtons = page.locator('button').filter({ hasText: 'Reveal Answers' });
    const count = await revealButtons.count();

    console.log(`Found ${count} reveal buttons using text locator`);

    if (count > 0) {
        // Click each button individually with graceful error handling
        for (let i = 0; i < count; i++) {
            const btn = revealButtons.nth(i);
            try {
                // Check if button is still attached to DOM
                const isAttached = await btn.isVisible().catch(() => false);
                if (!isAttached) {
                    console.warn(`Button ${i} not attached to DOM, skipping`);
                    continue;
                }

                console.log(`Attempting to click button ${i + 1}/${count}`);

                // Try scrolling with reduced timeout
                await btn.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {
                    console.warn(`Could not scroll to button ${i}, but continuing`);
                });

                await page.waitForTimeout(500);

                // Attempt click with timeout
                await btn.hover({ timeout: 2000 }).catch(() => { });
                await btn.click({ timeout: 3000 });
                console.log(`✓ Clicked reveal button ${i + 1}/${count}`);
                await page.waitForTimeout(1000); // Give time to reveal

            } catch (e) {
                const error = e as Error;
                console.warn(`✗ Skipping button ${i}: ${error.message}`);
                // Do NOT force-click as it may cause page closure
                // Just continue to next button
                continue;
            }
        }
    } else {
        console.warn("No reveal buttons found - trying alternative selectors");
        // Fallback: try partial text match
        const fallbackButtons = page.getByRole('button', { name: /Reveal/i });
        const fallbackCount = await fallbackButtons.count();
        console.log(`Fallback found ${fallbackCount} buttons`);

        for (let i = 0; i < fallbackCount; i++) {
            const btn = fallbackButtons.nth(i);
            try {
                if (await btn.isVisible()) {
                    await btn.scrollIntoViewIfNeeded({ timeout: 3000 });
                    await btn.hover();
                    await btn.click();
                    await page.waitForTimeout(1000);
                    console.log(`✓ Fallback clicked button ${i + 1}`);
                }
            } catch (e) {
                console.warn(`✗ Fallback button ${i} failed, skipping`);
                continue;
            }
        }
    }

    await waitForAudio(page, 'reveal_answers', 6);

    // Outro
    console.log("Scene 6: Outro");
    await waitForAudio(page, 'outro', 3);

    await context.close();
    await browser.close();

    // Rename the video file to a fixed name for processing
    const videoDir = 'video';
    if (fs.existsSync(videoDir)) {
        const files = fs.readdirSync(videoDir);
        // Get latest file (excluding the fixed name if it exists)
        const latestFile = files.filter(f => f.endsWith('.webm') && f !== 'recording.webm').sort((a, b) => {
            return fs.statSync(path.join(videoDir, b)).mtime.getTime() -
                fs.statSync(path.join(videoDir, a)).mtime.getTime();
        })[0];

        if (latestFile) {
            const fixedName = `recording.webm`;
            const fixedPath = path.join(videoDir, fixedName);
            // Delete existing if any
            if (fs.existsSync(fixedPath)) fs.unlinkSync(fixedPath);

            fs.renameSync(path.join(videoDir, latestFile), fixedPath);
            console.log(`Video saved to video/${fixedName}`);
        } else {
            console.error("No video file found in video directory!");
        }
    } else {
        console.error("Video directory not created!");
    }
});
