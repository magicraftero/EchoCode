/* EchoCode landing page — same interaction model as the dashboard:
   word-by-word headline, blur-fade reveals, theme morph per section,
   hero fade as the sheet slides over it, cursor-lit cards, Material ripple.
   Everything degrades to a static page. */
(() => {
  const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const secs = [...document.querySelectorAll('.sheet [data-theme]')];

  /* Headline: split into words that rise in one by one */
  document.querySelectorAll('.hero-title .split').forEach(line => {
    const words = line.textContent.trim().split(/\s+/);
    line.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ');
  });

  /* Reveal on scroll, staggered within each parent */
  const items = [...document.querySelectorAll('[data-reveal]')];
  const groups = new Map();
  items.forEach(el => {
    const n = groups.get(el.parentElement) || 0;
    el.style.setProperty('--d', `${Math.min(n, 6) * 90}ms`);
    groups.set(el.parentElement, n + 1);
  });
  if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    items.forEach(el => io.observe(el));
  }

  /* Scroll frame: hero progress, section theme, scrub words */
  const scrub = document.querySelector('.scrub');
  const words = scrub ? [...scrub.children] : [];
  const dockItems = [...document.querySelectorAll('.dock-item[data-target]')];
  let queued = false, lastTheme = '', lastActive = '';
  function frame() {
    queued = false;
    const vh = innerHeight;
    const p = Math.min(1, Math.max(0, scrollY / vh));
    hero.style.setProperty('--p', p.toFixed(4));

    /* the last section whose top has passed 60% of the viewport sets the theme */
    let cur = null;
    secs.forEach(s => { if (s.getBoundingClientRect().top <= vh * 0.6) cur = s; });
    const theme = cur ? cur.dataset.theme : 'dark';
    if (theme !== lastTheme) { lastTheme = theme; root.dataset.theme = theme; }

    /* dock: light up the section in view (the footer keeps the last one) */
    let active = 'top';
    secs.forEach(s => { if (s.id && s.getBoundingClientRect().top <= vh * 0.6) active = s.id; });
    if (active !== lastActive) {
      lastActive = active;
      dockItems.forEach(a => a.classList.toggle('active', a.dataset.target === active));
    }

    if (scrub) {
      const r = scrub.getBoundingClientRect();
      const q = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (r.height + vh * 0.35)));
      const lit = REDUCED_MOTION ? words.length : Math.round(q * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }
  }
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  frame();

  /* Echo arc: from the learned fix to the candidate finding */
  const body = document.querySelector('.trail-body');
  const arc = document.querySelector('.echo-arc');
  const from = document.querySelector('.c-source .node');
  const to = document.querySelector('.c-target .node');
  const placeArc = () => {
    if (!body || !arc || !from || !to) return;
    const b = body.getBoundingClientRect();
    const f = from.getBoundingClientRect();
    const t = to.getBoundingClientRect();
    if (!f.width) return;
    const x = f.left + f.width / 2 - b.left;
    const y1 = f.top + f.height / 2 - b.top;
    const y2 = t.top + t.height / 2 - b.top;
    arc.setAttribute('viewBox', `0 0 ${x} ${b.height}`);
    arc.style.cssText = `width:${x}px;height:${b.height}px`;
    arc.querySelector('path').setAttribute('d', `M${x - 7} ${y1} C 4 ${y1 + 12}, 4 ${y2 - 12}, ${x - 7} ${y2}`);
  };
  placeArc();
  addEventListener('resize', placeArc);
  document.fonts?.ready.then(placeArc);
  /* the card moves while revealing; place again once it settles */
  document.querySelector('.trail')?.addEventListener('transitionend', placeArc);

  /* Cursor-lit cards */
  document.addEventListener('pointermove', e => {
    const card = e.target.closest?.('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  /* Material ripple on buttons and dock items */
  document.addEventListener('pointerdown', e => {
    const host = e.target.closest('.gbtn, .dock-item');
    if (!host || REDUCED_MOTION) return;
    const r = host.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const rip = document.createElement('span');
    rip.className = 'ripple';
    rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    host.appendChild(rip);
    rip.addEventListener('animationend', () => rip.remove());
  });

  /* 1–6 jump to sections, as on the dashboard */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    const n = parseInt(e.key, 10);
    const item = dockItems[n - 1];
    if (!item) return;
    e.preventDefault();
    document.getElementById(item.dataset.target)?.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
  });

  /* Copy terminal commands (comments stripped) */
  document.querySelectorAll('[data-copy]').forEach(btn => {
    const label = btn.querySelector('span');
    btn.addEventListener('click', async () => {
      const src = document.getElementById(btn.dataset.copy);
      const text = src.innerText.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).join('\n');
      try {
        await navigator.clipboard.writeText(text);
        label.textContent = 'Copied';
        btn.classList.add('done');
        setTimeout(() => { label.textContent = 'Copy'; btn.classList.remove('done'); }, 1600);
      } catch { /* clipboard blocked: the text stays selectable */ }
    });
  });
})();
