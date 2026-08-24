/* ============================================================================
   GUMMYBEARS — main.js
   Vanilla JS, no modules (so index.html also works opened straight off disk).
   Everything here reads from window.GUMMYBEARS in js/content.js.
   ========================================================================== */
(function () {
  'use strict';

  var DATA = window.GUMMYBEARS;
  if (!DATA) { console.error('GUMMYBEARS: js/content.js did not load.'); return; }

  var party = DATA.party || null;
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var byKey = function (key) { return $$('[data-gb="' + key + '"]'); };
  var setText = function (key, value) { byKey(key).forEach(function (el) { el.textContent = value; }); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── state ───────────────────────────────────────────────────────────────
     quiet    no party exists
     upcoming doors are in the future
     live     we are inside the party window
     over     the party happened                                            */
  function currentState() {
    if (!party) return 'quiet';
    var now = Date.now();
    var doors = new Date(party.doors).getTime();
    var ends = new Date(party.endsAt).getTime();
    if (isNaN(doors)) return 'upcoming';
    if (now < doors) return 'upcoming';
    if (!isNaN(ends) && now < ends) return 'live';
    return 'over';
  }

  var state = currentState();
  var soldOut = !!party && typeof party.ticketsLeft === 'number' && party.ticketsLeft <= 0;

  /* ── theme ──────────────────────────────────────────────────────────────── */
  function paint() {
    var root = document.documentElement;
    if (party && party.accent) root.style.setProperty('--accent', party.accent);
    if (party && party.accentInk) root.style.setProperty('--accent-ink', party.accentInk);
    if (state === 'quiet' || state === 'over') document.body.classList.add('is-quiet');
  }

  /* ── hero ───────────────────────────────────────────────────────────────── */
  function renderHero() {
    var statusPill = $('[data-gb="status"]');
    var barCta = $('[data-gb="barCta"]');
    var ticketBtn = $('#ticket-btn');
    var icsBtn = $('#ics-btn');
    var leftNote = $('#left-note');

    if (state === 'quiet') {
      setText('statusText', 'NOTHING PLANNED');
      setText('volume', 'BETWEEN PARTIES');
      setText('name', 'NOT YET');
      setText('subtitle', 'There is no party right now. That is not a bug — it is the whole idea. Get on the list and we will tell you once, when the next one exists.');
      byKey('dateLine').forEach(function (el) { el.textContent = 'TBA'; });
      byKey('timeLine').forEach(function (el) { el.textContent = 'TBA'; });
      byKey('venueLine').forEach(function (el) { el.textContent = 'TBA'; });
      if (statusPill) statusPill.classList.add('is-dead');
      if (ticketBtn) { ticketBtn.textContent = 'GET ON THE LIST'; ticketBtn.setAttribute('href', '#list'); }
      if (icsBtn) icsBtn.hidden = true;
      if (barCta) { barCta.textContent = 'THE LIST'; barCta.setAttribute('href', '#list'); }
      ['#lineup', '#tickets', '#info'].forEach(function (sel) { var s = $(sel); if (s) s.hidden = true; });
      var cd = $('#countdown'); if (cd) cd.hidden = true;
      var cdCap = $('#cd-cap'); if (cdCap) cdCap.hidden = true;
      return;
    }

    setText('volume', 'VOL. ' + String(party.volume).padStart(2, '0'));
    setText('name', party.name);
    setText('subtitle', party.subtitle || '');
    setText('dateLine', party.dateLine || '');
    setText('timeLine', party.timeLine || '');
    setText('venueLine', party.venue.secret
      ? 'SECRET · dropped 24h before'
      : (party.venue.name + ' · ' + party.venue.area));

    var status = 'ON SALE';
    if (state === 'live') status = 'HAPPENING NOW';
    else if (state === 'over') status = 'IT’S OVER';
    else if (soldOut) status = 'SOLD OUT';
    else if (typeof party.ticketsLeft === 'number' && party.ticketsLeft <= 50) status = 'LAST TICKETS';
    setText('statusText', status);
    if (statusPill && state === 'over') statusPill.classList.add('is-dead');

    if (state === 'over') {
      if (ticketBtn) { ticketBtn.textContent = 'YOU MISSED IT'; ticketBtn.classList.add('is-dead'); ticketBtn.removeAttribute('href'); }
      if (icsBtn) icsBtn.hidden = true;
      if (barCta) barCta.classList.add('is-off');
      if (leftNote) { leftNote.hidden = false; leftNote.textContent = 'Nothing is planned. That is the point.'; }
    } else if (soldOut) {
      if (ticketBtn) { ticketBtn.textContent = 'SOLD OUT'; ticketBtn.classList.add('is-dead'); ticketBtn.removeAttribute('href'); }
      if (barCta) { barCta.textContent = 'SOLD OUT'; }
      if (leftNote) { leftNote.hidden = false; leftNote.textContent = 'No door tickets. No guest list. Sorry.'; }
    } else if (typeof party.ticketsLeft === 'number' && leftNote) {
      leftNote.hidden = false;
      leftNote.textContent = party.ticketsLeft + ' of ' + party.capacity + ' left';
    }
  }

  /* ── countdown ──────────────────────────────────────────────────────────── */
  function renderCountdown() {
    var box = $('#countdown');
    var cap = $('#cd-cap');
    var out = $('#countdown-text');
    if (!box) return;
    var hide = function () { box.hidden = true; if (cap) cap.hidden = true; };
    if (state === 'quiet' || state === 'over') { hide(); if (out) out.textContent = ''; return; }

    var target = new Date(state === 'live' ? party.endsAt : party.doors).getTime();
    if (isNaN(target)) { hide(); return; }
    if (cap) cap.textContent = state === 'live' ? 'ENDS IN' : 'DOORS IN';
    if (state === 'live') { box.classList.add('is-live'); if (cap) cap.classList.add('is-live'); }

    var pad = function (n) { return String(n).padStart(2, '0'); };
    var lastMinute = -1;

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) { window.location.reload(); return; }
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600),
          m = Math.floor(s % 3600 / 60), sec = s % 60;

      $('[data-cd="d"]', box).textContent = pad(d);
      $('[data-cd="h"]', box).textContent = pad(h);
      $('[data-cd="m"]', box).textContent = pad(m);
      $('[data-cd="s"]', box).textContent = pad(sec);

      /* screen readers get a sentence, once a minute — not 60 updates a minute */
      if (out && m !== lastMinute) {
        lastMinute = m;
        out.textContent = (state === 'live' ? 'Ends in ' : 'Doors in ') +
          d + ' days, ' + h + ' hours, ' + m + ' minutes.';
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ── lineup ─────────────────────────────────────────────────────────────── */
  function renderLineup() {
    var list = $('#lineup-list');
    if (!list || !party || !party.lineup) return;
    list.innerHTML = '';
    party.lineup.forEach(function (act) {
      var li = document.createElement('li');
      li.className = 'lineup__item' + (act.headline ? ' is-headline' : '');
      var time = document.createElement('span');
      time.className = 'lineup__time';
      time.textContent = act.time || '';
      var body = document.createElement('div');
      body.className = 'lineup__body';
      var name = document.createElement('p');
      name.className = 'lineup__name';
      name.textContent = act.name;
      body.appendChild(name);
      if (act.note) {
        var note = document.createElement('p');
        note.className = 'lineup__note';
        note.textContent = act.note;
        body.appendChild(note);
      }
      li.appendChild(time); li.appendChild(body);
      list.appendChild(li);
    });
  }

  /* ── tickets ────────────────────────────────────────────────────────────── */
  function renderTickets() {
    var list = $('#tier-list');
    var buy = $('#buy-btn');
    if (!party) return;

    setText('capacityLine', soldOut
      ? 'All ' + party.capacity + ' tickets are gone. There is no waiting list.'
      : party.capacity + ' people fit in the room. When they are in, the door closes.');

    if (list) {
      list.innerHTML = '';
      (party.tiers || []).forEach(function (tier) {
        var li = document.createElement('li');
        li.className = 'tier is-' + tier.state;

        var name = document.createElement('span');
        name.className = 'tier__name';
        name.textContent = tier.name;

        var meta = document.createElement('span');
        meta.className = 'tier__meta';
        var price = document.createElement('span');
        price.className = 'tier__price';
        price.textContent = tier.price;
        var label = document.createElement('span');
        label.className = 'tier__state';
        label.textContent =
          tier.state === 'sold-out' ? 'GONE' :
          tier.state === 'maybe' ? 'MAYBE' :
          (typeof tier.left === 'number' ? tier.left + ' LEFT' : 'ON SALE');
        meta.appendChild(price); meta.appendChild(label);

        li.appendChild(name); li.appendChild(meta);

        /* full-width sub-row: how much is left, or the small print */
        if (tier.state === 'on-sale' && typeof tier.left === 'number' && party.capacity) {
          var extra = document.createElement('span');
          extra.className = 'tier__extra';
          var bar = document.createElement('span');
          bar.className = 'tier__bar';
          var fill = document.createElement('i');
          fill.style.width = Math.max(2, Math.min(100, Math.round(tier.left / party.capacity * 100))) + '%';
          bar.appendChild(fill); extra.appendChild(bar);
          li.appendChild(extra);
        } else if (tier.note) {
          var noteRow = document.createElement('span');
          noteRow.className = 'tier__extra tier__note';
          noteRow.textContent = tier.note;
          li.appendChild(noteRow);
        }
        list.appendChild(li);
      });
    }

    if (buy) {
      if (state === 'over') { buy.textContent = 'THAT NIGHT IS GONE'; buy.classList.add('is-dead'); buy.removeAttribute('href'); }
      else if (soldOut) { buy.textContent = 'SOLD OUT'; buy.classList.add('is-dead'); buy.removeAttribute('href'); }
      else if (party.ticketUrl) { buy.setAttribute('href', party.ticketUrl); buy.setAttribute('target', '_blank'); }
    }
    /* the sticky bar button should jump to the shop, not the anchor, once seen */
    var barCta = $('[data-gb="barCta"]');
    if (barCta && state !== 'over' && !soldOut && party.ticketUrl) {
      barCta.setAttribute('href', party.ticketUrl);
      barCta.setAttribute('target', '_blank');
      barCta.setAttribute('rel', 'noopener');
    }
  }

  /* ── venue + rules ──────────────────────────────────────────────────────── */
  function renderInfo() {
    if (!party) return;
    var v = party.venue || {};
    setText('venueName', v.secret ? 'LOCATION TBA' : (v.name || ''));
    setText('venueAddress', v.secret ? 'Sent to ticket holders 24 hours before doors.' : (v.address || ''));
    setText('venueNote', v.note || '');
    setText('creed', party.creed || '');

    var map = $('#map-btn'), copy = $('#copy-btn');
    if (v.secret || !v.address) {
      if (map) map.hidden = true;
      if (copy) copy.hidden = true;
    } else {
      if (map && v.mapUrl) map.setAttribute('href', v.mapUrl);
      if (copy) copy.addEventListener('click', function () {
        var done = function () { copy.textContent = 'COPIED'; setTimeout(function () { copy.textContent = 'COPY ADDRESS'; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(v.address).then(done, function () { copy.textContent = 'COPY FAILED'; });
        } else {
          var t = document.createElement('textarea');
          t.value = v.address; document.body.appendChild(t); t.select();
          try { document.execCommand('copy'); done(); } catch (e) { copy.textContent = 'COPY FAILED'; }
          document.body.removeChild(t);
        }
      });
    }

    var rules = $('#rules-list');
    if (rules) {
      rules.innerHTML = '';
      (party.rules || []).forEach(function (text) {
        var li = document.createElement('li');
        li.appendChild(document.createTextNode(text));
        rules.appendChild(li);
      });
    }
  }

  /* ── archive ────────────────────────────────────────────────────────────── */
  function renderArchive() {
    var list = $('#archive-list');
    if (!list) return;
    list.innerHTML = '';
    (DATA.archive || []).forEach(function (p) {
      var li = document.createElement('li');
      li.className = 'arch';
      var vol = document.createElement('span');
      vol.className = 'arch__vol';
      vol.textContent = 'V' + String(p.volume).padStart(2, '0');
      var name = document.createElement('span');
      name.className = 'arch__name';
      name.textContent = p.name;
      var meta = document.createElement('span');
      meta.className = 'arch__meta';
      meta.textContent = p.date + (p.venue ? ' · ' + p.venue : '');
      li.appendChild(vol); li.appendChild(name); li.appendChild(meta);
      list.appendChild(li);
    });
  }

  /* ── ticker ─────────────────────────────────────────────────────────────── */
  function renderTicker() {
    var words = (DATA.brand && DATA.brand.ticker) || [];
    if (party && state !== 'over') words = [party.name + ' · ' + party.dateLine].concat(words);
    if (!words.length) return;
    ['#ticker', '#ticker2'].forEach(function (sel) {
      var track = $(sel);
      if (!track) return;
      track.innerHTML = '';
      /* twice through, so translateX(-50%) loops seamlessly */
      for (var pass = 0; pass < 2; pass++) {
        words.forEach(function (word) {
          var span = document.createElement('span');
          span.textContent = word + ' ✳';
          track.appendChild(span);
        });
      }
    });
  }

  /* ── links + share ──────────────────────────────────────────────────────── */
  function renderLinks() {
    var links = DATA.links || {};
    var ig = $('#ig-link'), mail = $('#mail-link');
    if (ig) { links.instagram ? ig.setAttribute('href', links.instagram) : ig.remove(); }
    if (mail) { links.email ? mail.setAttribute('href', 'mailto:' + links.email) : mail.remove(); }

    var share = $('#share-btn');
    if (!share) return;
    share.addEventListener('click', function () {
      var payload = {
        title: 'GUMMYBEARS' + (party ? ' — ' + party.name : ''),
        text: party ? party.name + ' · ' + party.dateLine + ' · ' + (party.venue.secret ? 'secret location' : party.venue.area) : 'One party at a time.',
        url: window.location.href
      };
      if (navigator.share) { navigator.share(payload).catch(function () {}); return; }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(payload.url).then(function () {
          share.textContent = 'LINK COPIED';
          setTimeout(function () { share.textContent = 'SHARE'; }, 1800);
        });
      }
    });
  }

  /* ── add to calendar (.ics built in the browser, no service involved) ───── */
  function setupCalendar() {
    var btn = $('#ics-btn');
    if (!btn || !party) return;
    if (state === 'over' || state === 'quiet') { btn.hidden = true; return; }

    var stamp = function (iso) {
      var d = new Date(iso);
      return isNaN(d) ? '' : d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };
    var esc = function (s) { return String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); };

    btn.addEventListener('click', function () {
      var where = party.venue.secret ? 'Location announced 24h before' : (party.venue.name + ', ' + party.venue.address);
      var ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gummybears//Party//EN', 'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        'UID:gummybears-vol' + party.volume + '@gummybears.party',
        'DTSTAMP:' + stamp(new Date().toISOString()),
        'DTSTART:' + stamp(party.doors),
        'DTEND:' + stamp(party.endsAt),
        'SUMMARY:' + esc('GUMMYBEARS — ' + party.name),
        'LOCATION:' + esc(where),
        'DESCRIPTION:' + esc((party.subtitle || '') + ' ' + window.location.href),
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');

      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'gummybears-' + party.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.ics';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  /* ── the list ───────────────────────────────────────────────────────────── */
  function setupSignup() {
    var form = $('#signup'), input = $('#email'), msg = $('#signup-msg');
    if (!form) return;
    var cfg = DATA.list || {};
    setText('listBlurb', cfg.blurb || '');

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      msg.classList.remove('is-bad');
      var email = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = 'That address doesn’t look real.';
        msg.classList.add('is-bad');
        input.focus();
        return;
      }

      if (!cfg.endpoint) {
        /* No backend wired up — be honest and hand it to the mail client. */
        msg.textContent = 'Opening your mail app…';
        window.location.href = 'mailto:' + ((DATA.links && DATA.links.email) || '') +
          '?subject=' + encodeURIComponent('Add me to the list') +
          '&body=' + encodeURIComponent(email);
        return;
      }

      msg.textContent = 'Sending…';
      fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      }).then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.reset();
        msg.textContent = 'You’re on it. One email, when there’s a party.';
      }).catch(function () {
        msg.textContent = 'That didn’t send. Email ' + ((DATA.links && DATA.links.email) || 'us') + ' instead.';
        msg.classList.add('is-bad');
      });
    });
  }

  /* ── chrome: sticky bar + reveals ───────────────────────────────────────── */
  function setupChrome() {
    var bar = $('#bar');
    var onScroll = function () {
      if (bar) bar.classList.toggle('is-stuck', window.scrollY > window.innerHeight * 0.6);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (reduceMotion || !('IntersectionObserver' in window)) return;
    var targets = $$('.sec, .ticker');
    targets.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ── go ─────────────────────────────────────────────────────────────────── */
  paint();
  renderHero();
  renderCountdown();
  renderLineup();
  renderTickets();
  renderInfo();
  renderArchive();
  renderTicker();
  renderLinks();
  setupCalendar();
  setupSignup();
  setupChrome();

  document.title = party
    ? 'GUMMYBEARS — ' + party.name + (state === 'over' ? ' (over)' : ' · ' + party.dateLine)
    : 'GUMMYBEARS — nothing planned';
})();
