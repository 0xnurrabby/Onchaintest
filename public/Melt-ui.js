// Melt-ui.js — UI helpers (no SDK)
export const PRESETS = [1, 5, 10, 25];
export function $(sel) { return document.querySelector(sel); }

export function showToast(msg, ms = 2200) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => el.classList.remove('show'), ms);
}

export function sanitizeDecimalInput(raw) {
  const cleaned = String(raw || '').replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return parts[0] + '.' + parts.slice(1).join('');
}

export function resolveTipAmount(presetValue, customValue) {
  const c = Number(customValue);
  if (!Number.isNaN(c) && String(customValue).trim() !== '' && c > 0) return c;
  return presetValue ?? 1;
}

// Floating hearts burst (Web Animations API, no libs)
export function heartsBurst(opts = {}) {
  const parent = $('#hearts');
  if (!parent) return;

  const {
    count = 18,
    originX = window.innerWidth * 0.5,
    originY = window.innerHeight * 0.62,
    spread = 160,
    rise = 260,
    duration = 1200,
  } = opts;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'heart';
    el.textContent = '❤';

    const dx = (Math.random() - 0.5) * spread;
    const dy = - (Math.random() * rise + 90);
    const rot = (Math.random() - 0.5) * 50;
    const s0 = 0.6 + Math.random() * 0.6;
    const s1 = s0 + 0.2 + Math.random() * 0.4;

    el.style.left = originX + 'px';
    el.style.top = originY + 'px';
    el.style.fontSize = (16 + Math.random() * 16) + 'px';
    el.style.opacity = '0';

    parent.appendChild(el);

    const t0 = Math.random() * 160;
    const t1 = duration + Math.random() * 240;

    el.animate(
      [
        { transform: `translate(-50%, -50%) translate(0px,0px) rotate(0deg) scale(${s0})`, opacity: 0 },
        { offset: 0.12, opacity: 0.95 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${s1})`, opacity: 0 }
      ],
      { duration: t1, delay: t0, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'forwards' }
    ).onfinish = () => el.remove();
  }
}

export function wireModal() {
  const overlay = $('#overlay');
  const close = $('#closeModal');
  const tipBtn = $('#tipBtn');
  const presetsWrap = $('#presets');
  const custom = $('#custom');
  const tipAmt = $('#tipAmt');
  const send = $('#sendTip');
  const statusText = $('#statusText');
  const spinner = $('#spinner');

  let preset = 1;
  let state = 'select'; // select | preparing | confirm | sending

  function renderPresets() {
    presetsWrap.innerHTML = '';
    PRESETS.forEach(v => {
      const b = document.createElement('button');
      b.className = 'chip' + ((preset === v && !custom.value) ? ' active' : '');
      b.textContent = '$' + v;
      b.disabled = (state !== 'select');
      b.addEventListener('click', () => {
        if (state !== 'select') return;
        custom.value = '';
        preset = v;
        renderPresets();
        tipAmt.textContent = String(resolveTipAmount(preset, custom.value));
      });
      presetsWrap.appendChild(b);
    });
  }

  function setState(next) {
    state = next;
    const amt = resolveTipAmount(preset, custom.value);
    tipAmt.textContent = String(amt);

    const isSelect = state === 'select';

    if (isSelect) statusText.textContent = '';
    if (state === 'preparing') statusText.textContent = 'Preparing tip…';
    if (state === 'confirm') statusText.textContent = 'Confirm in wallet…';
    if (state === 'sending') statusText.textContent = 'Sending…';

    spinner.classList.toggle('show', !isSelect);

    custom.disabled = !isSelect;
    send.disabled = !isSelect;

    if (isSelect) send.innerHTML = `Send <span id="tipAmt">${amt}</span> USDC ❤`;
    else if (state === 'preparing') send.textContent = 'Preparing…';
    else if (state === 'confirm') send.textContent = 'Confirm in wallet…';
    else if (state === 'sending') send.textContent = 'Sending…';

    renderPresets();
  }

  function open() {
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    setState('select');
    renderPresets();
    tipAmt.textContent = String(resolveTipAmount(preset, custom.value));
  }

  function closeModal() {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    setState('select');
  }

  overlay.addEventListener('click', closeModal);
  document.querySelector('.modal').addEventListener('click', (e) => e.stopPropagation());
  close.addEventListener('click', closeModal);

  tipBtn.addEventListener('click', open);
  tipBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') open();
  });

  custom.addEventListener('input', () => {
    if (state !== 'select') return;
    custom.value = sanitizeDecimalInput(custom.value);
    tipAmt.textContent = String(resolveTipAmount(preset, custom.value));
    renderPresets();
  });

  return {
    getTipAmount: () => resolveTipAmount(preset, custom.value),
    close: closeModal,
    open,
    setState,
    getState: () => state,
  };
}

export function wireCandle(durationMs) {
  const shell = $('#shell');
  const candle = $('#candle');
  const hint = $('#hint');

  let phase = 'idle';
  let timer = null;

  function reset() {
    phase = 'idle';
    shell.classList.remove('burning');
    candle.style.transition = 'none';
    candle.style.transform = 'scaleY(1)';
    candle.style.filter = 'brightness(1)';
    void candle.offsetHeight;
    hint.textContent = 'Tap the candle to start • Tap again to reset';
    document.body.classList.remove('blackout');
    if (timer) { window.clearTimeout(timer); timer = null; }
  }

  function done() {
    phase = 'done';
    document.body.classList.add('blackout');
    if (timer) { window.clearTimeout(timer); timer = null; }
  }

  function start() {
    if (phase === 'done') return;
    phase = 'burning';
    shell.classList.add('burning');
    hint.textContent = 'Breathe. No numbers.';
    candle.style.transition = `transform ${durationMs}ms linear, filter ${durationMs}ms linear`;
    candle.style.transform = 'scaleY(0)';
    candle.style.filter = 'brightness(0.8)';
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(done, durationMs);
  }

  function tap() {
    if (phase === 'idle') start();
    else reset();
  }

  shell.addEventListener('click', tap);
  shell.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') tap();
  });

  reset();
  return { start, reset, done, getPhase: () => phase };
}
