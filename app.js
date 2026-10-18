// DynamicNotch website: the Mac picker, the section glow, and the live island.
(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* private window */ } },
  };
  const clamp = (x, low = 0, high = 1) => Math.min(high, Math.max(low, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Download buttons go to the address in <meta name="dynamicnotch:download">.
  const downloadURL = document.querySelector('meta[name="dynamicnotch:download"]')?.content || '#download';
  document.querySelectorAll('a[data-download][href="#"]').forEach((a) => { a.href = downloadURL; });

  // ---------- Which Mac ----------

  const DEVICES = {
    pro: {
      finishes: [
        { id: 'pro-silver', name: 'Silver', swatch: '#e3e4e6' },
        { id: 'pro-spaceblack', name: 'Space Black', swatch: '#2f3033' },
      ],
      caption: (f) => `Shown on MacBook Pro in ${f.name}. MacBook Air looks just the same.`,
    },
    neo: {
      finishes: [
        { id: 'neo-blush', name: 'Blush', swatch: '#f4c9cc' },
        { id: 'neo-citrus', name: 'Citrus', swatch: '#ece88f' },
      ],
      caption: (f) => `Shown on MacBook Neo in ${f.name}. There's no notch, so DynamicNotch draws one in the menu bar.`,
    },
    display: {
      finishes: [{ id: 'display', name: 'Studio Display' }],
      caption: () => 'Shown on Studio Display. On an iMac or any display, DynamicNotch draws a notch in the menu bar.',
    },
  };

  let device = DEVICES[store.get('device')] ? store.get('device') : 'pro';
  let finishes = {};
  try { finishes = JSON.parse(store.get('finishes') || '{}') || {}; } catch { finishes = {}; }

  const currentFinish = () => {
    const list = DEVICES[device].finishes;
    return list.find((f) => f.id === finishes[device]) || list[0];
  };

  function nearViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.bottom > -innerHeight && rect.top < innerHeight * 2;
  }

  /// Swaps a picture with a quick fade, once the new one has loaded.
  function swap(img, src) {
    if (img.getAttribute('src') === src) return;
    if (!img.getAttribute('src') || !nearViewport(img) || reduceMotion) { img.src = src; return; }
    const next = new Image();
    next.src = src;
    img.classList.add('swapping');
    Promise.all([next.decode().catch(() => {}), wait(180)]).then(() => {
      img.src = src;
      requestAnimationFrame(() => requestAnimationFrame(() => img.classList.remove('swapping')));
    });
  }

  function showDevice() {
    const finish = currentFinish();
    document.body.dataset.device = device;
    document.querySelectorAll('[data-device]').forEach((button) => {
      button.setAttribute('aria-checked', String(button.dataset.device === device));
    });

    const box = document.querySelector('.finishes');
    box.replaceChildren();
    const list = DEVICES[device].finishes;
    if (list.length > 1) {
      for (const f of list) {
        const button = document.createElement('button');
        button.className = 'finish';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', String(f.id === finish.id));
        button.innerHTML = `<i style="--swatch:${f.swatch}"></i><span>${f.name}</span>`;
        button.addEventListener('click', () => {
          finishes[device] = f.id;
          store.set('finishes', JSON.stringify(finishes));
          showDevice();
        });
        box.append(button);
      }
    }

    document.querySelectorAll('img[data-render]').forEach((img) => {
      swap(img, `assets/renders/${finish.id}/${img.dataset.render}.avif`);
    });
    document.querySelector('.device-caption').textContent = DEVICES[device].caption(finish);
  }

  function chooseDevice(id) {
    if (!DEVICES[id]) return;
    device = id;
    store.set('device', id);
    showDevice();
  }

  document.querySelectorAll('[data-device]').forEach((button) => {
    button.addEventListener('click', () => chooseDevice(button.dataset.device));
  });
  // Arrow keys move between the options of each picker, as in a radio group.
  document.querySelectorAll('.segmented').forEach((group) => {
    group.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const buttons = [...group.querySelectorAll('button')];
      const index = buttons.findIndex((b) => b.dataset.device === device);
      const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      const next = buttons[(index + step + buttons.length) % buttons.length];
      chooseDevice(next.dataset.device);
      next.focus();
      event.preventDefault();
    });
  });
  document.querySelectorAll('[data-scroll-picker]').forEach((button) => {
    button.addEventListener('click', () => document.getElementById('picker').scrollIntoView({ block: 'center' }));
  });
  showDevice();

  // A small picker floats at the bottom while you look through the features.
  const pill = document.getElementById('device-pill');
  const featureList = document.getElementById('features');
  const cards = document.querySelector('.cards');
  function updatePill() {
    const top = featureList.getBoundingClientRect().top, end = cards.getBoundingClientRect().top;
    pill.classList.toggle('shown', top < innerHeight * 0.5 && end > innerHeight * 0.6);
  }

  // ---------- The glow and the notch bar follow the section you're in ----------

  const accentElements = [...document.querySelectorAll('[data-accent]')];
  const navSections = ['top', 'try', 'features', 'gestures', 'film', 'download'].map((id) => document.getElementById(id));
  const tabs = [...document.querySelectorAll('.notch-tab')];
  let scrollQueued = false;

  function updateScroll() {
    scrollQueued = false;
    updatePill();
    const line = innerHeight * 0.4;
    // The innermost element with an accent that spans the line.
    let accent = 'pink';
    for (const element of accentElements) {
      const rect = element.getBoundingClientRect();
      if (rect.top <= line && rect.bottom >= line) accent = element.dataset.accent;
    }
    if (document.body.dataset.accent !== accent) document.body.dataset.accent = accent;

    let current = 'top';
    for (const section of navSections) {
      if (section && section.getBoundingClientRect().top <= line) current = section.id;
    }
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = 'download';
    for (const tab of tabs) tab.classList.toggle('current', tab.dataset.nav === current);
  }
  addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  addEventListener('resize', updateScroll);
  updateScroll();

  // ---------- The live island ----------

  /// SwiftUI's `.spring(duration:bounce:)`, as in the app.
  function spring(t, duration, bounce) {
    if (t <= 0) return 0;
    const omega = (2 * Math.PI) / duration;
    const zeta = 1 - bounce;
    const damped = omega * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * omega * t) * (Math.cos(damped * t) + ((zeta * omega) / damped) * Math.sin(damped * t));
  }

  /// The app's NotchShape: flared top corners, continuous bottom corners.
  function notchPath(x, y, w, h, top, bottom) {
    const t = Math.min(top, w / 4, h / 2);
    const b = Math.max(0, Math.min(bottom, h - t, (w - 2 * t) / 2));
    const k = 0.62;
    const L = x, R = x + w, T = y, B = y + h;
    const n = (v) => v.toFixed(2);
    return `M${n(L)},${n(T)} Q${n(L + t)},${n(T)} ${n(L + t)},${n(T + t)} L${n(L + t)},${n(B - b)} ` +
      `C${n(L + t)},${n(B - b + b * k)} ${n(L + t + b - b * k)},${n(B)} ${n(L + t + b)},${n(B)} L${n(R - t - b)},${n(B)} ` +
      `C${n(R - t - b + b * k)},${n(B)} ${n(R - t)},${n(B - b + b * k)} ${n(R - t)},${n(B - b)} L${n(R - t)},${n(T + t)} ` +
      `Q${n(R - t)},${n(T)} ${n(R)},${n(T)} Z`;
  }

  const lerpRect = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });

  const CENTER = 380;
  const TAB_X = [154.3, 188.5, 222.3, 256.7];
  const BAR = 33;

  class Island {
    constructor(element, data) {
      this.el = element;
      this.states = data.states;
      for (const state of Object.values(this.states)) {
        if (state.bubble) state.bubbleRect = { x: state.bubble[0], y: state.bubble[1], w: state.bubble[2], h: state.bubble[3] };
      }
      // Load every state's picture up front, so switching never waits.
      this.pictures = new Set(Object.values(this.states).map((s) => s.image).filter(Boolean));
      for (const file of this.pictures) { const img = new Image(); img.src = `assets/island/${file}`; }

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'shape');
      svg.setAttribute('viewBox', '0 0 760 280');
      svg.setAttribute('aria-hidden', 'true');
      this.svg = svg;
      this.mainPath = document.createElementNS(svg.namespaceURI, 'path');
      this.bubblePath = document.createElementNS(svg.namespaceURI, 'path');
      svg.append(this.mainPath, this.bubblePath);
      this.mainClip = this.makeClip(4);
      this.bubbleClip = this.makeClip(2);
      this.hotspots = TAB_X.map((x, index) => {
        const spot = document.createElement('button');
        spot.className = 'hotspot';
        spot.setAttribute('aria-label', ['Now Playing', 'Timer', 'Clipboard', 'Fans'][index]);
        spot.style.cssText = `left:${x - 16}px;top:3px;width:32px;height:26px;display:none`;
        spot.addEventListener('click', (event) => { event.stopPropagation(); this.interacted(); this.openTab(index); });
        return spot;
      });
      element.append(svg, this.mainClip.root, this.bubbleClip.root, ...this.hotspots);

      this.pair = false;
      this.front = 'music';            // which activity is in the pill when two are running
      this.mode = 'compact';           // compact, expanded or alert
      this.tab = 0;
      this.hovering = false;
      this.current = 'idle';
      this.previous = 'idle';
      this.from = this.geometry('idle');
      this.started = -1e9;
      this.push = 0;
      this.animating = false;
      this.autoplay = true;

      this.listen();
      this.fit();
      addEventListener('resize', () => this.fit());
      this.draw(performance.now());
    }

    makeClip(count) {
      const root = document.createElement('div');
      root.className = 'clip';
      const layers = Array.from({ length: count }, () => {
        const layer = document.createElement('div');
        layer.className = 'layer';
        const img = document.createElement('img');
        img.alt = '';
        img.decoding = 'async';
        layer.append(img);
        root.append(layer);
        return { layer, img };
      });
      return { root, layers };
    }

    geometry(name) {
      const s = this.states[name];
      return { w: s.width, h: s.height, top: s.top, bottom: s.bottom, bubble: s.bubbleRect || null };
    }

    /// The shape between two states at progress p (springs past 1 and back).
    mix(a, b, p) {
      const g = { w: lerp(a.w, b.w, p), h: Math.max(16, lerp(a.h, b.h, p)), top: lerp(a.top, b.top, p), bottom: Math.max(4, lerp(a.bottom, b.bottom, p)) };
      const right = CENTER + g.w / 2;
      if (a.bubble && b.bubble) g.bubble = lerpRect(a.bubble, b.bubble, p);
      else if (b.bubble) {
        const tucked = { x: right - b.bubble.w - 2, y: 0, w: b.bubble.w, h: b.bubble.h * 0.7 };
        g.bubble = p > 0.04 ? lerpRect(tucked, b.bubble, p) : null;
      } else if (a.bubble) {
        const tucked = { x: right - a.bubble.w - 2, y: 0, w: a.bubble.w, h: a.bubble.h * 0.7 };
        g.bubble = p < 0.9 ? lerpRect(a.bubble, tucked, clamp(p)) : null;
      } else g.bubble = null;
      return g;
    }

    progress(now) {
      if (reduceMotion) return 1;
      const s = this.states[this.current];
      const [duration, bounce] = s.kind === 'expanded' || s.height > 60 ? [0.5, 0.32] : [0.42, 0.22];
      return spring((now - this.started) / 1000, duration, bounce);
    }

    /// Springs to a state; `push` slides the content sideways (1: in from the right).
    go(name, push = 0) {
      if (name === this.current) return;
      const now = performance.now();
      this.from = this.mix(this.from, this.geometry(this.current), this.progress(now));
      this.previous = this.current;
      this.current = name;
      this.push = push;
      this.started = now;
      if (!this.animating) {
        this.animating = true;
        requestAnimationFrame((t) => this.frame(t));
      }
    }

    frame(now) {
      this.draw(now);
      if (now - this.started < 1400 && !reduceMotion) requestAnimationFrame((t) => this.frame(t));
      else { this.animating = false; this.draw(this.started + 5000); }
    }

    draw(now) {
      const p = this.progress(now);
      const g = this.mix(this.from, this.geometry(this.current), p);
      const shape = notchPath(CENTER - g.w / 2, 0, g.w, g.h, g.top, g.bottom);
      this.mainPath.setAttribute('d', shape);
      this.mainClip.root.style.clipPath = `path('${shape}')`;
      if (g.bubble) {
        const bubble = notchPath(g.bubble.x, g.bubble.y, g.bubble.w, g.bubble.h, 6, g.bubble.h / 2);
        this.bubblePath.setAttribute('d', bubble);
        this.bubbleClip.root.style.clipPath = `path('${bubble}')`;
        this.bubbleClip.root.style.display = '';
      } else {
        this.bubblePath.setAttribute('d', '');
        this.bubbleClip.root.style.display = 'none';
      }
      const shadow = 0.55 * clamp((g.w - 185 - 24) / 40);
      this.svg.style.filter = shadow > 0.01 ? `drop-shadow(0 10px 28px rgba(0,0,0,${shadow.toFixed(2)}))` : 'none';

      const a = this.states[this.previous], b = this.states[this.current];
      const main = [], bubbles = [];
      if (a.image === b.image) {
        main.push({ s: b, op: 1 });
        if (b.bubbleRect && g.bubble) bubbles.push({ s: b, op: 1 });
      } else if (this.push) {
        const q = clamp(p);
        const out = clamp(1 - q / 0.55), into = clamp((q - 0.1) / 0.55);
        const dxOut = -this.push * g.w * 0.45 * p, dxIn = this.push * g.w * 0.45 * (1 - p);
        if (a.kind === 'expanded' && b.kind === 'expanded') {
          // The tab bar stays put while the page under it slides.
          main.push({ s: a, op: out, band: 'bar' }, { s: b, op: 1 - out, band: 'bar' },
            { s: a, op: out, dx: dxOut, band: 'page' }, { s: b, op: into, dx: dxIn, band: 'page' });
        } else {
          main.push({ s: a, op: out, dx: dxOut }, { s: b, op: into, dx: dxIn });
        }
        if (a.bubbleRect && g.bubble) bubbles.push({ s: a, op: out });
        if (b.bubbleRect && g.bubble) bubbles.push({ s: b, op: 1 - out });
      } else {
        // The old content blurs away as the new one comes into focus.
        const out = clamp(1 - p / 0.45), into = clamp((p - 0.18) / 0.5);
        const scaleOut = clamp(1 + (g.w / a.width - 1) * 0.4, 0.75, 1.3);
        const scaleIn = clamp(1 + (g.w / b.width - 1) * 0.4, 0.75, 1.3);
        main.push({ s: a, op: out, sc: scaleOut, blur: (1 - out) * 6 }, { s: b, op: into, sc: scaleIn, blur: (1 - into) * 6 });
        if (a.bubbleRect && g.bubble) bubbles.push({ s: a, op: b.bubbleRect ? out : clamp(1 - p / 0.5) });
        if (b.bubbleRect && g.bubble) bubbles.push({ s: b, op: a.bubbleRect ? 1 - out : clamp((p - 0.3) / 0.4) });
      }

      this.mainClip.layers.forEach((slot, i) => this.paintMain(slot, main[i]));
      this.bubbleClip.layers.forEach((slot, i) => this.paintBubble(slot, bubbles[i], g.bubble));

      const open = this.mode === 'expanded' && b.kind === 'expanded' && p > 0.6;
      this.hotspots.forEach((spot) => { spot.style.display = open ? '' : 'none'; });
    }

    paintMain({ layer, img }, spec) {
      if (!spec || !spec.s.image || spec.op <= 0.004) { layer.style.display = 'none'; return; }
      const { s, op, dx = 0, sc = 1, blur = 0, band } = spec;
      const left = CENTER + (CENTER - s.width / 2 + s.top - CENTER) * sc + dx;
      const width = (s.width - 2 * s.top) * sc;
      const height = s.height * sc;
      const top = band === 'page' ? BAR : 0;
      const bottom = band === 'bar' ? 280 - BAR : 280 - height;
      layer.style.display = '';
      layer.style.clipPath = `inset(${top}px ${(760 - left - width).toFixed(2)}px ${bottom.toFixed(2)}px ${left.toFixed(2)}px)`;
      this.setImage(img, s.image, `translate(${dx.toFixed(2)}px,0) scale(${sc.toFixed(4)})`, op, blur);
    }

    paintBubble({ layer, img }, spec, rect) {
      if (!spec || !rect || spec.op <= 0.004) { layer.style.display = 'none'; return; }
      const from = spec.s.bubbleRect;
      const sc = rect.h / from.h;
      const tx = rect.x - CENTER - (from.x - CENTER) * sc, ty = rect.y - from.y * sc;
      layer.style.display = '';
      layer.style.clipPath = 'none';
      this.setImage(img, spec.s.image, `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${sc.toFixed(4)})`, spec.op, 0);
    }

    setImage(img, file, transform, opacity, blur) {
      const src = `assets/island/${file}`;
      if (img.dataset.file !== file) { img.dataset.file = file; img.src = src; }
      img.style.transform = transform;
      img.style.opacity = opacity.toFixed(3);
      img.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : 'none';
    }

    // ----- What the island shows -----

    get base() {
      if (!this.pair) return 'music';
      return this.front === 'music' ? 'music-front' : 'timer-front';
    }

    tabState(index) {
      return ['hero', this.pair ? 'timer-running' : 'timer', 'clipboard', 'fans'][index];
    }

    open(index = this.front === 'timer' && this.pair ? 1 : 0) {
      clearTimeout(this.alertTimer);
      this.mode = 'expanded';
      this.tab = index;
      this.go(this.tabState(index));
      hint('Click a tab, or swipe left and right');
    }

    openTab(index) {
      if (index === this.tab) return;
      const push = index > this.tab ? 1 : -1;
      this.tab = index;
      this.go(this.tabState(index), push);
      hint('Swipe up, or click outside, to close');
    }

    close() {
      clearTimeout(this.alertTimer);
      this.mode = 'compact';
      this.go(this.hovering && !this.pair ? 'music-hover' : this.base);
    }

    alert(name) {
      clearTimeout(this.alertTimer);
      const show = () => {
        this.mode = 'alert';
        this.go(name);
        this.alertTimer = setTimeout(() => { this.mode = 'compact'; this.go(this.base); }, 2400);
      };
      if (this.mode === 'expanded') { this.close(); this.alertTimer = setTimeout(show, 380); } else show();
    }

    setPair(on) {
      this.pair = on;
      this.front = 'music';
      if (this.mode === 'expanded') { if (this.tab === 1) this.go(this.tabState(1)); } else if (this.mode === 'compact') this.go(this.base);
    }

    swipe(direction) {
      if (direction === 'down') { if (this.mode !== 'expanded') this.open(); return; }
      if (direction === 'up') { if (this.mode !== 'compact') this.close(); return; }
      const step = direction === 'left' ? 1 : -1;
      if (this.mode === 'expanded') {
        const next = this.tab + step;
        if (next >= 0 && next < 4) this.openTab(next);
      } else if (this.mode === 'compact' && this.pair) {
        this.front = this.front === 'music' ? 'timer' : 'music';
        this.go(this.base, step);
      }
    }

    // ----- Input -----

    /// The pointer's position in island points, and what it's over.
    locate(event) {
      const rect = this.el.getBoundingClientRect();
      const scale = rect.width / 760;
      const x = (event.clientX - rect.left) / scale, y = (event.clientY - rect.top) / scale;
      const g = this.mix(this.from, this.geometry(this.current), this.progress(performance.now()));
      const onMain = Math.abs(x - CENTER) <= g.w / 2 && y >= 0 && y <= g.h + 4;
      const onBubble = !!g.bubble && x >= g.bubble.x && x <= g.bubble.x + g.bubble.w && y >= 0 && y <= g.bubble.h + 4;
      return { onMain, onBubble, inside: onMain || onBubble };
    }

    interacted() {
      this.autoplay = false;
      clearTimeout(this.autoTimer);
    }

    listen() {
      const el = this.el;
      el.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        const { onMain, inside } = this.locate(event);
        el.style.cursor = inside ? 'pointer' : '';
        const hovering = onMain && this.mode === 'compact' && !this.pair;
        if (hovering !== this.hovering) {
          this.hovering = hovering;
          if (this.mode === 'compact' && !this.pair) this.go(hovering ? 'music-hover' : 'music');
        }
      });
      el.addEventListener('pointerleave', () => {
        el.style.cursor = '';
        if (this.hovering) { this.hovering = false; if (this.mode === 'compact' && !this.pair) this.go('music'); }
      });

      // Touch: a horizontal swipe switches; vertical movement scrolls the page.
      let touchStart = null;
      el.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY };
      });
      el.addEventListener('pointerup', (event) => {
        if (event.pointerType !== 'touch' || !touchStart) return;
        const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          this.interacted();
          this.swipe(dx < 0 ? 'left' : 'right');
          this.suppressClick = true;
        }
      });

      el.addEventListener('click', (event) => {
        if (this.suppressClick) { this.suppressClick = false; return; }
        this.interacted();
        const { onMain, onBubble, inside } = this.locate(event);
        if (!inside) { if (this.mode === 'expanded') this.close(); return; }
        if (this.mode === 'alert') { this.close(); return; }
        if (this.mode === 'compact') {
          if (onBubble && this.pair) this.open(this.front === 'music' ? 1 : 0);
          else if (onMain) this.open();
        }
      });
      document.getElementById('screen').addEventListener('click', (event) => {
        if (!this.el.contains(event.target) && this.mode === 'expanded') { this.interacted(); this.close(); }
      });

      // Two-finger swipes, one per gesture, as the app's SwipeRecognizer does.
      let dx = 0, dy = 0, fired = false, idle;
      el.addEventListener('wheel', (event) => {
        const { inside } = this.locate(event);
        if (!inside && this.mode !== 'expanded') return;
        event.preventDefault();
        clearTimeout(idle);
        idle = setTimeout(() => { dx = 0; dy = 0; fired = false; }, 180);
        if (fired) return;
        const scale = event.deltaMode === 1 ? 16 : 1;
        dx += event.deltaX * scale;
        dy += event.deltaY * scale;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 26) return;
        fired = true;
        this.interacted();
        // With natural scrolling, deltas run opposite to the fingers.
        if (Math.abs(dy) >= Math.abs(dx)) this.swipe(dy < 0 ? 'down' : 'up');
        else this.swipe(dx > 0 ? 'left' : 'right');
      }, { passive: false });

      el.addEventListener('keydown', (event) => {
        const actions = {
          ArrowDown: () => this.swipe('down'), Enter: () => (this.mode === 'expanded' ? this.close() : this.open()),
          ' ': () => (this.mode === 'expanded' ? this.close() : this.open()), ArrowUp: () => this.swipe('up'),
          Escape: () => this.close(), ArrowLeft: () => this.swipe('right'), ArrowRight: () => this.swipe('left'),
        };
        if (actions[event.key]) { event.preventDefault(); this.interacted(); actions[event.key](); }
      });
    }

    /// Scales the island down to fit narrow screens.
    fit() {
      const width = document.getElementById('screen').clientWidth;
      const scale = Math.min(1, (width - 20) / 600);
      this.el.style.transform = `scale(${scale.toFixed(3)})`;
    }

    /// When nobody's touching it: music comes on, then a few alerts drift by.
    start() {
      setTimeout(() => this.go('music'), 450);
      const sequence = ['volume', 'airpods', 'focus', 'downloaded'];
      let index = 0;
      const next = () => {
        if (!this.autoplay) return;
        if (this.mode === 'compact' && !this.hovering) this.alert(sequence[index++ % sequence.length]);
        this.autoTimer = setTimeout(next, 5200);
      };
      this.autoTimer = setTimeout(next, 3200);
    }
  }

  const hintElement = document.getElementById('hint');
  let hintsShown = 0;
  function hint(text) {
    if (!hintElement || hintsShown > 3) return;
    hintsShown += 1;
    hintElement.textContent = text;
    if (hintsShown > 3) setTimeout(() => { hintElement.style.opacity = '0'; }, 2500);
  }

  const islandElement = document.getElementById('island');
  fetch('assets/island/island.json')
    .then((response) => response.json())
    .then((data) => {
      const island = new Island(islandElement, data);
      document.querySelectorAll('[data-alert]').forEach((chip) => {
        chip.addEventListener('click', () => { island.interacted(); island.alert(chip.dataset.alert); });
      });
      const pair = document.getElementById('pair');
      pair.addEventListener('click', () => {
        island.interacted();
        const on = pair.getAttribute('aria-pressed') !== 'true';
        pair.setAttribute('aria-pressed', String(on));
        pair.lastChild.textContent = on ? 'Stop the timer' : 'Start a timer too';
        island.setPair(on);
        if (on) hint('Swipe left or right to swap them');
      });
      new IntersectionObserver(([entry], observer) => {
        if (entry.isIntersecting) { island.start(); observer.disconnect(); }
      }, { threshold: 0.4 }).observe(document.getElementById('screen'));
    })
    .catch(() => {
      // Opened from disk, where the page can't load its data: show a still instead.
      islandElement.innerHTML = '<img src="assets/island/hero.png" alt="The open island" style="width:760px;max-width:none">';
      hintElement.textContent = 'Open this page from a web server to try the island.';
    });
})();
