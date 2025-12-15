// script.js — SDK integration + app orchestration (module)
import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
import { $, showToast, wireModal, wireCandle } from "/Melt-ui.js";

const DEFAULT_SESSION_MS = 1500000;
// Replace with your wallet (Base address)
const DEV_RECIPIENT = "0xe8bda2ed9d2fc622d900c8a76dc455a3e79b041f";
// Base mainnet USDC
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

window.addEventListener("load", async () => {
  // 1) Detect environment
  let isMini = false;
  try {
    isMini = await sdk.isInMiniApp();
  } catch (e) {
    // If sdk fails to load in a normal browser, keep isMini=false
    isMini = false;
  }

  // 2) Update UI labels
  const envText = document.getElementById('envText');
  const envDot = document.getElementById('envDot');
  if (envText && envDot) {
    envText.textContent = isMini ? 'Mini App' : 'Web Preview';
    envDot.classList.toggle('mini', isMini);
  }

  // 3) ALWAYS call ready()
  try {
    await sdk.actions.ready();
  } catch (e) {
    // Non-mini environment may throw; ignore.
  }

  // 4) Wire UI
  const modal = wireModal();
  const candle = wireCandle(DEFAULT_SESSION_MS);

  // 5) Tip send
  const sendBtn = document.getElementById('sendTip');
  sendBtn.addEventListener('click', async () => {
    if (!isMini) {
      modal.close();
      showToast('Tip works inside Base/Farcaster Mini App.');
      return;
    }

    // In mini app: open the native send sheet
    const amount = String(modal.getTipAmount());
    try {
      await sdk.actions.sendToken({
        tokenAddress: BASE_USDC,
        recipientAddress: DEV_RECIPIENT,
        amount,
      });
      modal.close();
      showToast('Opened tip sheet.');
    } catch (e) {
      modal.close();
      showToast('Could not open tip sheet.');
      console.error(e);
    }
  });

  // Nice touch: if user finished session and taps anywhere, reset
  document.body.addEventListener('click', (e) => {
    if (document.body.classList.contains('blackout')) {
      candle.reset();
      showToast('Reset.');
    }
  }, { passive: true });
});
