// script.js — SDK integration + app orchestration (module)
import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
import { $, showToast, wireModal, wireCandle, heartsBurst } from "/Melt-ui.js";

const DEFAULT_SESSION_MS = 25 * 60 * 1000;

// REQUIRED: replace with your Base.dev Builder Code (bc_...)
const BUILDER_CODE = "bc_ix198yaj";

// REQUIRED: replace with your Base address (tip destination)
const DEV_RECIPIENT = "0xe8bda2ed9d2fc622d900c8a76dc455a3e79b041f";

// Base mainnet USDC
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_DECIMALS = 6;

// ✅ REQUIRED for Coinbase/Keys: Base mainnet chainId (8453) as hex
const BASE_CHAIN_ID = "0x2105";

function setEnvPill(isMini) {
  const dot = $("#envDot");
  const txt = $("#envText");
  if (!dot || !txt) return;
  if (isMini) {
    dot.classList.add("mini");
    txt.textContent = "Mini App";
  } else {
    dot.classList.remove("mini");
    txt.textContent = "Web Preview";
  }
}

function encodeErc20Transfer(to, amountUnits) {
  const sig = "a9059cbb";
  const addr = to.replace(/^0x/, "").padStart(64, "0");
  const amt = amountUnits.toString(16).padStart(64, "0");
  return "0x" + sig + addr + amt;
}

async function getDataSuffix() {
  const mod = await import("https://esm.sh/ox/erc8021");
  const Attribution = mod?.Attribution ?? mod;
  return Attribution.toDataSuffix({ codes: [BUILDER_CODE] });
}

async function getProvider() {
  if (sdk?.wallet?.getEthereumProvider) return await sdk.wallet.getEthereumProvider();
  if (window.ethereum?.request) return window.ethereum;
  return null;
}

function burstFromModal() {
  const modalEl = document.querySelector(".modal");
  if (!modalEl) {
    heartsBurst();
    return;
  }
  const r = modalEl.getBoundingClientRect();
  heartsBurst({
    originX: r.left + r.width * 0.5,
    originY: r.top + r.height * 0.25,
    count: 22,
    duration: 1250,
    spread: 200,
    rise: 320,
  });
}

window.addEventListener("load", async () => {
  let isMini = false;
  try {
    isMini = await sdk.isInMiniApp();
  } catch {
    isMini = false;
  }
  setEnvPill(isMini);

  try {
    await sdk.actions.ready();
  } catch {}

  wireCandle(DEFAULT_SESSION_MS);
  const modal = wireModal();
  const sendBtn = document.getElementById("sendTip");

  async function sendTipWithRitual() {
    if (!BUILDER_CODE || BUILDER_CODE === "bc_REPLACE_ME") {
      showToast("Set BUILDER_CODE in script.js");
      return;
    }
    if (!DEV_RECIPIENT || DEV_RECIPIENT === "0x0000000000000000000000000000000000000000") {
      showToast("Set DEV_RECIPIENT in script.js");
      return;
    }

    const provider = await getProvider();
    if (!provider?.request) {
      showToast("Wallet not available here.");
      modal.close();
      return;
    }

    const tipHuman = Number(modal.getTipAmount());
    if (!Number.isFinite(tipHuman) || tipHuman <= 0) {
      showToast("Enter a valid amount.");
      return;
    }

    // 1) Preparing moment (hearts)
    modal.setState("preparing");
    burstFromModal();
    await new Promise((r) => setTimeout(r, 1100));

    // 2) Confirm in wallet (more hearts)
    modal.setState("confirm");
    burstFromModal();

    const units = BigInt(Math.floor(tipHuman * 10 ** USDC_DECIMALS));
    const data = encodeErc20Transfer(DEV_RECIPIENT, units);

    try {
      const dataSuffix = await getDataSuffix();

      modal.setState("sending");
      await provider.request({
        method: "wallet_sendCalls",
        params: [
          {
            // ✅ FIX: chainId required
            chainId: BASE_CHAIN_ID,

            calls: [{ to: BASE_USDC, data }],
            capabilities: { dataSuffix },
          },
        ],
      });

      modal.close();
      heartsBurst({ count: 28, spread: 240, rise: 360, duration: 1600 });
      showToast("Thank you for the warmth ❤");
    } catch (e) {
      console.error(e);
      modal.setState("select");
      showToast("Maybe next time.");
    }
  }

  sendBtn?.addEventListener("click", sendTipWithRitual);
});
