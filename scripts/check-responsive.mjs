import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const pageUrl = process.argv[2] || "http://localhost:3100/";
const screenshotPath = process.argv[3] || join(process.cwd(), "mobile-emulated-check.png");
const locale = process.argv[4] || "en";
const scrollSelector = process.argv[5];
const profile = await mkdtemp(join(tmpdir(), "hirzexa-chrome-"));
const port = 9223;
const chrome = spawn(chromePath, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "about:blank",
], { windowsHide: true, stdio: "ignore" });

let socket;
try {
  let target;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      target = (await response.json()).find((item) => item.type === "page");
      if (target) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!target) throw new Error("Chrome DevTools did not start");

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const callback = pending.get(message.id);
    if (callback) { pending.delete(message.id); callback(message); }
  });
  async function command(method, params = {}) {
    const id = ++nextId;
    const result = new Promise((resolve) => pending.set(id, resolve));
    socket.send(JSON.stringify({ id, method, params }));
    const message = await result;
    if (message.error) throw new Error(`${method}: ${message.error.message}`);
    return message.result;
  }

  await command("Page.enable");
  if (locale === "ar") {
    await command("Network.enable");
    await command("Network.setCookie", { name: "devtech_locale", value: "ar", url: pageUrl });
  }
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command("Page.navigate", { url: pageUrl });
  await new Promise((resolve) => setTimeout(resolve, 3500));
  if (scrollSelector) {
    await command("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(scrollSelector)})?.scrollIntoView({block: "start"})` });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const layout = await command("Runtime.evaluate", { expression: "({innerWidth, scrollWidth:document.documentElement.scrollWidth, title:document.title})", returnByValue: true });
  const shot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(screenshotPath, Buffer.from(shot.data, "base64"));
  console.log(layout.result.value);
  if (layout.result.value.scrollWidth > 390) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill();
  await new Promise((resolve) => setTimeout(resolve, 500));
  await rm(profile, { recursive: true, force: true });
}
