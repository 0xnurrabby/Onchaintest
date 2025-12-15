// Melt-ui.js — UI helpers (no SDK; safe everywhere)
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

export function wireModal() {
  const overlay = $('#overlay');
  const close = $('#closeModal');
  const tipBtn = $('#tipBtn');
  const presetsWrap = $('#presets');
  const custom = $('#custom');
  const tipAmt = $('#tipAmt');

  let preset = 1;

  function renderPresets() {
    presetsWrap.innerHTML = '';
    PRESETS.forEach(v => {
      const b = document.createElement('button');
      b.className = 'chip' + ((preset === v && !custom.value) ? ' active' : '');
      b.textContent = '$' + v;
      b.addEventListener('click', () => {
        custom.value = '';
        preset = v;
        renderPresets();
        tipAmt.textContent = String(resolveTipAmount(preset, custom.value));
      });
      presetsWrap.appendChild(b);
    });
  }

  function open() {
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    renderPresets();
    tipAmt.textContent = String(resolveTipAmount(preset, custom.value));
  }

  function closeModal() {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }

  overlay.addEventListener('click', closeModal);
  document.querySelector('.modal').addEventListener('click', (e) => e.stopPropagation());
  close.addEventListener('click', closeModal);

  tipBtn.addEventListener('click', open);
  tipBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') open();
  });

  custom.addEventListener('input', () => {
    custom.value = sanitizeDecimalInput(custom.value);
    tipAmt.textContent = String(resolveTipAmount(preset, custom.value));
    // rerender to remove active chip
    renderPresets();
  });

  return {
    getTipAmount: () => resolveTipAmount(preset, custom.value),
    close: closeModal,
    open,
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
    // force reflow so next transition starts clean
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
