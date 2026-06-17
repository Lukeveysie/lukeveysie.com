// ─────────────────────────────────────────────────────────────
// Luke Veysie — video grid + reel viewer (facade pattern)
// Each .work-tile carries data-yt="ID" and/or data-vimeo="ID[?h=…]".
// Renders a poster thumbnail + play button; clicking a tile opens
// a full-screen REEL VIEWER: title + counter chrome, prev/next
// arrows, ←/→ to move through the reel, X / Esc / click-outside
// to close.
// ─────────────────────────────────────────────────────────────
(function () {
  var PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';

  // Ordered playlist of every playable tile.
  // entry = { title, makeIframe }
  var reel = [];

  // ── Full-screen reel viewer ────────────────────────────────
  var lb, lbStage, lbClose, lbPrev, lbNext, lbCount, lbTitle, lastFocus;
  var current = -1;

  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'video-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Reel viewer');
    lb.innerHTML =
      '<div class="lb-bar">' +
        '<div class="lb-meta">' +
          '<span class="lb-count">00 / 00</span>' +
          '<span class="lb-title"></span>' +
        '</div>' +
        '<button type="button" class="lb-close" aria-label="Close reel">' +
          '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>' +
        '</button>' +
      '</div>' +
      '<button type="button" class="lb-nav lb-prev" aria-label="Previous video">' +
        '<svg viewBox="0 0 24 24"><path d="M15 5l-8 7 8 7"/></svg>' +
      '</button>' +
      '<div class="lb-stage"></div>' +
      '<button type="button" class="lb-nav lb-next" aria-label="Next video">' +
        '<svg viewBox="0 0 24 24"><path d="M9 5l8 7-8 7"/></svg>' +
      '</button>';
    document.body.appendChild(lb);
    lbStage = lb.querySelector('.lb-stage');
    lbClose = lb.querySelector('.lb-close');
    lbPrev  = lb.querySelector('.lb-prev');
    lbNext  = lb.querySelector('.lb-next');
    lbCount = lb.querySelector('.lb-count');
    lbTitle = lb.querySelector('.lb-title');

    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', function () { go(current - 1); });
    lbNext.addEventListener('click', function () { go(current + 1); });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target === lbStage) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') go(current - 1);
      else if (e.key === 'ArrowRight') go(current + 1);
    });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function go(index) {
    if (reel.length === 0) return;
    // wrap around the reel
    current = (index + reel.length) % reel.length;
    var entry = reel[current];
    lbStage.innerHTML = '';
    lbStage.appendChild(entry.makeIframe());
    lbCount.textContent = pad(current + 1) + ' / ' + pad(reel.length);
    lbTitle.textContent = entry.title || '';
    var solo = reel.length < 2;
    lbPrev.style.display = solo ? 'none' : '';
    lbNext.style.display = solo ? 'none' : '';
  }

  function openLightbox(index) {
    if (!lb) buildLightbox();
    lastFocus = document.activeElement;
    go(index);
    lb.classList.add('is-open');
    document.documentElement.classList.add('lb-locked');
    lbClose.focus();
  }

  function closeLightbox() {
    if (!lb) return;
    lb.classList.remove('is-open');
    document.documentElement.classList.remove('lb-locked');
    lbStage.innerHTML = ''; // stop playback
    current = -1;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ── Poster facade ──────────────────────────────────────────
  function buildPoster(tile, frame, idx, posterUrl, makeIframe, initialTitle) {
    var entry = { title: initialTitle || '', makeIframe: makeIframe };
    reel.push(entry);
    var myIndex = reel.length - 1;

    var poster = document.createElement('button');
    poster.type = 'button';
    poster.className = 'video-poster';
    poster.setAttribute('aria-label', 'Play video');
    if (posterUrl) poster.style.backgroundImage = 'url("' + posterUrl + '")';
    poster.innerHTML =
      '<span class="play-btn" aria-hidden="true">' + PLAY + '</span>';
    poster.addEventListener('click', function () {
      var href = (tile.getAttribute('data-href') || '').trim();
      if (href) { window.location.href = href; return; }
      openLightbox(myIndex);
    });
    frame.innerHTML = '';
    frame.appendChild(poster);
    return { poster: poster, entry: entry };
  }

  function setPoster(poster, url) {
    if (!poster || !url) return;
    poster.classList.remove('poster-fallback');
    var lbl = poster.querySelector('.poster-label');
    if (lbl) lbl.remove();
    poster.style.backgroundImage = 'url("' + url + '")';
  }

  // Vimeo serves a grey generic still ( …/default-XXXX ) when a clip has no
  // custom thumbnail. Treat that as "no thumbnail" so we can show a clean
  // typographic card instead of the broken placeholder.
  function isRealThumb(url) {
    return !!url && url.indexOf('/default-') === -1;
  }
  function markFallback(poster, title) {
    if (!poster) return;
    poster.style.backgroundImage = '';
    poster.classList.add('poster-fallback');
    if (!poster.querySelector('.poster-label')) {
      var span = document.createElement('span');
      span.className = 'poster-label';
      span.textContent = title || '';
      poster.insertBefore(span, poster.firstChild);
    } else {
      poster.querySelector('.poster-label').textContent = title || '';
    }
  }

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Format an upload-date string ("2024-03-15 12:00:00" or ISO) → "Mar 2024"
  function fmtUpload(raw) {
    if (!raw) return '';
    var d = new Date(String(raw).replace(' ', 'T'));
    if (isNaN(d)) return '';
    return MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function setDate(tag, raw) {
    var f = fmtUpload(raw);
    // Only overwrite date-style credits (e.g. "Selected · 2026"); leave
    // authored credits like "Editor" untouched.
    if (tag && f && /^\s*selected/i.test(tag.textContent)) {
      tag.textContent = 'Selected · ' + f;
    }
  }

  var tiles = Array.prototype.slice.call(document.querySelectorAll('.work-tile'));
  tiles.forEach(function (tile, i) {
    var id = (tile.getAttribute('data-yt') || '').trim();
    var vimeo = (tile.getAttribute('data-vimeo') || '').trim();
    var frame = tile.querySelector('.frame');
    var ttl = tile.querySelector('.caption .ttl');
    var tag = tile.querySelector('.caption .tag');
    var idx = i + 1;
    var lockTitle = (tile.getAttribute('data-title') || '').trim();
    if (lockTitle && ttl) ttl.textContent = lockTitle;
    if (!frame) return;

    // ── Vimeo ──────────────────────────────────────────────
    if (vimeo) {
      var vid = vimeo.split('?')[0];
      var manualPoster = (tile.getAttribute('data-poster') || '').trim();
      var built = buildPoster(tile, frame, idx, manualPoster || null, function () {
        var vf = document.createElement('iframe');
        vf.src = 'https://player.vimeo.com/video/' + vimeo +
          (vimeo.indexOf('?') === -1 ? '?' : '&') +
          'title=0&byline=0&portrait=0&dnt=1&autoplay=1';
        vf.title = 'vimeo-player';
        vf.setAttribute('frameborder', '0');
        vf.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        vf.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share');
        vf.setAttribute('allowfullscreen', '');
        return vf;
      }, ttl ? ttl.textContent.trim() : '');
      fetch('https://vimeo.com/api/oembed.json?width=1280&url=' +
        encodeURIComponent('https://vimeo.com/' + vid))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d) return;
          if (d.title) { if (!lockTitle && ttl) ttl.textContent = d.title; built.entry.title = lockTitle || d.title; }
          if (!manualPoster) {
            if (isRealThumb(d.thumbnail_url)) setPoster(built.poster, d.thumbnail_url);
            else markFallback(built.poster, d.title || built.entry.title);
          }
          setDate(tag, d.upload_date);
        })
        .catch(function () {});
      return;
    }

    // ── Empty placeholder ──────────────────────────────────
    if (!id) {
      tile.classList.add('is-empty');
      frame.innerHTML = '<span class="frame-hint">Add video</span>';
      return;
    }

    // ── YouTube ────────────────────────────────────────────
    var built2 = buildPoster(tile, frame, idx,
      'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg',
      function () {
        var iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube-nocookie.com/embed/' + id +
          '?rel=0&modestbranding=1&autoplay=1';
        iframe.title = id;
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('allowfullscreen', '');
        return iframe;
      }, ttl ? ttl.textContent.trim() : '');
    // Fallback if maxres poster is missing (404 → grey 120px image)
    var probe = new Image();
    probe.onload = function () {
      if (probe.naturalWidth < 320) {
        setPoster(built2.poster, 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg');
      }
    };
    probe.src = 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg';

    fetch('https://www.youtube.com/oembed?format=json&url=' +
      encodeURIComponent('https://www.youtube.com/watch?v=' + id))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.title) { if (!lockTitle && ttl) ttl.textContent = d.title; built2.entry.title = lockTitle || d.title; }
      })
      .catch(function () {});
  });
})();
