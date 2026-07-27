/* =====================================================================
   KHENGUI Ouissal — Portfolio
   script.js
   Vanilla JavaScript — no frameworks, no dependencies
   Compatible with AWS S3 Static Website Hosting
   ===================================================================== */

(() => {
  'use strict';

  /* ===================================================================
     0. SHARED UTILITIES
     =================================================================== */

  /** Returns true if the user has requested reduced motion. */
  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Returns true if the current viewport is desktop-class with a fine pointer. */
  const isDesktopPointer = () =>
    window.matchMedia &&
    window.matchMedia('(pointer: fine)').matches &&
    window.matchMedia('(min-width: 1024px)').matches;

  /** Clamp a number between a min and max value. */
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  /**
   * Runs `callback` at most once per animation frame, always with the
   * most recent arguments. Used to keep scroll/mousemove handlers cheap.
   */
  const rafThrottle = (callback) => {
    let ticking = false;
    let lastArgs = null;

    return (...args) => {
      lastArgs = args;
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        callback(...lastArgs);
        ticking = false;
      });
    };
  };

  /** Safe querySelector — never throws, simply returns null if missing. */
  const qs = (selector, scope = document) => {
    try {
      return scope.querySelector(selector);
    } catch (err) {
      return null;
    }
  };

  /** Safe querySelectorAll — always returns an array (possibly empty). */
  const qsa = (selector, scope = document) => {
    try {
      return Array.from(scope.querySelectorAll(selector));
    } catch (err) {
      return [];
    }
  };

  /* ===================================================================
     1. LOADING SCREEN
     =================================================================== */
  const initLoadingScreen = () => {
    const loadingScreen = qs('#loading-screen');
    if (!loadingScreen) return;

    const hideLoadingScreen = () => {
      loadingScreen.classList.add('is-hidden');

      let removed = false;
      const removeFromDom = () => {
        if (removed) return;
        removed = true;
        loadingScreen.remove();
      };

      loadingScreen.addEventListener('transitionend', removeFromDom, { once: true });
      // Fallback in case transitionend never fires (e.g. no transition support).
      window.setTimeout(removeFromDom, 800);
    };

    // Give the page a brief, intentional moment before revealing content.
    window.setTimeout(hideLoadingScreen, 400);
  };

  /* ===================================================================
     2. MOBILE NAVIGATION
     =================================================================== */
  const initMobileNavigation = () => {
    const toggle = qs('#nav-mobile-toggle');
    const navList = qs('#nav-list');
    if (!toggle || !navList) return;

    const openMenu = () => {
      navList.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
    };

    const closeMenu = () => {
      navList.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    };

    const isMenuOpen = () => navList.classList.contains('is-open');

    toggle.addEventListener('click', () => {
      isMenuOpen() ? closeMenu() : openMenu();
    });

    // Close after clicking any navigation link (event delegation).
    navList.addEventListener('click', (event) => {
      const link = event.target.closest('.nav__link');
      if (link) closeMenu();
    });

    // Close when clicking outside the nav list and toggle button.
    document.addEventListener('click', (event) => {
      if (!isMenuOpen()) return;
      const clickedInsideNav = navList.contains(event.target) || toggle.contains(event.target);
      if (!clickedInsideNav) closeMenu();
    });

    // Close on Escape key, regardless of which element has focus.
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isMenuOpen()) {
        closeMenu();
        toggle.focus();
      }
    });

    // Reset mobile menu state when resizing back to desktop.
    window.addEventListener(
      'resize',
      rafThrottle(() => {
        if (window.innerWidth > 900 && isMenuOpen()) closeMenu();
      })
    );
  };

  /* ===================================================================
     3. SCROLL-DRIVEN UI (sticky header, progress bar, back-to-top)
     Combined into a single scroll listener for performance.
     =================================================================== */
  const initScrollDrivenUI = () => {
    const header = qs('#header');
    const progressBar = qs('#scroll-progress-bar');
    const progressTrack = qs('.scroll-progress');
    const backToTop = qs('#back-to-top');

    if (!header && !progressBar && !backToTop) return;

    const SCROLL_THRESHOLD = 40;
    const BACK_TO_TOP_THRESHOLD = 480;

    const updateScrollUI = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? clamp((scrollTop / docHeight) * 100, 0, 100) : 0;

      if (header) {
        header.classList.toggle('is-scrolled', scrollTop > SCROLL_THRESHOLD);
      }

      if (progressBar) {
        progressBar.style.width = `${scrollPercent}%`;
        if (progressTrack) {
          progressTrack.setAttribute('aria-valuenow', String(Math.round(scrollPercent)));
        }
      }

      if (backToTop) {
        backToTop.classList.toggle('is-visible', scrollTop > BACK_TO_TOP_THRESHOLD);
      }
    };

    window.addEventListener('scroll', rafThrottle(updateScrollUI), { passive: true });
    updateScrollUI();

    if (backToTop) {
      backToTop.addEventListener('click', () => {
        const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
        window.scrollTo({ top: 0, behavior });
      });
    }
  };

  /* ===================================================================
     4. ACTIVE NAVIGATION HIGHLIGHT
     =================================================================== */
  const initActiveNavHighlight = () => {
    const navLinks = qsa('.nav__link');
    if (navLinks.length === 0 || !('IntersectionObserver' in window)) return;

    const sectionIds = navLinks
      .map((link) => link.getAttribute('href'))
      .filter((href) => href && href.startsWith('#'))
      .map((href) => href.slice(1));

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (sections.length === 0) return;

    const linkById = new Map(
      navLinks.map((link) => [link.getAttribute('href').replace('#', ''), link])
    );

    const setActiveLink = (id) => {
      navLinks.forEach((link) => link.classList.remove('is-active'));
      const activeLink = linkById.get(id);
      if (activeLink) activeLink.classList.add('is-active');
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveLink(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-40% 0px -55% 0px',
        threshold: 0,
      }
    );

    sections.forEach((section) => observer.observe(section));
  };

  /* ===================================================================
     5. SMOOTH SCROLL FOR INTERNAL LINKS
     =================================================================== */
  const initSmoothScroll = () => {
    const header = qs('#header');

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;

      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = qs(targetId);
      if (!target) return;

      event.preventDefault();

      const headerOffset = header ? header.offsetHeight : 0;
      const targetPosition =
        target.getBoundingClientRect().top + window.pageYOffset - headerOffset - 16;

      window.scrollTo({
        top: Math.max(targetPosition, 0),
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });

      // Keep focus management accessible for keyboard/screen-reader users.
      target.setAttribute('tabindex', '-1');
      target.addEventListener(
        'blur',
        () => target.removeAttribute('tabindex'),
        { once: true }
      );
      window.setTimeout(() => target.focus({ preventScroll: true }), 400);
    });
  };

  /* ===================================================================
     6. REVEAL ON SCROLL
     =================================================================== */
  const initRevealOnScroll = () => {
    const revealSelectors = [
      '.hero__content',
      '.hero__figure',
      '.skill-card',
      '.project',
      '.timeline__item',
      '.certificate-card',
      '.education-card',
      '.learning__item',
      '.contact__info',
      '.contact__form',
      '.section-header',
    ];

    const elements = qsa(revealSelectors.join(', '));
    if (elements.length === 0) return;

    elements.forEach((el) => el.classList.add('reveal'));

    // If IntersectionObserver isn't supported, just show everything.
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Respect reduced-motion preferences by revealing instantly.
    if (prefersReducedMotion()) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry, index) => {
          if (!entry.isIntersecting) return;

          // Small stagger for elements revealed together (cards, grids).
          const delay = Math.min(index * 60, 240);
          window.setTimeout(() => {
            entry.target.classList.add('is-visible');
          }, delay);

          obs.unobserve(entry.target);
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px',
      }
    );

    elements.forEach((el) => observer.observe(el));
  };

  /* ===================================================================
     7. STATISTICS COUNTER
     =================================================================== */
  const initStatsCounter = () => {
    const statValues = qsa('.hero__stat-value');
    if (statValues.length === 0 || !('IntersectionObserver' in window)) return;

    const statsContainer = qs('.hero__stats') || statValues[0].parentElement;

    const animateCount = (el) => {
      const rawText = el.textContent.trim();
      const match = rawText.match(/^(\d+)(.*)$/);

      // If the value isn't a leading number (unexpected content), skip animation.
      if (!match) return;

      const targetNumber = parseInt(match[1], 10);
      const suffix = match[2] || '';

      if (prefersReducedMotion() || Number.isNaN(targetNumber)) {
        el.textContent = `${targetNumber}${suffix}`;
        return;
      }

      const duration = 1400;
      let startTime = null;

      const step = (timestamp) => {
        if (startTime === null) startTime = timestamp;
        const progress = clamp((timestamp - startTime) / duration, 0, 1);
        // Ease-out for a natural deceleration toward the final value.
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(eased * targetNumber);

        el.textContent = `${currentValue}${suffix}`;

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          el.textContent = `${targetNumber}${suffix}`;
        }
      };

      window.requestAnimationFrame(step);
    };

    let hasAnimated = false;
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            hasAnimated = true;
            statValues.forEach(animateCount);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(statsContainer);
  };

  /* ===================================================================
     8. HERO FLOATING EFFECT + MOUSE PARALLAX
     Combined into one rAF render loop so transforms never overwrite
     one another.
     =================================================================== */
  const initHeroMotion = () => {
    const heroImage = qs('.hero__image');
    const heroFigure = qs('.hero__figure');
    const heroSection = qs('.hero');

    if (!heroImage && !heroFigure) return;
    if (prefersReducedMotion()) return;

    let floatPhase = 0;
    let parallax = { x: 0, y: 0 };
    let targetParallax = { x: 0, y: 0 };
    let rafId = null;

    const render = (timestamp) => {
      // Gentle vertical float, independent sine phases for a natural feel.
      floatPhase = timestamp / 1000;
      const floatImageY = Math.sin(floatPhase * 0.9) * 6;
      const floatFigureY = Math.sin(floatPhase * 0.6 + 1) * 4;

      // Smoothly ease parallax toward the current mouse target.
      parallax.x += (targetParallax.x - parallax.x) * 0.08;
      parallax.y += (targetParallax.y - parallax.y) * 0.08;

      if (heroImage) {
        heroImage.style.transform = `translate3d(${parallax.x}px, ${floatImageY + parallax.y}px, 0)`;
      }
      if (heroFigure) {
        heroFigure.style.transform = `translate3d(${parallax.x * 0.4}px, ${floatFigureY}px, 0)`;
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);

    // Mouse parallax — desktop only, very subtle.
    if (heroSection && isDesktopPointer()) {
      const MAX_OFFSET = 10;

      heroSection.addEventListener(
        'mousemove',
        rafThrottle((event) => {
          const bounds = heroSection.getBoundingClientRect();
          const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
          const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;

          targetParallax = {
            x: relativeX * MAX_OFFSET,
            y: relativeY * MAX_OFFSET,
          };
        })
      );

      heroSection.addEventListener('mouseleave', () => {
        targetParallax = { x: 0, y: 0 };
      });
    }

    // Stop the loop if the tab is hidden, resume when visible again.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!document.hidden && rafId === null) {
        rafId = window.requestAnimationFrame(render);
      }
    });
  };

  /* ===================================================================
     9. CARD HOVER ENHANCEMENT
     =================================================================== */
  const initCardHoverEnhancement = () => {
    if (prefersReducedMotion() || !isDesktopPointer()) return;

    const cards = qsa('.skill-card, .project, .certificate-card');
    if (cards.length === 0) return;

    const MAX_TILT = 3;

    cards.forEach((card) => {
      const handleMove = rafThrottle((event) => {
        const bounds = card.getBoundingClientRect();
        const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
        const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;

        const tiltX = (relativeY * MAX_TILT * -1).toFixed(2);
        const tiltY = (relativeX * MAX_TILT).toFixed(2);

        card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-2px)`;
      });

      const resetTilt = () => {
        card.style.transform = '';
      };

      card.addEventListener('mousemove', handleMove);
      card.addEventListener('mouseleave', resetTilt);
      card.addEventListener('blur', resetTilt);
    });
  };

  /* ===================================================================
     10. CONTACT FORM VALIDATION
     =================================================================== */
  const initContactForm = () => {
    const form = qs('#contact-form');
    if (!form) return;

    const fields = {
      name: qs('#contact-name', form),
      email: qs('#contact-email', form),
      subject: qs('#contact-subject', form),
      message: qs('#contact-message', form),
    };

    // Bail out gracefully if the expected fields aren't present.
    if (!fields.name || !fields.email || !fields.subject || !fields.message) return;

    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const ERROR_COLOR = '#F87171';
    const SUCCESS_COLOR = '#22D3EE';
    const DEFAULT_BORDER = '';

    // Create (once) a live-region status banner above the submit button.
    let statusBanner = qs('.contact__form-status', form);
    if (!statusBanner) {
      statusBanner = document.createElement('div');
      statusBanner.className = 'contact__form-status';
      statusBanner.setAttribute('role', 'status');
      statusBanner.setAttribute('aria-live', 'polite');
      statusBanner.style.cssText =
        'font-size:0.9rem;font-weight:500;border-radius:12px;padding:0.75rem 1rem;margin-top:0.5rem;display:none;';
      form.appendChild(statusBanner);
    }

    const errorMessageFor = (field) => {
      let el = field.parentElement.querySelector('.contact__field-error');
      if (!el) {
        el = document.createElement('p');
        el.className = 'contact__field-error';
        el.style.cssText = `color:${ERROR_COLOR};font-size:0.8rem;margin-top:0.35rem;`;
        field.parentElement.appendChild(el);
      }
      return el;
    };

    const setFieldError = (field, message) => {
      field.style.borderColor = ERROR_COLOR;
      field.setAttribute('aria-invalid', 'true');
      const errorEl = errorMessageFor(field);
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    };

    const clearFieldError = (field) => {
      field.style.borderColor = DEFAULT_BORDER;
      field.removeAttribute('aria-invalid');
      const errorEl = field.parentElement.querySelector('.contact__field-error');
      if (errorEl) errorEl.style.display = 'none';
    };

    const validateField = (field) => {
      const value = field.value.trim();

      if (!value) {
        setFieldError(field, 'This field is required.');
        return false;
      }

      if (field === fields.email && !EMAIL_PATTERN.test(value)) {
        setFieldError(field, 'Please enter a valid email address.');
        return false;
      }

      clearFieldError(field);
      return true;
    };

    // Validate on blur for immediate, non-intrusive feedback.
    Object.values(fields).forEach((field) => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    const showStatus = (message, type) => {
      statusBanner.textContent = message;
      statusBanner.style.display = 'block';
      statusBanner.style.background =
        type === 'success' ? 'rgba(34, 211, 238, 0.12)' : 'rgba(248, 113, 113, 0.12)';
      statusBanner.style.border =
        type === 'success' ? `1px solid ${SUCCESS_COLOR}` : `1px solid ${ERROR_COLOR}`;
      statusBanner.style.color = type === 'success' ? SUCCESS_COLOR : ERROR_COLOR;
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const validations = Object.values(fields).map(validateField);
      const isValid = validations.every(Boolean);

      if (!isValid) {
        showStatus('Please correct the highlighted fields before sending.', 'error');
        const firstInvalid = Object.values(fields).find(
          (field) => field.getAttribute('aria-invalid') === 'true'
        );
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // No backend is wired up on this static site — confirm locally.
      showStatus(
        `Thanks, ${fields.name.value.trim().split(' ')[0]}! Your message has been noted. I'll get back to you soon.`,
        'success'
      );
      form.reset();
      Object.values(fields).forEach(clearFieldError);
    });
  };

  /* ===================================================================
     11. TYPING EFFECT (hero subtitle)
     =================================================================== */
  const initTypingEffect = () => {
    const target = qs('.hero__paragraph');
    if (!target || prefersReducedMotion()) return;

    const fullText = target.textContent.trim();
    if (!fullText) return;

    target.textContent = '';
    target.style.borderRight = '2px solid var(--color-accent, #22D3EE)';
    target.style.paddingRight = '2px';

    const TYPE_SPEED_MIN = 28;
    const TYPE_SPEED_MAX = 55;
    const DELETE_SPEED = 18;
    const PAUSE_AFTER_TYPE = 2600;
    const PAUSE_AFTER_DELETE = 500;

    const randomSpeed = () =>
      TYPE_SPEED_MIN + Math.random() * (TYPE_SPEED_MAX - TYPE_SPEED_MIN);

    let charIndex = 0;
    let isDeleting = false;
    let timeoutId = null;

    const tick = () => {
      if (!isDeleting) {
        charIndex += 1;
        target.textContent = fullText.slice(0, charIndex);

        if (charIndex >= fullText.length) {
          isDeleting = true;
          timeoutId = window.setTimeout(tick, PAUSE_AFTER_TYPE);
          return;
        }
        timeoutId = window.setTimeout(tick, randomSpeed());
      } else {
        charIndex -= 1;
        target.textContent = fullText.slice(0, charIndex);

        if (charIndex <= 0) {
          isDeleting = false;
          timeoutId = window.setTimeout(tick, PAUSE_AFTER_DELETE);
          return;
        }
        timeoutId = window.setTimeout(tick, DELETE_SPEED);
      }
    };

    timeoutId = window.setTimeout(tick, 500);

    // Pause the loop while the tab isn't visible to save resources.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && timeoutId) {
        window.clearTimeout(timeoutId);
      }
    });
  };

  /* ===================================================================
     12. BUTTON RIPPLE EFFECT
     =================================================================== */
  const initButtonRipple = () => {
    if (prefersReducedMotion()) return;

    document.addEventListener('click', (event) => {
      const button = event.target.closest('.btn--primary');
      if (!button) return;

      const bounds = button.getBoundingClientRect();
      const size = Math.max(bounds.width, bounds.height) * 1.6;
      const x = event.clientX - bounds.left - size / 2;
      const y = event.clientY - bounds.top - size / 2;

      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position:absolute;
        left:${x}px;
        top:${y}px;
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        background:rgba(255,255,255,0.35);
        pointer-events:none;
        z-index:0;
      `;

      const computedPosition = window.getComputedStyle(button).position;
      if (computedPosition === 'static') {
        button.style.position = 'relative';
      }
      button.style.overflow = 'hidden';
      button.appendChild(ripple);

      const animation = ripple.animate(
        [
          { transform: 'scale(0)', opacity: 0.6 },
          { transform: 'scale(1)', opacity: 0 },
        ],
        { duration: 550, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );

      animation.onfinish = () => ripple.remove();
    });
  };

  /* ===================================================================
     INIT — everything runs after DOMContentLoaded
     =================================================================== */
  const init = () => {
    initLoadingScreen();
    initMobileNavigation();
    initScrollDrivenUI();
    initActiveNavHighlight();
    initSmoothScroll();
    initRevealOnScroll();
    initStatsCounter();
    initHeroMotion();
    initCardHoverEnhancement();
    initContactForm();
    initTypingEffect();
    initButtonRipple();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
