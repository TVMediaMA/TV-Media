// 0. Centralized Global Studio Contact Configuration (Single Source of Truth)
(() => {
  const cfg = window.TVMEDIA_CONFIG || {};
  const contactConfig = Object.assign(
    {
      email: cfg.CONTACT_EMAIL || 'tvmediama@gmail.com',
      phone: cfg.CONTACT_PHONE || '978-501-3526',
      phoneHref: cfg.CONTACT_PHONE_HREF || 'tel:+19785013526'
    },
    window.TVMEDIA_CONTACT || {}
  );
  window.TVMEDIA_CONTACT = contactConfig;

  function syncStudioContactLinks() {
    const activeEmail = (window.TVMEDIA_CONTACT && window.TVMEDIA_CONTACT.email) || 'tvmediama@gmail.com';
    document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
      const currentHref = link.getAttribute('href') || '';
      if (currentHref.toLowerCase().startsWith('mailto:tvmediama@gmail.com')) {
        link.setAttribute('href', `mailto:${activeEmail}`);
        if (link.textContent.includes('tvmediama@gmail.com')) {
          link.textContent = link.textContent.replace(/tvmediama@gmail\.com/gi, activeEmail);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncStudioContactLinks);
  } else {
    syncStudioContactLinks();
  }
})();

// 1. Mobile Navigation Menu Toggle (Null-safe & Accessible)
(() => {
  const menuToggle = document.getElementById('mobile-menu');
  const nav = document.querySelector('header.site-header nav, header nav');

  if (!menuToggle || !nav) return;

  function setMenuState(isOpen) {
    nav.classList.toggle('active', isOpen);
    menuToggle.classList.toggle('open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.innerHTML = isOpen ? '&#10005;' : '&#9776;';
  }

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !nav.classList.contains('active');
    setMenuState(isOpen);
  });

  document.addEventListener('click', (e) => {
    if (nav.classList.contains('active') && !nav.contains(e.target) && !menuToggle.contains(e.target)) {
      setMenuState(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('active')) {
      setMenuState(false);
      menuToggle.focus();
    }
  });
})();

// 2. Intersection Observer for Timeline / Reveal Items (Null-safe)
(() => {
  const items = document.querySelectorAll('.timeline-item');
  if (items.length === 0 || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('animate', entry.isIntersecting);
    });
  }, {
    threshold: 0.2
  });

  items.forEach((item) => observer.observe(item));
})();

// 3. Workshop Previews Carousel & Lightbox Modal (Null-safe)
(() => {
  const track = document.querySelector('.carousel-track');
  const wrapper = document.querySelector('.carousel-track-wrapper');
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');

  if (!track || !wrapper || !prevBtn || !nextBtn) return;

  const slides = Array.from(track.children);
  if (slides.length === 0) return;

  let currentIndex = 0;

  function updateCarousel(shouldFocus = false) {
    const slideRect = slides[0].getBoundingClientRect();
    const slideWidth = slideRect.width;
    const trackStyle = window.getComputedStyle(track);
    const gap = parseFloat(trackStyle.gap || trackStyle.columnGap) || 16;
    const wrapperWidth = wrapper.getBoundingClientRect().width;

    const centerOffset = Math.max(0, (wrapperWidth - slideWidth) / 2);
    const offset = centerOffset - (currentIndex * (slideWidth + gap));
    track.style.transform = `translateX(${offset}px)`;

    slides.forEach((slide, i) => {
      const isActive = i === currentIndex;
      slide.classList.toggle('is-active', isActive);
      slide.style.opacity = isActive ? '1' : '0.45';
      slide.style.transform = isActive ? 'scale(1)' : 'scale(0.88)';
      slide.setAttribute('aria-current', isActive ? 'true' : 'false');
      if (isActive && shouldFocus) {
        slide.focus({ preventScroll: true });
      }
    });
  }

  function goPrev(shouldFocus = true) {
    currentIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
    updateCarousel(shouldFocus);
  }

  function goNext(shouldFocus = true) {
    currentIndex = currentIndex === slides.length - 1 ? 0 : currentIndex + 1;
    updateCarousel(shouldFocus);
  }

  prevBtn.addEventListener('click', () => goPrev(true));
  nextBtn.addEventListener('click', () => goNext(true));

  // Click a non-active slide to center it; click the active slide to enlarge in a lightbox
  slides.forEach((slide, i) => {
    slide.addEventListener('click', () => {
      if (i !== currentIndex) {
        currentIndex = i;
        updateCarousel(true);
      } else {
        const img = slide.querySelector('img');
        if (img) openLightbox(img.src, img.alt);
      }
    });

    slide.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev(true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext(true);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (i !== currentIndex) {
          currentIndex = i;
          updateCarousel(true);
        } else {
          const img = slide.querySelector('img');
          if (img) openLightbox(img.src, img.alt);
        }
      }
    });
  });

  function openLightbox(src, alt) {
    let modal = document.getElementById('tvmedia-lightbox');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'tvmedia-lightbox';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Slide Preview');
      Object.assign(modal.style, {
        position: 'fixed',
        inset: '0',
        background: 'rgba(15, 22, 46, 0.88)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        zIndex: '2000',
        cursor: 'zoom-out'
      });

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.innerHTML = '&#10005; Close Preview';
      Object.assign(closeBtn.style, {
        background: '#ff6600',
        color: '#000000',
        border: '2px solid #000000',
        borderRadius: '999px',
        padding: '0.55rem 1.35rem',
        fontWeight: '800',
        fontSize: '0.95rem',
        cursor: 'pointer',
        marginBottom: '1.15rem',
        boxShadow: '4px 4px 0 #d6d4a0'
      });

      const previewImg = document.createElement('img');
      previewImg.id = 'tvmedia-lightbox-img';
      Object.assign(previewImg.style, {
        maxWidth: 'min(960px, 92vw)',
        maxHeight: '78vh',
        borderRadius: '12px',
        border: '3px solid #000000',
        boxShadow: '8px 8px 0 #ff6600',
        objectFit: 'contain',
        background: '#ffffff'
      });

      const caption = document.createElement('p');
      caption.id = 'tvmedia-lightbox-caption';
      Object.assign(caption.style, {
        color: '#d6d4a0',
        marginTop: '1rem',
        fontWeight: '700',
        fontSize: '1rem',
        textAlign: 'center'
      });

      closeBtn.addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });

      modal.append(closeBtn, previewImg, caption);
      document.body.appendChild(modal);
    }

    const imgEl = modal.querySelector('#tvmedia-lightbox-img');
    const capEl = modal.querySelector('#tvmedia-lightbox-caption');
    imgEl.src = src;
    imgEl.alt = alt || 'Workshop Slide Preview';
    capEl.textContent = alt || '';
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('tvmedia-lightbox');
      if (modal) modal.remove();
    }
  });

  window.addEventListener('load', () => updateCarousel(false));
  window.addEventListener('resize', () => updateCarousel(false));
  // Run immediately if DOM is already ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    requestAnimationFrame(() => updateCarousel(false));
  }
})();