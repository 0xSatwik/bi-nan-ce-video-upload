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

    // Scene 2/3: Solver Interaction
    console.log("Scene 3: Solver Demo - iterating all lengths");

    // Scroll to solver view
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(1000);

    const lengths = [3, 4, 5, 6, 7, 8];
    for (const len of lengths) {
        console.log(`Demoing length: ${len}`);
        // Click the length button
        const lenBtn = page.getByRole('button', { name: `${len} Letters` });
        if (await lenBtn.isVisible()) {
            await lenBtn.hover();
            await page.mouse.down(); await page.mouse.up(); // Explicit click for video
            await lenBtn.click();
            await page.waitForTimeout(1000); // wait for UI update
        } else {
            console.warn(`Button for ${len} letters not found`);
            continue;
        }

        // Type a random guess
        const randomWords: Record<number, string> = {
            3: "CRY", 4: "FUND", 5: "TRADE", 6: "WALLET", 7: "UPGRADE", 8: "PROTOCOL"
        };
        const wordToType = randomWords[len] || "TEST";

        // Focus input (assuming there is an input or we just type)
        // Trying to find the input field. Based on typical solver designs it might be a text input.
        const input = page.locator('input[type="text"]').first();
        if (await input.isVisible()) {
            await input.fill('');
            await input.pressSequentially(wordToType, { delay: 150 }); // Slow typing for video
            await page.waitForTimeout(500);
        }

        // Change colors of tiles (simulating user matching pattern)
        // We select the first row of tiles if available
        const tiles = page.locator('.tile-selector, button[aria-label*="Change color"], .grid button');
        // Note: Selector might need adjustment based on real DOM, using generic fallback
        const tileCount = await tiles.count();
        if (tileCount > 0) {
            // Click a few tiles to change colors
            for (let i = 0; i < Math.min(tileCount, len); i++) {
                const tile = tiles.nth(i);
                if (await tile.isVisible()) {
                    await tile.hover();
                    await tile.click(); // Green?
                    await page.waitForTimeout(300);
                    await tile.click(); // Yellow?
                    await page.waitForTimeout(300);
                }
            }
        }

        // Get suggestion/Solve
        // Look for buttons like "Solve", "Guess", "Enter"
        const solveBtn = page.getByRole('button', { name: /Solve|Enter|Guess|Add Guess/i }).first();
        if (await solveBtn.isVisible()) {
            await solveBtn.hover();
            await solveBtn.click();
            await page.waitForTimeout(1500); // Show results
        }

        await page.waitForTimeout(500);
    }

    await waitForAudio(page, 'solver_demo', 8);


    // Scene 4: Answer Today
    console.log("Scene 4: Answer Today");

    // Find link
    const answerLink = page.getByRole('link', { name: 'Binance WOTD Answer Today' });
    if (await answerLink.isVisible()) {
        await answerLink.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await answerLink.hover();
        await page.waitForTimeout(500);
        await answerLink.click();
        await page.waitForLoadState('domcontentloaded');
    } else {
        console.warn("Answer Today link not found, forcing navigation");
        await page.goto('https://cryptowalletsx.com/binance-wotd-answer-today', { waitUntil: 'domcontentloaded' });
    }

    await waitForAudio(page, 'nav_answers', 5);

    // Scene 5: Reveal Answers
    console.log("Scene 5: Reveal Answers");
    const revealButtons = page.getByRole('button', { name: /Reveal/i });
    const count = await revealButtons.count();

    if (count > 0) {
        // Prepare to scroll gently
        for (let i = 0; i < count; ++i) {
            const btn = revealButtons.nth(i);
            if (await btn.isVisible()) {
                await btn.scrollIntoViewIfNeeded();
                await page.waitForTimeout(500);
                await btn.hover();
                await btn.click();
                await page.waitForTimeout(1000); // Read time
            }
        }
    } else {
        console.warn("No reveal buttons found");
    }

    await waitForAudio(page, 'reveal_answers', 6);

    // Outro
    console.log("Scene 6: Outro");
    await waitForAudio(page, 'outro', 3);

    await context.close();
    await browser.close();

    // Rename the video file
    const videoDir = 'video';
    if (fs.existsSync(videoDir)) {
        const files = fs.readdirSync(videoDir);
        // Get latest file
        const latestFile = files.filter(f => f.endsWith('.webm')).sort((a, b) => {
            return fs.statSync(path.join(videoDir, b)).mtime.getTime() -
                fs.statSync(path.join(videoDir, a)).mtime.getTime();
        })[0];

        if (latestFile) {
            const newName = `recording_${Date.now()}.webm`;
            fs.renameSync(path.join(videoDir, latestFile), path.join(videoDir, newName));
            console.log(`Video saved to video/${newName}`);
        } else {
            console.error("No video file found in video directory!");
        }
    } else {
        console.error("Video directory not created!");
    }
});
