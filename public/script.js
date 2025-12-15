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

// ✅ Base Account wallet_sendCalls requirements
const BASE_CHAIN_ID = "0x2105";     // Base mainnet (8453)
const SENDCALLS_VERSION = "2.0.0";  // required

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
  const mod = await import("https://esm.sh/ox/erc8021");
  const Attribution = mod?.Attribution ?? mod;
  return Attribution.toDataSuffix({ codes: [BUILDER_CODE] });
}

async function getProvider() {
  // Farcaster/Base Mini App provider
  if (sdk?.wallet?.getEthereumProvider) return await sdk.wallet.getEthereumProvider();
  // fallback (web)
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
  // detect environment (required)
  let isMini = false;
  try {
    isMini = await sdk.isInMiniApp();
  } catch {
    isMini = false;
  }
  setEnvPill(isMini);

  // ALWAYS call ready() (required)
  try {
    await sdk.actions.ready();
  } catch {}

  // wire UI
  wireCandle(DEFAULT_SESSION_MS);
  const modal = wireModal();
  const sendBtn = document.getElementById("sendTip");

  async function sendTipWithRitual() {
    try {
      if (!BUILDER_CODE || !BUILDER_CODE.startsWith("bc_")) {
        showToast("Set a valid BUILDER_CODE (bc_...) in script.js");
        return;
      }
      if (!DEV_RECIPIENT || !DEV_RECIPIENT.startsWith("0x") || DEV_RECIPIENT.length !== 42) {
        showToast("Set a valid DEV_RECIPIENT address in script.js");
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

      // USDC (6 decimals) -> base units (integer)
      const units = BigInt(Math.floor(tipHuman * 10 ** USDC_DECIMALS));
      const data = encodeErc20Transfer(DEV_RECIPIENT, units);

      // Builder code attribution
      const dataSuffix = await getDataSuffix();

      // ✅ Base Account requires `from`
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const from = accounts?.[0];
      if (!from) throw new Error("No wallet account");

      modal.setState("sending");

      // ✅ Correct Base Account wallet_sendCalls schema
      await provider.request({
        method: "wallet_sendCalls",
        params: [
          {
            version: SENDCALLS_VERSION,
            from,
            chainId: BASE_CHAIN_ID,
            atomicRequired: true,
            calls: [
              {
                to: BASE_USDC,
                value: "0x0",
                data,
              },
            ],
            capabilities: { dataSuffix },
          },
        ],
      });

      // success vibe
      modal.close();
      heartsBurst({ count: 28, spread: 240, rise: 360, duration: 1600 });
      showToast("Thank you for the warmth ❤");
    } catch (e) {
      console.error(e);
      // gentle fallback
      modal.setState("select");
      showToast("Maybe next time.");
    }
  }

  sendBtn?.addEventListener("click", sendTipWithRitual);
});
