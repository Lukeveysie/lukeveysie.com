// ─────────────────────────────────────────────────────────────
// Project template — swipeable stills gallery
// Filmstrip of uniform-height, variable-width photos. `current` is the
// single source of truth for the selected image: arrows, dots and the
// counter all read/write it directly, so they never disagree. Native
// scroll/drag detection only overrides `current` when the USER moves the
// strip (guarded by `animating`), which keeps dots aligned and makes the
// arrows advance predictably even where trailing images bunch against
// the scroll limit.
// ─────────────────────────────────────────────────────────────
(function () {
  var gallery = document.querySelector('.gallery');
  if (!gallery) return;

  var track  = gallery.querySelector('.gallery-track');
  var slides = Array.prototype.slice.call(track.querySelectorAll('.gallery-slide'));
  var dotsEl = gallery.querySelector('.gallery-dots');
  var arrows = Array.prototype.slice.call(gallery.querySelectorAll('.gallery-arrow'));
  var label  = gallery.querySelector('.gallery-head .label');
  var prefix = (label && label.getAttribute('data-prefix')) || 'Stills';
  if (!slides.length) return;

  var current = 0;
  var animating = false;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clampIndex(i) { return Math.max(0, Math.min(slides.length - 1, i)); }

  // Build dots
  slides.forEach(function (_, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Go to image ' + (i + 1));
    if (i === 0) b.className = 'on';
    b.addEventListener('click', function () { stopAuto(); goTo(i); });
    dotsEl.appendChild(b);
  });
  var dots = Array.prototype.slice.call(dotsEl.children);

  // Scroll position that brings slide i to the left edge of the strip
  // (clamped to the scrollable range). Left-edge alignment — rather than
  // centring — guarantees that slide 0 is the natural start position and
  // that every step produces real movement, even for the first click.
  function targetFor(i) {
    var t = slides[i].offsetLeft;
    return Math.max(0, Math.min(track.scrollWidth - track.clientWidth, t));
  }

  // Refresh dots / arrows / counter purely from `current` — the one source
  // of truth — so the selected dot always matches the chosen image.
  function update() {
    dots.forEach(function (d, di) { d.classList.toggle('on', di === current); });
    arrows.forEach(function (a) {
      var dir = parseInt(a.getAttribute('data-dir'), 10);
      a.disabled = (dir < 0 && current === 0) || (dir > 0 && current === slides.length - 1);
    });
    if (label) label.textContent = prefix + ' — ' + pad(current + 1) + ' / ' + pad(slides.length);
  }

  // Animate the strip to a scroll position. scroll-behavior:smooth and
  // scroll-snap-type:mandatory both fight programmatic scrollLeft writes,
  // so disable them for the duration and animate by hand. Driven by
  // setTimeout (not rAF) so it also runs in throttled iframe contexts.
  function animateScrollTo(target) {
    clearTimeout(animateScrollTo._t);
    track.style.scrollBehavior = 'auto';
    track.style.scrollSnapType = 'none';
    animating = true;
    var start = track.scrollLeft;
    var dist = target - start;
    function done() {
      track.scrollLeft = target;
      track.style.scrollBehavior = '';
      track.style.scrollSnapType = '';
      // Let the snap engine settle before re-enabling scroll detection.
      setTimeout(function () { animating = false; }, 60);
    }
    if (Math.abs(dist) < 1) { done(); return; }
    var t0 = Date.now(), dur = 420;
    (function step() {
      var p = Math.min(1, (Date.now() - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      track.scrollLeft = start + dist * e;
      if (p < 1) { animateScrollTo._t = setTimeout(step, 16); }
      else { done(); }
    })();
  }

  // Navigate to an explicit index: set state first (so the UI is correct
  // even if the strip is already at its scroll limit), then scroll.
  function goTo(i) {
    current = clampIndex(i);
    update();
    animateScrollTo(targetFor(current));
  }

  // Which slide's left edge is nearest the current scroll position — used
  // only to track the user's own dragging / native swiping, never during
  // our own animation.
  function computeCurrent() {
    var sl = track.scrollLeft;
    var best = 0, bestDist = Infinity;
    slides.forEach(function (s, i) {
      var d = Math.abs(s.offsetLeft - sl);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  var scrollT = null;
  track.addEventListener('scroll', function () {
    if (animating || scrollT) return;
    scrollT = setTimeout(function () {
      scrollT = null;
      if (animating) return;
      var i = computeCurrent();
      if (i !== current) { current = i; update(); }
    }, 60);
  });

  arrows.forEach(function (a) {
    a.addEventListener('click', function () {
      stopAuto();
      goTo(current + parseInt(a.getAttribute('data-dir'), 10));
    });
  });

  // ── Click-and-drag to scroll (desktop) ────────────────────
  var down = false, startX = 0, startScroll = 0, moved = false;
  track.addEventListener('pointerdown', function (e) {
    stopAuto();
    if (e.pointerType === 'touch') return; // native touch handles it
    down = true; moved = false;
    startX = e.clientX;
    startScroll = track.scrollLeft;
    track.classList.add('dragging');
  });
  track.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    track.scrollLeft = startScroll - dx;
  });
  function endDrag() {
    if (!down) return;
    down = false;
    track.classList.remove('dragging');
    goTo(computeCurrent()); // snap to nearest
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('pointerleave', endDrag);
  // Prevent a click firing after a drag
  track.addEventListener('click', function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // Keyboard support when gallery is focused/hovered
  document.addEventListener('keydown', function (e) {
    if (!gallery.matches(':hover')) return;
    if (e.key === 'ArrowLeft') { stopAuto(); goTo(current - 1); }
    else if (e.key === 'ArrowRight') { stopAuto(); goTo(current + 1); }
  });

  // ── Auto-scroll: drift slowly right, bounce back at the ends, and keep
  // looping until the visitor interacts. Any wheel / swipe / drag / button
  // / key press hands full manual control back for good. Respects the
  // reduced-motion preference.
  var autoStopped = false;
  var autoDir = 1;
  var autoTimer = null;
  var autoPos = 0; // float accumulator (scrollLeft floors sub-pixel writes)
  var SPEED = 0.35; // px per tick (~22px/s) — a calm editorial drift
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function autoStep() {
    if (autoStopped) return;
    var max = track.scrollWidth - track.clientWidth;
    if (max <= 1) { autoTimer = setTimeout(autoStep, 200); return; } // not ready / nothing to scroll
    autoPos += SPEED * autoDir;
    if (autoPos >= max) { autoPos = max; autoDir = -1; }
    else if (autoPos <= 0) { autoPos = 0; autoDir = 1; }
    track.scrollLeft = autoPos;
    autoTimer = setTimeout(autoStep, 16);
  }

  function stopAuto() {
    if (autoStopped) return;
    autoStopped = true;
    clearTimeout(autoTimer);
    track.style.scrollSnapType = ''; // restore CSS snap for manual use
    current = computeCurrent();
    update();
  }

  function startAuto() {
    if (autoStopped || reduceMotion) return;
    autoPos = track.scrollLeft; // sync accumulator to wherever we are
    track.style.scrollSnapType = 'none'; // don't let snap fight the drift
    clearTimeout(autoTimer);
    autoTimer = setTimeout(autoStep, 16);
  }

  // Stop on any direct scroll gesture over the strip.
  track.addEventListener('wheel', stopAuto, { passive: true });
  track.addEventListener('touchstart', stopAuto, { passive: true });

  window.addEventListener('resize', function () {
    if (!animating && autoStopped) animateScrollTo(targetFor(current));
  });
  update();

  // Kick off the drift once images have a chance to lay out (so scrollWidth
  // is known). A short delay lets the visitor notice it's interactive.
  if (!reduceMotion) {
    window.addEventListener('load', function () { setTimeout(startAuto, 1200); });
    setTimeout(startAuto, 1800); // fallback if 'load' already fired
  }
})();
