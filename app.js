/**
 * ============================================================
 *  ANTONIN LE CLEÏ — app.js v3
 *
 *  Δ Changes:
 *  ① Cursor: mousemove-based state machine (dot / bar / grow)
 *     Applies bar to ALL non-clickable text on the page.
 *  ② scrollToTop link: Lenis smooth scroll to top on click
 *  ③ About-transition: 3-phase scrubbed ScrollTrigger timeline
 *     Phase 1 — Band grows (scaleY) + dark word appears
 *     Phase 2 — Band holds at full screen
 *     Phase 3 — Band fades + ghost word appears on dark bg
 *  ④ Clock, nav, all other animations unchanged
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  if (typeof gsap === 'undefined' || typeof Lenis === 'undefined') {
    console.error('GSAP or Lenis not loaded.');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ─────────────────────────────────────────────────────────
  // 1. LOADER
  // ─────────────────────────────────────────────────────────
  initLoader();

  function initLoader() {
    const loader    = document.getElementById('loader');
    const loaderBar = document.getElementById('loaderBar');
    const loaderPct = document.getElementById('loaderPercent');

    loader.style.display = 'none';
    runHeroEntrance();
  }

  // ─────────────────────────────────────────────────────────
  // 2. LENIS — smooth scroll
  // ─────────────────────────────────────────────────────────
  const lenis = new Lenis({
    duration: 1.3,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    mouseMultiplier: 1.1,
    touchMultiplier: 2,
  });

  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anchor links — scroll to section using Lenis native element targeting.
  // We call ScrollTrigger.refresh() first so all pin-spacer positions are
  // up-to-date, then let Lenis compute the final scroll offset itself.
  document.querySelectorAll('a[href^="#"]:not(#scrollToTop)').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const id      = a.getAttribute('href').slice(1);
      const section = document.getElementById(id);
      if (!section) return;

      ScrollTrigger.refresh();

      lenis.scrollTo(section, {
        offset:   0,
        duration: 1.4,
        easing:   t => 1 - Math.pow(1 - t, 4),
      });
    });
  });

  // ─────────────────────────────────────────────────────────
  // Δ SCROLL-TO-TOP — Name link in header
  // ─────────────────────────────────────────────────────────
  const scrollToTopEl = document.getElementById('scrollToTop');
  if (scrollToTopEl) {
    scrollToTopEl.addEventListener('click', e => {
      e.preventDefault();
      lenis.scrollTo(0, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) });
    });
  }

  // ─────────────────────────────────────────────────────────
  // Δ 3. CURSOR — State machine via mousemove
  //
  //  States:
  //  'dot'  → 7×7px circle    (default — on empty areas)
  //  'bar'  → 2×22px rect     (on non-clickable text)
  //  'grow' → 11×11px circle  (on links, buttons, cards)
  //
  //  Uses mousemove (not mouseenter/leave) to avoid state
  //  conflicts when cursor moves between overlapping elements.
  // ─────────────────────────────────────────────────────────
  const cursorEl  = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursorDot');

  // Move cursor element to exact mouse position (no lag)
  document.addEventListener('mousemove', e => {
    gsap.set(cursorEl, { x: e.clientX, y: e.clientY });
    updateCursorState(e.target);
  });

  document.addEventListener('mouseleave', () => {
    gsap.to(cursorDot, { opacity: 0, duration: 0.2 });
  });
  document.addEventListener('mouseenter', () => {
    gsap.to(cursorDot, { opacity: 1, duration: 0.2 });
  });

  // ── Cursor state definitions ──────────────────────────────
  const STATES = {
    dot: {
      width: 7, height: 7, borderRadius: '50%',
      duration: 0.2, ease: 'power3.out',
    },
    bar: {
      width: 2, height: 22, borderRadius: '1px',
      duration: 0.18, ease: 'power3.out',
    },
    grow: {
      width: 11, height: 11, borderRadius: '50%',
      duration: 0.2, ease: 'power3.out',
    },
  };

  let activeCursorState = 'dot';

  // Tags we treat as "text" (cursor → bar)
  const TEXT_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
                              'TD', 'TH', 'SPAN', 'LI', 'BLOCKQUOTE']);

  // Selectors for interactive elements (cursor → grow)
  const CLICKABLE_SELECTOR = 'a, button, .project-card, .hero-thumb, .nav-link, label';

  function getDesiredState(target) {
    // Walk up from target — first match wins
    let el = target;
    while (el && el !== document.documentElement) {
      // Clickable always takes priority
      if (el.matches && el.matches(CLICKABLE_SELECTOR)) return 'grow';
      // Text elements (that are not wrappers of links)
      if (TEXT_TAGS.has(el.tagName)) {
        // If this text element is inside a link, treat as clickable
        if (el.closest(CLICKABLE_SELECTOR)) return 'grow';
        return 'bar';
      }
      el = el.parentElement;
    }
    return 'dot';
  }

  function updateCursorState(target) {
    const desired = getDesiredState(target);
    if (desired === activeCursorState) return; // No change — skip GSAP call
    activeCursorState = desired;
    gsap.to(cursorDot, STATES[desired]);
  }

  // ─────────────────────────────────────────────────────────
  // 4. CLOCK — time + date, English months
  // ─────────────────────────────────────────────────────────
  const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
                  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

  const timeEl = document.getElementById('clockTime');
  const dateEl = document.getElementById('clockDate');

  function updateClock() {
    const now  = new Date();
    let   h    = now.getHours();
    const m    = String(now.getMinutes()).padStart(2, '0');
    const ap   = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    timeEl.textContent = `${String(h).padStart(2, '0')}:${m} ${ap}`;
    dateEl.textContent = `${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]} ${now.getFullYear()} [CA]`;
  }

  updateClock();
  // Sync to next full minute then repeat every 60s
  const msToNextMin = (60 - new Date().getSeconds()) * 1000;
  setTimeout(() => { updateClock(); setInterval(updateClock, 60000); }, msToNextMin);

  // ─────────────────────────────────────────────────────────
  // 5. NAV — Active state + progress per section
  //
  //  Uses Lenis scroll event + exact math + clamping.
  //  getDocTop() walks offsetParent chain → true document position.
  //  Formula: pct = clamp(0, (scrollY - sectionTop) / sectionHeight * 100, 100)
  // ─────────────────────────────────────────────────────────

  function getDocTop(el) {
    let top = 0, node = el;
    while (node) { top += node.offsetTop; node = node.offsetParent; }
    return top;
  }

  const navSections = ['info', 'work', 'archive', 'contact'].map(id => ({
    id,
    section: document.getElementById(id),
    navEl:   document.querySelector(`[data-section="${id}"]`),
    fill:    document.querySelector(`[data-section="${id}"] .nav-progress-fill`),
  })).filter(s => s.section && s.navEl && s.fill);

  lenis.on('scroll', ({ scroll }) => {
    navSections.forEach(({ section, navEl, fill }) => {
      const top    = getDocTop(section);
      const height = section.offsetHeight;

      const raw = ((scroll - top) / height) * 100;
      const pct = Math.max(0, Math.min(100, raw));

      fill.style.width = pct + '%';

      if (scroll >= top && scroll < top + height) {
        navEl.classList.add('active');
      } else {
        navEl.classList.remove('active');
      }
    });
  });

  // ─────────────────────────────────────────────────────────
  // 6. HERO ENTRANCE
  // ─────────────────────────────────────────────────────────
  function runHeroEntrance() {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    tl.from('.hero-title-line', { yPercent: 110, opacity: 0, stagger: 0.1, duration: 1.4 }, 0);

    const introText = document.querySelector('.hero-intro-text');
    if (introText) {
      const raw = introText.innerHTML;
      introText.innerHTML = raw.replace(/([^\s<]+)/g, w =>
        w.startsWith('<') ? w :
        `<span class="ww" style="display:inline-block;overflow:hidden;vertical-align:bottom"><span class="wi" style="display:inline-block">${w}</span></span>`
      );
      tl.from(introText.querySelectorAll('.wi'), {
        yPercent: 100, opacity: 0, stagger: 0.022, duration: 0.8
      }, 0.4);
    }

    tl.from('.hero-scroll-cta', { opacity: 0, y: 8, duration: 0.6 }, 1.1);
    tl.from('.hero-thumb', { clipPath: 'inset(0 0 100% 0)', stagger: 0.08, duration: 0.95 }, 0.5);
    tl.from('.ui-header', { opacity: 0, y: -10, duration: 0.7 }, 0.1);
    tl.from('.nav-item',  { opacity: 0, x: -12, stagger: 0.05, duration: 0.55 }, 0.2);
  }

  // ─────────────────────────────────────────────────────────
  // 7. PORTAL OPENING
  // ─────────────────────────────────────────────────────────
  const portalTL = gsap.timeline({
    scrollTrigger: {
      trigger:      '#hero',
      pin:          true,
      pinSpacing:   true,
      scrub:        1,
      start:        'top top',
      end:          '+=150%',
      anticipatePin: 1,
      // onLeave intentionally absent — portal stays visible through the
      // GSAP spacer zone so the user never sees the white hero.
      // The portal is hidden only when #info reaches the viewport (below).
      onEnterBack: () => {
        // Scrolling back into the hero pin zone — restore portal
        gsap.set('#hero-portal', { autoAlpha: 1 });
      },
    }
  });

  portalTL
    .fromTo('#hero-portal',
      { clipPath: 'inset(50% 0 50% 0)' },
      { clipPath: 'inset(0% 0 0% 0)', ease: 'none' }
    )
    .fromTo('#portal-about',
      { opacity: 0 },
      { opacity: 1, ease: 'power2.in' },
      '<'
    );

  // ─────────────────────────────────────────────────────────
  // 7b. PORTAL HANDOFF — hide portal when #info reaches viewport top
  //
  //  At this exact moment the sticky #about-bg is visually identical
  //  to #portal-about → the transition is invisible.
  //  body bg is also set to #121212 so the nav column matches #info.
  // ─────────────────────────────────────────────────────────
  ScrollTrigger.create({
    trigger:     '#info',
    start:       'top top',
    onEnter:     () => {
      gsap.set('#hero-portal', { autoAlpha: 0 });
      gsap.set('body', { backgroundColor: '#121212' });
    },
    onLeaveBack: () => {
      // Scrolling back above #info — portal must cover the spacer again
      gsap.set('#hero-portal', { autoAlpha: 1 });
      gsap.set('body', { backgroundColor: 'var(--bg)' });
    },
  });

  // ─────────────────────────────────────────────────────────
  // 8. WATERMARK FADE — #about-bg fades as content scrolls over it
  // ─────────────────────────────────────────────────────────
  const aboutBgEl = document.getElementById('about-bg');
  if (aboutBgEl) {
    gsap.to(aboutBgEl, {
      opacity: 0.06,
      ease: 'power1.inOut',
      scrollTrigger: {
        trigger: '.about-content',
        start:   'top 75%',
        end:     'top 20%',
        scrub:   1,
      }
    });
  }

  document.querySelectorAll('.about-img').forEach(img => {
    const speed  = parseFloat(img.dataset.speed) || 1;
    const offset = (1 - speed) * 75;

    gsap.fromTo(img,
      { yPercent: offset * -1 },
      {
        yPercent: offset, ease: 'none',
        scrollTrigger: { trigger: '#info', start: 'top bottom', end: 'bottom top', scrub: 1.4 }
      }
    );

    gsap.fromTo(img,
      { clipPath: 'inset(100% 0 0 0)' },
      {
        clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: img, start: 'top 84%', toggleActions: 'play none none none' }
      }
    );
  });

  const aboutBio = document.querySelector('.about-bio');
  if (aboutBio) {
    gsap.set(aboutBio, { y: 22 });
    gsap.to(aboutBio, {
      opacity: 1, y: 0, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: aboutBio, start: 'top 80%' }
    });
  }

  document.querySelectorAll('.service-desc').forEach(el => {
    gsap.set(el, { y: 10 });
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.8, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  document.querySelectorAll('.service-item').forEach((item, i) => {
    gsap.from(item, {
      opacity: 0, x: -20, duration: 0.7, ease: 'expo.out', delay: i * 0.07,
      scrollTrigger: { trigger: item, start: 'top 86%' }
    });
  });

  // ─────────────────────────────────────────────────────────
  // 9. COUNTERS
  // ─────────────────────────────────────────────────────────
  document.querySelectorAll('.stat-number[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const obj = { val: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(obj, {
        val: target, duration: 1.5, ease: 'expo.out',
        onUpdate: () => { el.textContent = Math.floor(obj.val); }
      })
    });
  });

  // ─────────────────────────────────────────────────────────
  // 10. WORK — Scrubbed clip-path reveals
  // ─────────────────────────────────────────────────────────
  const cards = document.querySelectorAll('.project-card');

  cards.forEach((card, i) => {
    const imgWrap = card.querySelector('.project-img-wrap');
    const title   = card.querySelector('.project-title');
    const tag     = card.querySelector('.project-tag');
    const link    = card.querySelector('.project-link');
    const bg      = card.dataset.color || '#0a0a0a';

    if (i === 0) {
      gsap.from(imgWrap, {
        clipPath: 'inset(100% 0 0 0)', duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: card, start: 'top 88%' }
      });
    } else {
      gsap.fromTo(imgWrap,
        { clipPath: 'inset(100% 0 0 0)' },
        {
          clipPath: 'inset(0% 0 0 0)', ease: 'none',
          scrollTrigger: { trigger: card, start: 'top 78%', end: 'top 10%', scrub: 0.8 }
        }
      );
    }

    ScrollTrigger.create({
      trigger: card, start: 'top 50%', end: 'bottom 50%',
      onEnter:     () => gsap.to('body', { backgroundColor: bg, duration: 0.7, ease: 'power2.out' }),
      onLeaveBack: () => {
        const prev = cards[i - 1];
        gsap.to('body', { backgroundColor: prev ? prev.dataset.color : '#121212', duration: 0.7 });
      }
    });

    gsap.from([tag, title, link], {
      opacity: 0, y: 20, stagger: 0.07, duration: 0.8, ease: 'expo.out',
      scrollTrigger: { trigger: card, start: 'top 62%' }
    });
  });

  ScrollTrigger.create({
    trigger: '#archive', start: 'top 55%',
    onEnter: () => gsap.to('body', { backgroundColor: '#0a0a0a', duration: 0.7 })
  });

  // ─────────────────────────────────────────────────────────
  // 11. ARCHIVE
  // ─────────────────────────────────────────────────────────
  const archiveSub = document.querySelector('.archive-subtitle');
  if (archiveSub) {
    gsap.set(archiveSub, { y: 10 });
    gsap.to(archiveSub, {
      opacity: 1, y: 0, duration: 0.8, ease: 'expo.out',
      scrollTrigger: { trigger: archiveSub, start: 'top 85%' }
    });
  }

  gsap.from('.archive-row', {
    opacity: 0, y: 14, stagger: 0.055, duration: 0.6, ease: 'expo.out',
    scrollTrigger: { trigger: '.archive-table', start: 'top 80%' }
  });

  // ─────────────────────────────────────────────────────────
  // 12. CONTACT
  // ─────────────────────────────────────────────────────────
  document.querySelectorAll('.contact-title-line').forEach((line, i) => {
    gsap.from(line, {
      yPercent: 100, opacity: 0, duration: 1.1, ease: 'expo.out', delay: i * 0.1,
      scrollTrigger: { trigger: '#contact', start: 'top 70%' }
    });
  });

  gsap.from('.contact-email', {
    opacity: 0, y: 20, duration: 0.9, ease: 'expo.out',
    scrollTrigger: { trigger: '.contact-email', start: 'top 85%' }
  });

  gsap.from('.social-link', {
    opacity: 0, y: 10, stagger: 0.06, duration: 0.6, ease: 'expo.out',
    scrollTrigger: { trigger: '.contact-socials', start: 'top 90%' }
  });

  gsap.from('.site-footer', {
    opacity: 0, duration: 0.8, ease: 'expo.out',
    scrollTrigger: { trigger: '.site-footer', start: 'top 95%' }
  });

  // ─────────────────────────────────────────────────────────
  // 13. MAGNETIC — contact email
  // ─────────────────────────────────────────────────────────
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r  = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width  / 2);
      const dy = e.clientY - (r.top  + r.height / 2);
      gsap.to(el, { x: dx * 0.28, y: dy * 0.28, duration: 0.3, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    });
  });

  // ─────────────────────────────────────────────────────────
  // 14. SECTION EYEBROWS
  // ─────────────────────────────────────────────────────────
  gsap.utils.toArray('.section-eyebrow').forEach(el => {
    gsap.from(el, {
      opacity: 0, y: 10, duration: 0.6, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // ─────────────────────────────────────────────────────────
  // 15. PROJECT VIDEOS — restart on hover
  // ─────────────────────────────────────────────────────────
  document.querySelectorAll('.project-card').forEach(card => {
    const video = card.querySelector('video');
    if (!video) return;
    video.pause();
    card.addEventListener('mouseenter', () => {
      video.currentTime = 0;
      video.play();
    });
    card.addEventListener('mouseleave', () => {
      video.pause();
    });
  });

  // ─────────────────────────────────────────────────────────
  // REFRESH
  // ─────────────────────────────────────────────────────────
  window.addEventListener('load', () => ScrollTrigger.refresh());
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
  });

});
