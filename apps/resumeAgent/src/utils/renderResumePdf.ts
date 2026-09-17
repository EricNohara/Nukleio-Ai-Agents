import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function renderResumePdf(html: string): Promise<Buffer> {
  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: [...chromium.args, "--hide-scrollbars", "--font-render-hinting=none"],
    defaultViewport: {
      width: 1275,
      height: 1650,
      deviceScaleFactor: 1,
    },
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "load"],
    });
    // Puppeteer 24.43 removed the network-idle lifecycle values from
    // setContent(). Waiting explicitly preserves the original behavior and is
    // supported across both the locally installed and lockfile versions.
    await page.waitForNetworkIdle({ idleTime: 500 });

    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
