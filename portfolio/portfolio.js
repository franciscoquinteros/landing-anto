(() => {
  // ---------- Year ----------
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------- Reveal on scroll ----------
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // small natural stagger per batch
          setTimeout(() => entry.target.classList.add('in'), i * 60);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });

    revealEls.forEach(el => io.observe(el));
  }

  // ---------- Hero entrance stagger ----------
  // The hero reveals fire on load (not on scroll) because they're above the fold
  const heroReveals = document.querySelectorAll('.hero .reveal');
  heroReveals.forEach((el, i) => {
    el.style.transitionDelay = `${0.15 + i * 0.12}s`;
    requestAnimationFrame(() => el.classList.add('in'));
  });

  // ---------- Number count-up on stats ----------
  const stats = document.querySelectorAll('.stat-num[data-count]');
  if (!reduced && 'IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        so.unobserve(el);

        const target = parseInt(el.dataset.count, 10);
        const isK = el.textContent.toUpperCase().includes('K');
        const hasPlus = el.querySelector('sup') !== null;
        const sup = el.querySelector('sup');
        const supHTML = sup ? sup.outerHTML : '';

        const duration = 1400;
        const start = performance.now();
        const fmt = (n) => {
          const rounded = Math.round(n);
          return isK ? `${rounded}K` : `${rounded}`;
        };

        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          // ease-out-cubic
          const eased = 1 - Math.pow(1 - t, 3);
          const val = target * eased;
          el.innerHTML = fmt(val) + supHTML;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });

    stats.forEach(el => so.observe(el));
  }

  // ---------- Tilt on hero photo (pointer-driven) ----------
  const heroPhoto = document.querySelector('.hero-photo');
  if (heroPhoto && !reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const max = 6; // degrees
    const onMove = (e) => {
      const r = heroPhoto.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      heroPhoto.style.transform =
        `rotate(${-1.5 + x * 2}deg) rotateX(${-y * max}deg) rotateY(${x * max}deg)`;
    };
    const onLeave = () => {
      heroPhoto.style.transform = '';
    };
    heroPhoto.addEventListener('mousemove', onMove);
    heroPhoto.addEventListener('mouseleave', onLeave);
  }

  // ---------- Smooth anchor scroll w/ offset for sticky nav ----------
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const navH = document.querySelector('.nav')?.offsetHeight || 0;
      const y = target.getBoundingClientRect().top + window.scrollY - navH - 8;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  // ---------- Pause marquees when tab hidden (battery) ----------
  document.addEventListener('visibilitychange', () => {
    const tracks = document.querySelectorAll('.marquee-track, .brand-track');
    tracks.forEach(t => {
      t.style.animationPlayState = document.hidden ? 'paused' : 'running';
    });
  });
})();
