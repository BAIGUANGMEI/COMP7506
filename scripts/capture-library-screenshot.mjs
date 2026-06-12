import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import WebSocket from 'ws';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactsDir = path.join(root, '.artifacts');
const screenshotPath = path.join(artifactsDir, 'library-home.png');
const appUrl = process.env.APP_URL || 'http://localhost:8081/';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debuggingPort = 9223;
const profileDir = 'C:\\tmp\\studyvault-chrome-profile';

await mkdir(artifactsDir, { recursive: true });
await rm(profileDir, { recursive: true, force: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profileDir}`,
  '--window-size=390,844',
  'about:blank',
]);

try {
  const tab = await waitForTab();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await onceOpen(ws);

  let id = 0;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id;
      const onMessage = (raw) => {
        const message = JSON.parse(raw.toString());
        if (message.id !== messageId) {
          return;
        }
        ws.off('message', onMessage);
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result);
        }
      };

      ws.on('message', onMessage);
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send('Page.navigate', { url: appUrl });
  await waitForReady(send);

  const screenshot = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  ws.close();
  console.log(screenshotPath);
} finally {
  chrome.kill();
}

function waitForTab() {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const check = () => {
      http
        .get(`http://127.0.0.1:${debuggingPort}/json`, (response) => {
          let body = '';
          response.on('data', (chunk) => {
            body += chunk;
          });
          response.on('end', () => {
            try {
              const tabs = JSON.parse(body);
              const tab = tabs.find((item) => item.type === 'page');
              if (tab?.webSocketDebuggerUrl) {
                resolve(tab);
                return;
              }
            } catch {
              // Retry below.
            }
            retry();
          });
        })
        .on('error', retry);

      function retry() {
        if (Date.now() - started > 15000) {
          reject(new Error('Timed out waiting for Chrome DevTools.'));
          return;
        }
        setTimeout(check, 250);
      }
    };

    check();
  });
}

function onceOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}

async function waitForReady(send) {
  const started = Date.now();

  while (Date.now() - started < 20000) {
    const result = await send('Runtime.evaluate', {
      expression:
        "document.body && document.body.innerText.includes('Library') && document.body.innerText.includes('Recent Documents') && !document.body.innerText.includes('Preparing your local library')",
      returnByValue: true,
    });

    if (result.result?.value === true) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Timed out waiting for the library screen.');
}
