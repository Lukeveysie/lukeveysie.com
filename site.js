// ─────────────────────────────────────────────────────────────
// Luke Veysie — shared site script
// Nav + footer chrome, scroll reveals, custom cursor,
// grid/list view toggle, hero parallax + nav state, CT clock.
// ─────────────────────────────────────────────────────────────
(function () {
  var INK = '#0a0908', PAPER = '#F7F7F7', BLUE = '#0f33cc';
  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Blob badge image ─────────────────────────────────────
  // Uses the real blob PNG (transparent bg) so nav badge exactly
  // matches the brand mark at any background colour.
  function blobBadgeImg(root, size) {
    return '<img src="' + root + 'assets/blob-transparent.png" width="' + size + '" height="' + size + '" alt="LV" style="display:block;">';
  }

  // ── Nav ──────────────────────────────────────────────────
  function renderNav(activePage, dark) {
    var el = document.querySelector('[data-nav]');
    if (!el) return;
    var ROOT = document.body.getAttribute('data-root') || '';
    el.classList.add('nav');
    if (dark) el.classList.add('over-hero');
    el.innerHTML =
      '<a class="nav-brand" href="' + ROOT + 'index.html">' +
        '<span class="badge">' + blobBadgeImg(ROOT, 30) + '</span>' +
        '<span class="name">Luke Veysie</span>' +
      '</a>' +
      '<nav class="nav-links" aria-label="Primary">' +
        '<a href="' + ROOT + 'index.html"' + (activePage === 'work' ? ' class="active" aria-current="page"' : '') + '>Direct</a>' +
        '<a href="' + ROOT + 'edit.html"' + (activePage === 'edit' ? ' class="active" aria-current="page"' : '') + '>Edit</a>' +
        '<a href="' + ROOT + 'about.html"' + (activePage === 'about' ? ' class="active" aria-current="page"' : '') + '>About</a>' +
      '</nav>';
  }

  // Nav background state: solid once scrolled; dark variant over hero.
  function initNavState() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var hero = document.querySelector('.hero');
    function onScroll() {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        nav.classList.toggle('over-hero', en[0].isIntersecting);
      }, { rootMargin: '-90px 0px 0px 0px' }).observe(hero);
    }
  }

  // ── Footer: next-page CTA + bottom bar + Cape Town clock ─
  var NEXT = {
    work:  { href: 'edit.html',  label: 'Edit'  },
    edit:  { href: 'about.html', label: 'About' },
    about: { href: 'index.html', label: 'Direct' }
  };

  function renderFoot(activePage) {
    var el = document.querySelector('[data-foot]');
    if (!el) return;
    var ROOT = document.body.getAttribute('data-root') || '';
    // Per-page override (project pages send visitors back to Direct).
    var ovHref = document.body.getAttribute('data-next-href');
    var ovLabel = document.body.getAttribute('data-next-label');
    var next = (ovHref && ovLabel) ? { href: ovHref, label: ovLabel } : (NEXT[activePage] || NEXT.work);
    var eyebrow = (ovHref && ovLabel) ? 'Back to' : 'Next';
    el.classList.add('foot');
    el.innerHTML =
      '<a class="next-page" href="' + ROOT + next.href + '">' +
        '<span class="np-eyebrow sys">' + eyebrow + '</span>' +
        '<span class="np-title">' + next.label +
          '<span class="np-arrow" aria-hidden="true">&rarr;</span></span>' +
      '</a>' +
      '<div class="foot-bar">' +
        '<div class="left">&copy; 2026 Luke Veysie</div>' +
        '<div class="right">' +
          '<a href="mailto:lukeveysie@gmail.com">lukeveysie@gmail.com</a>' +
          '<span class="sep" aria-hidden="true">&middot;</span>' +
          '<a class="ig-link" href="https://instagram.com/luke_veysie" target="_blank" rel="noopener" aria-label="Luke Veysie on Instagram">' +
            '<svg class="ig-glyph" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5.2"/><circle cx="12" cy="12" r="4.2"/><circle class="ig-dot" cx="17.4" cy="6.6" r="1.25"/></svg>' +
            '<span>@luke_veysie</span>' +
          '</a>' +
        '</div>' +
      '</div>';
  }

  // ── Scroll reveals ───────────────────────────────────────
  function initReveals() {
    var nodes = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (el) { el.classList.add('in'); });
      return;
    }
    var fired = false;
    var io = new IntersectionObserver(function (entries) {
      fired = true;
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(nodes, function (el) { io.observe(el); });

    function safety() {
      if (fired) return;
      Array.prototype.forEach.call(nodes, function (el) { el.classList.add('in'); });
    }
    window.addEventListener('load', function () { setTimeout(safety, 1000); });
    setTimeout(safety, 2500);
  }

  // ── Custom cursor (fine pointers only) ───────────────────
  function initCursor() {
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
    document.documentElement.classList.add('fine');
    var c = document.createElement('div');
    c.className = 'lv-cursor';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<span>Play</span>';
    document.body.appendChild(c);

    var x = -100, y = -100, tx = x, ty = y, shown = false;
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { x = tx; y = ty; shown = true; c.classList.add('on'); }
    }, { passive: true });
    document.addEventListener('pointerleave', function () {
      shown = false; c.classList.remove('on');
    });

    (function loop() {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      c.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      requestAnimationFrame(loop);
    })();

    document.addEventListener('pointerover', function (e) {
      var tile = e.target.closest ? e.target.closest('.work-tile:not(.is-empty)') : null;
      var link = e.target.closest ? e.target.closest('a, button') : null;
      c.classList.toggle('is-play', !!tile);
      c.classList.toggle('is-link', !tile && !!link);
    });
  }

  // ── Grid / List view toggle ──────────────────────────────
  function initViewToggle() {
    var grid = document.querySelector('.work-grid.videos');
    var tog = document.querySelector('.view-toggle');
    if (!grid || !tog) return;
    var KEY = 'lv-view';
    function apply(v) {
      grid.classList.toggle('view-list', v === 'list');
      Array.prototype.forEach.call(tog.querySelectorAll('button'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-view') === v);
        b.setAttribute('aria-pressed', b.getAttribute('data-view') === v ? 'true' : 'false');
      });
    }
    var v = 'grid';
    try { v = localStorage.getItem(KEY) || 'grid'; } catch (e) {}
    apply(v);
    tog.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      var nv = b.getAttribute('data-view');
      try { localStorage.setItem(KEY, nv); } catch (err) {}
      apply(nv);
    });
  }

  // ── Hero: parallax fade + shader handoff ─────────────────
  function initHero() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var content = hero.querySelector('.hero-content');
    var stage = hero.querySelector('.hero-stage');
    var video = hero.querySelector('.hero-video');

    if (video && stage) {
      video.addEventListener('playing', function () {
        stage.classList.add('video-live');
      });
      if (!video.paused && video.readyState >= 2) stage.classList.add('video-live');
    }

    if (REDUCED || !content) return;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var yv = window.scrollY;
        if (yv <= window.innerHeight) {
          content.style.transform = 'translateY(' + (yv * 0.18) + 'px)';
          content.style.opacity = Math.max(0, 1 - yv / (window.innerHeight * 0.72));
        }
        ticking = false;
      });
    }, { passive: true });
  }

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var active = document.body.getAttribute('data-page') || 'work';
    var dark = document.body.getAttribute('data-nav-dark') === '1';
    renderNav(active, dark);
    renderFoot(active);
    initNavState();
    initReveals();
    initCursor();
    initViewToggle();
    initHero();
  });
})();
