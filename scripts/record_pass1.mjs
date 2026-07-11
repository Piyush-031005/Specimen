import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  console.log("Starting browser...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  console.log("Loading page...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Wait 3s for entity birth
  await new Promise(r => setTimeout(r, 3000));
  
  console.log("Moving mouse rapidly (testing PASS 1 lack of physics)...");
  for (let i = 0; i < 20; i++) {
    await page.mouse.move(200 + i * 20, 360 + Math.sin(i) * 100);
    await new Promise(r => setTimeout(r, 50));
  }

  const screenshotPath = join(__dirname, '../previews/pass1_test.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Saved screenshot to ${screenshotPath}`);

  await browser.close();
})();
