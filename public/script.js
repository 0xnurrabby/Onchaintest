// script.js — SDK integration + app orchestration (module)
import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
import { $, showToast, wireModal, wireCandle } from "/Melt-ui.js";

const DEFAULT_SESSION_MS = 25 * 60 * 1000;

// REQUIRED: replace with your Base.dev Builder Code (bc_...)
const BUILDER_CODE = "bc_REPLACE_ME";

// REQUIRED: replace with your Base address (tip destination)
const DEV_RECIPIENT = "0x0000000000000000000000000000000000000000";

// Base mainnet USDC
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_DECIMALS = 6;

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
  // transfer(address,uint256) selector = a9059cbb
  const sig = "a9059cbb";
  const addr = to.replace(/^0x/, "").padStart(64, "0");
  const amt = amountUnits.toString(16).padStart(64, "0");
  return "0x" + sig + addr + amt;
}

async function getDataSuffix() {
  // Builder Code attribution helper
  const mod = await import("https://esm.sh/ox/erc8021");
  const Attribution = mod?.Attribution ?? mod;
  return Attribution.toDataSuffix({ codes: [BUILDER_CODE] });
}

async function getProvider() {
  if (sdk?.wallet?.getEthereumProvider) {
    return await sdk.wallet.getEthereumProvider();
  }
  if (window.ethereum?.request) return window.ethereum;
  return null;
}

window.addEventListener("load", async () => {
  // detect environment (required)
  let isMini = false;
  try { isMini = await sdk.isInMiniApp(); } catch { isMini = false; }
  setEnvPill(isMini);

  // ALWAYS call ready() (required)
  try { await sdk.actions.ready(); } catch {}

  // wire UI
  wireCandle(DEFAULT_SESSION_MS);
  const modal = wireModal();

  const sendBtn = document.getElementById("sendTip");

  async function sendTip() {
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

    const units = BigInt(Math.floor(tipHuman * 10 ** USDC_DECIMALS));
    const data = encodeErc20Transfer(DEV_RECIPIENT, units);

    try {
      const dataSuffix = await getDataSuffix();

      await provider.request({
        method: "wallet_sendCalls",
        params: [{
          calls: [{ to: BASE_USDC, data }],
          capabilities: { dataSuffix }
        }]
      });

      modal.close();
      showToast("Tip request opened. Thank you ❤");
    } catch (e) {
      console.error(e);
      modal.close();
      showToast("Transaction rejected or failed.");
    }
  }

  sendBtn?.addEventListener("click", sendTip);

  // dev sanity
  try {
    console.assert(typeof encodeErc20Transfer("0x" + "1".repeat(40), 1n) === "string", "encodeErc20Transfer");
  } catch {}
});
