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
    test.setTimeout(300000); // 5 minutes timeout for video recording
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

    // Scene 1: Direct Navigation & Intro
    console.log("Scene 1: Direct Navigation & Intro");
    await page.goto('https://cryptowalletsx.com/binance-wotd-solver', { waitUntil: 'domcontentloaded' });

    // Wait for content to load
    try {
        await page.waitForSelector('h1', { timeout: 10000 });
    } catch (e) {
        console.warn("H1 not found, continuing anyway...");
    }

    await waitForAudio(page, 'intro', 6);

    // Scene 2: Navigation to Solver (Already there, just highlight/scroll)
    console.log("Scene 2: Navigation to Solver (Already there)");
    await page.evaluate(() => window.scrollBy(0, 300));
    await waitForAudio(page, 'nav_solver', 4);

    // Scene 3: Solver Demo
    console.log("Scene 3: Solver Demo");
    // Select word length 6 if button exists
    const sixLetterBtn = page.getByRole('button', { name: '6 Letters' });
    if (await sixLetterBtn.count() > 0) {
        await sixLetterBtn.click();
    } else {
        console.warn("6 Letters button not found");
    }
    await page.waitForTimeout(1000);

    // Interact with tiles to change color (simulating user input)
    const tiles = page.locator('.tile-selector, button[aria-label*="Change color"]');
    if (await tiles.count() > 0) {
        await tiles.first().click(); // Green
        await page.waitForTimeout(500);
        await tiles.nth(1).click();
        await page.waitForTimeout(500);
        await tiles.nth(1).click(); // Yellow maybe?
    } else {
        console.warn("Tiles not found for interaction demo");
    }
    await waitForAudio(page, 'solver_demo', 8);

    // Scene 4: Answer Today
    console.log("Scene 4: Answer Today");
    // Scroll down to find the link
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);

    const answerLink = page.getByRole('link', { name: 'Binance WOTD Answer Today' });
    if (await answerLink.count() > 0) {
        await answerLink.click();
        await page.waitForLoadState('domcontentloaded');
    } else {
        console.warn("Answer Today link not found, scrolling to bottom");
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
    await waitForAudio(page, 'nav_answers', 5);

    // Scene 5: Reveal Answers
    console.log("Scene 5: Reveal Answers");
    // Locate reveal buttons.
    const revealButtons = page.getByRole('button', { name: /Reveal/i });
    const count = await revealButtons.count();
    if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); ++i) { // Limit to 3 interactions
            await revealButtons.nth(i).click();
            await page.waitForTimeout(1000); // Pause between reveals
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

    // Rename the video file to something predictable
    const videoDir = 'video';
    if (fs.existsSync(videoDir)) {
        const files = fs.readdirSync(videoDir);
        // Assuming the latest file is the one we just recorded
        const latestFile = files.filter(f => f.endsWith('.webm')).sort((a, b) => {
            return fs.statSync(path.join(videoDir, b)).mtime.getTime() -
                fs.statSync(path.join(videoDir, a)).mtime.getTime();
        })[0];

        if (latestFile) {
            fs.renameSync(path.join(videoDir, latestFile), path.join(videoDir, 'recording.webm'));
            console.log('Video saved to video/recording.webm');
        } else {
            console.error("No video file found in video directory!");
        }
    } else {
        console.error("Video directory not created!");
    }
});
