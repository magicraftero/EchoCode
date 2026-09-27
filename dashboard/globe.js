/* EchoCode Dashboard — hero globe.
   A dot-matrix planet drawn on a 2D canvas: Fibonacci-distributed points,
   brighter on procedural "land", soft rim light and atmosphere. An arc links
   the historical case to the current finding, with a travelling pulse and
   sonar rings where it lands. Labels and positions come from dashboard.js
   via EchoGlobe.mount(); this file reads no report data. No dependencies. */

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const N = 5200;
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const TILT = 0.32;
  const ct = Math.cos(TILT), st = Math.sin(TILT);
  const L = norm([-0.45, -0.6, 0.66]);

  /* Precompute sphere points (lat, lon, land flag) */
  const LAT = new Float32Array(N), LON = new Float32Array(N), LAND = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const y = 1 - ((i + 0.5) / N) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * GOLDEN;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    LAT[i] = Math.asin(y);
    LON[i] = Math.atan2(x, z);
    const lat = LAT[i], lon = LON[i];
    const land = Math.sin(lon * 3 + Math.sin(lat * 4) * 1.4) * Math.cos(lat * 2.6 + Math.sin(lon * 2) * 0.8)
               + 0.45 * Math.sin(lon * 7.3 - lat * 5.1);
    LAND[i] = land > 0.22 ? 1 : 0;
  }

  let canvas, ctx, host, W = 0, H = 0, dpr = 1, nodes = [];
  let raf = 0, running = false, paused = false;
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };

  function norm(v) { const m = Math.hypot(...v); return v.map(a => a / m); }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function toVec(lat, lon) { return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]; }
  function toLatLon(v) { const m = Math.hypot(v[0], v[1], v[2]); return { lat: Math.asin(v[1] / m), lon: Math.atan2(v[0], v[2]) }; }
  function slerp(a, b, t) {
    const d = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const om = Math.acos(d);
    if (om < 1e-4) return a;
    const s = Math.sin(om), ka = Math.sin((1 - t) * om) / s, kb = Math.sin(t * om) / s;
    return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
  }

  function geometry(t) {
    const R = Math.max(150, Math.min(W * 0.36, (H - (host.dataset.clear ? +host.dataset.clear : H * 0.5)) / 1.3, 560));
    return {
      R,
      cx: W / 2 + ptr.sx * 24,
      cy: H - R * 0.3 + ptr.sy * 10,
      rot: introSpin(t) + Math.sin((t - (t0 ?? t)) * 0.00012) * 0.18 + ptr.sx * 0.5,
    };
  }

  /* Spins in on load and settles facing front (rot 0 = case markers centred) */
  let t0 = null;
  function introSpin(t) {
    if (reduceMotion) return 0;
    if (t0 === null) t0 = t;
    const k = Math.min(1, (t - t0) / 2400);
    return -2.4 * Math.pow(1 - k, 3);
  }

  /* Rotate (lat, lon) by spin then tilt; return screen point + depth */
  function project(lat, lon, g, alt = 0) {
    const a = lon - g.rot, k = 1 + alt;
    const x = Math.cos(lat) * Math.sin(a) * k;
    const y = Math.sin(lat) * k;
    const z = Math.cos(lat) * Math.cos(a) * k;
    const y2 = y * ct + z * st;
    const z2 = -y * st + z * ct;
    return { x: g.cx + x * g.R, y: g.cy + y2 * g.R, z: z2, r2: x * x + y2 * y2 };
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    W = rect.width; H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (!running || reduceMotion) draw(0);
  }

  function draw(t) {
    ptr.sx += (ptr.x - ptr.sx) * 0.05;
    ptr.sy += (ptr.y - ptr.sy) * 0.05;
    const g = geometry(t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    /* Atmosphere */
    const atm = ctx.createRadialGradient(g.cx, g.cy, g.R * 0.92, g.cx, g.cy, g.R * 1.55);
    atm.addColorStop(0, 'rgba(66,133,244,.30)');
    atm.addColorStop(0.35, 'rgba(161,66,244,.10)');
    atm.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = atm;
    ctx.fillRect(0, 0, W, H);

    /* Body */
    const body = ctx.createRadialGradient(g.cx - g.R * 0.35, g.cy - g.R * 0.55, g.R * 0.1, g.cx, g.cy, g.R);
    body.addColorStop(0, '#0d1b3a');
    body.addColorStop(0.7, '#05070f');
    body.addColorStop(1, '#000');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2); ctx.fill();

    /* Dots, bucketed by brightness to keep draw calls low */
    const buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < N; i++) {
      const p = project(LAT[i], LON[i], g);
      if (p.z <= 0.02 || p.y > H + 2) continue;
      const nx = (p.x - g.cx) / g.R, ny = (p.y - g.cy) / g.R;
      const light = Math.max(0, nx * L[0] + ny * L[1] + p.z * L[2]);
      const v = LAND[i] ? 0.25 + light * 0.75 : 0.06 + light * 0.18;
      const b = Math.min(4, (v * 5) | 0);
      const s = LAND[i] ? 0.9 + p.z * 1.1 : 0.6 + p.z * 0.45;
      buckets[b].rect(p.x - s / 2, p.y - s / 2, s, s);
    }
    const alphas = [0.24, 0.42, 0.62, 0.82, 1];
    buckets.forEach((path, b) => {
      ctx.fillStyle = `rgba(${b > 2 ? '232,240,254' : '174,203,250'},${alphas[b]})`;
      ctx.fill(path);
    });

    /* Rim light */
    const rim = ctx.createLinearGradient(g.cx - g.R, g.cy - g.R, g.cx + g.R * 0.6, g.cy + g.R * 0.2);
    rim.addColorStop(0, 'rgba(255,255,255,.55)');
    rim.addColorStop(0.5, 'rgba(138,180,248,.25)');
    rim.addColorStop(1, 'rgba(138,180,248,0)');
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2); ctx.stroke();

    if (nodes.length >= 2) drawEcho(t, g);
  }

  function drawEcho(t, g) {
    const [A, B] = nodes;
    const va = toVec(A.lat, A.lon), vb = toVec(B.lat, B.lon);
    const M = 72, pts = [];
    for (let i = 0; i <= M; i++) {
      const s = i / M, ll = toLatLon(slerp(va, vb, s));
      pts.push(project(ll.lat, ll.lon, g, Math.sin(Math.PI * s) * 0.32));
    }
    const vis = p => p.z > 0 || p.r2 > 1;

    /* Arc with Google blue → green gradient */
    const pa = pts[0], pb = pts[M];
    const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
    grad.addColorStop(0, A.color);
    grad.addColorStop(1, B.color);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    let pen = false;
    pts.forEach(p => {
      if (!vis(p)) { pen = false; return; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* Pulse */
    const cycle = 3600, s = (t % cycle) / cycle;
    if (s < 0.75) {
      const k = Math.floor((s / 0.75) * M);
      const p = pts[k];
      if (vis(p)) {
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = Math.max(0, k - 10); i <= k; i++) {
          const q = pts[i];
          if (i === Math.max(0, k - 10)) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        }
        ctx.stroke();
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16);
        glow.addColorStop(0, 'rgba(255,255,255,.95)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2); ctx.fill();
      }
    }

    /* Sonar rings at the echo target */
    for (let k = 0; k < 3; k++) {
      const age = ((t / 2400) + k / 3) % 1;
      ring(B, 0.015 + age * 0.3, g, (1 - age) * 0.7, B.color);
    }

    /* Markers + label chips */
    nodes.forEach((n, i) => {
      const p = project(n.lat, n.lon, g);
      if (p.z <= 0.05 || p.y > H - 8) return;
      const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14);
      halo.addColorStop(0, n.color);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2); ctx.stroke();

      if (W < 640) return;
      const dir = i === 0 ? -1 : 1;
      ctx.font = '600 12px Inter, -apple-system, system-ui, sans-serif';
      const w1 = ctx.measureText(n.label).width;
      ctx.font = '500 11px Inter, -apple-system, system-ui, sans-serif';
      const w2 = ctx.measureText(n.sub).width;
      const bw = Math.max(w1, w2) + 28, bh = 44;
      const bx = dir < 0 ? p.x - 22 - bw : p.x + 22, by = p.y - bh - 14;
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x + dir * 7, p.y - 5);
      ctx.lineTo(dir < 0 ? bx + bw : bx, by + bh / 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(28,28,30,.72)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 14); else ctx.rect(bx, by, bw, bh);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.stroke();
      ctx.fillStyle = n.color;
      ctx.beginPath(); ctx.arc(bx + 14, by + 16, 3, 0, Math.PI * 2); ctx.fill();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = '600 12px Inter, -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#f5f5f7';
      ctx.fillText(n.label, bx + 22, by + 16);
      ctx.font = '500 11px Inter, -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#a1a1a6';
      ctx.fillText(n.sub, bx + 14, by + 32);
    });
  }

  function ring(n, ang, g, alpha, color) {
    if (alpha <= 0.01) return;
    const c = toVec(n.lat, n.lon);
    const up = Math.abs(c[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = norm(cross(c, up)), v = cross(c, u);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI * 2;
      const q = [0, 1, 2].map(j => c[j] * ca + (u[j] * Math.cos(th) + v[j] * Math.sin(th)) * sa);
      const ll = toLatLon(q), p = project(ll.lat, ll.lon, g);
      if (p.z <= 0) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (!paused) draw(t);
  }

  window.EchoGlobe = {
    /** canvas: the <canvas>; opts.nodes: [{ lat, lon, label, sub, color }] (source first, echo target second) */
    mount(el, opts = {}) {
      canvas = el;
      host = el.parentElement;
      ctx = canvas.getContext('2d');
      nodes = opts.nodes || [];
      new ResizeObserver(resize).observe(host);
      resize();
      if (reduceMotion) return;
      host.addEventListener('pointermove', e => {
        const r = host.getBoundingClientRect();
        ptr.x = (e.clientX - r.left) / r.width - 0.5;
        ptr.y = (e.clientY - r.top) / r.height - 0.5;
      }, { passive: true });
      host.addEventListener('pointerleave', () => { ptr.x = ptr.y = 0; });
      running = true;
      raf = requestAnimationFrame(loop);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(raf);
        else raf = requestAnimationFrame(loop);
      });
    },
    /** Stop drawing while the hero is fully covered */
    pause(v) { paused = !!v; },
  };
})();
