import { test, chromium } from '@playwright/test';
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
async function waitForAudio(page: any, sceneId: string, defaultDuration: number = 5000) {
    const duration = (timing[sceneId] || defaultDuration) * 1000;
    console.log(`Playing scene ${sceneId} for ${duration}ms`);
    await page.waitForTimeout(duration);
}

test('record video', async () => {
    const browser = await chromium.launch({
        headless: false, // Must be false to capture headful events if needed, but for recording we might need a specific setup or just use traces
        // In a real CI environment with xvfb, this works. For strictly recording to file via Playwright,
        // we usually use the `recordVideo` context option.
    });

    const context = await browser.newContext({
        recordVideo: {
            dir: 'video',
            size: { width: 1920, height: 1080 }
        },
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US'
    });

    const page = await context.newPage();

    // Scene 1: Intro & Search
    console.log("Scene 1: Intro & Search");
    await page.goto('https://www.google.com');
    const searchInput = page.locator('textarea[name="q"]');
    await searchInput.fill('cryptowalletsx');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000); // Visual pause

    const firstResult = page.locator('h3').first();
    await firstResult.click();
    await page.waitForLoadState('networkidle');
    await waitForAudio(page, 'intro', 6);

    // Scene 2: Navigation to Solver
    console.log("Scene 2: Navigation to Solver");
    // Assuming standard header structure based on knowledge
    await page.getByRole('link', { name: 'Binance WOTD Solver' }).click();
    await page.waitForLoadState('networkidle');
    await waitForAudio(page, 'nav_solver', 4);

    // Scene 3: Solver Demo
    console.log("Scene 3: Solver Demo");
    // Select word length 6
    await page.getByRole('button', { name: '6 Letters' }).click();
    await page.waitForTimeout(1000);

    // Interact with tiles to change color (simulating user input)
    // Need to identify tiles robustly. Assuming a grid.
    // This might need adjustment based on actual DOM.
    const tiles = page.locator('.tile-selector, button[aria-label*="Change color"]');
    if (await tiles.count() > 0) {
        await tiles.first().click(); // Green
        await page.waitForTimeout(500);
        await tiles.nth(1).click();
        await page.waitForTimeout(500);
        await tiles.nth(1).click(); // Yellow maybe?
    }
    await waitForAudio(page, 'solver_demo', 8);

    // Scene 4: Answer Today
    console.log("Scene 4: Answer Today");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.getByRole('link', { name: 'Binance WOTD Answer Today' }).click();
    await page.waitForLoadState('networkidle');
    await waitForAudio(page, 'nav_answers', 5);

    // Scene 5: Reveal Answers
    console.log("Scene 5: Reveal Answers");
    // Locate reveal buttons.
    const revealButtons = page.getByRole('button', { name: /Reveal/i });
    const count = await revealButtons.count();
    for (let i = 0; i < count; ++i) {
        await revealButtons.nth(i).click();
        await page.waitForTimeout(1000); // Pause between reveals
    }
    await waitForAudio(page, 'reveal_answers', 6);

    // Outro
    console.log("Scene 6: Outro");
    await waitForAudio(page, 'outro', 3);

    await context.close();
    await browser.close();

    // Rename the video file to something predictable
    // Playwright creates a random name.
    const videoDir = 'video';
    const files = fs.readdirSync(videoDir);
    // Assuming the latest file is the one we just recorded
    // In a clean run, it's the only one.
    const latestFile = files.filter(f => f.endsWith('.webm')).sort((a, b) => {
        return fs.statSync(path.join(videoDir, b)).mtime.getTime() -
            fs.statSync(path.join(videoDir, a)).mtime.getTime();
    })[0];

    if (latestFile) {
        fs.renameSync(path.join(videoDir, latestFile), path.join(videoDir, 'recording.webm'));
        console.log('Video saved to video/recording.webm');
    }
});
