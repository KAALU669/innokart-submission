// InnoKart - Main Page Logic (Vanilla JavaScript)

document.addEventListener('DOMContentLoaded', () => {
  // Inventions grid, instant filtering/search, cart drawer & 6-tab detail modal are managed by js/cart.js
  initAuth();
  initMobileNavigation();
  initMakerSubmission();
  initFooterCategoryFilters();

  // Motion & Animation Modules
  initNavbarScroll();
  initActiveNavigation();
  initCardSpotlights();
  initCardTilt();
  initMagneticButtons();
  initButtonRipples();
  initCustomCursor();
  initVisibilityMotionPause();
  initHeroStatsCountUp();
  initNumbersCountUp();
  initScrollReveals();
  initSectionHeadingParallax();
  initAnchorSmoothScroll();
});

function initAuth() {
  const USER_KEY = 'innokart_users';
  const SESSION_KEY = 'innokart_session';
  const modal = document.getElementById('account-modal');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const accountButtons = [
    document.getElementById('account-open-btn'),
    document.getElementById('mobile-account-open')
  ].filter(Boolean);
  const demoLoginButton = document.getElementById('demo-login-btn');
  let session = null;
  let opener = null;
  let afterLogin = null;

  function readUsers() {
    const saved = localStorage.getItem(USER_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new TypeError('Saved account data is not a list.');
    return parsed.filter(user => user && typeof user.email === 'string' && typeof user.password === 'string');
  }

  function setFormError(form, text) {
    const error = form.querySelector('.account-form-error');
    if (!error) return;
    error.textContent = text;
    error.hidden = !text;
  }

  function setFieldError(input, message) {
    const formPrefix = input.form.id.replace('-form', '');
    const error = modal.querySelector(`[data-error-for="${formPrefix}-${input.name}"]`);
    if (error) {
      error.id = `${formPrefix}-${input.name}-error`;
      error.textContent = message;
      input.setAttribute('aria-describedby', error.id);
    }
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function updateAccountButtons() {
    const label = session ? 'Sign out' : 'Log in';
    accountButtons.forEach(button => {
      button.textContent = button.id === 'mobile-account-open' && !session
        ? 'Log in / Sign up'
        : label;
      button.setAttribute('aria-label', session ? `Sign out ${session.name}` : 'Log in or sign up');
    });
  }

  function logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      window.showToast('Sign-out could not be saved in browser storage.');
      return false;
    }
    session = null;
    updateAccountButtons();
    window.showToast('You have signed out.');
    return true;
  }

  function closeModal() {
    const canReceiveFocus = element => {
      if (!element || !element.isConnected || element.getClientRects().length === 0) return false;
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility === 'visible';
    };
    const focusTarget = canReceiveFocus(opener)
      ? opener
      : accountButtons.find(canReceiveFocus) || document.getElementById('mobile-toggle');
    if (focusTarget) focusTarget.focus();
    modal.hidden = true;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('account-modal-open');
    opener = null;
  }

  function openModal(options = {}) {
    opener = document.activeElement;
    afterLogin = typeof options.onSuccess === 'function' ? options.onSuccess : null;
    modal.hidden = false;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('account-modal-open');
    chooseMode(options.mode === 'signup' ? 'signup' : 'login');
    const focusTarget = (options.mode === 'signup' ? signupForm : loginForm).querySelector('input');
    if (focusTarget) focusTarget.focus();
  }

  function requireAuth(callback) {
    if (session) {
      if (typeof callback === 'function') callback();
      return true;
    }
    openModal({ onSuccess: callback });
    return false;
  }

  function saveSession(user) {
    const nextSession = {
      email: user.email,
      name: user.name || user.email.split('@')[0],
      signedAt: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    session = nextSession;
    updateAccountButtons();
    closeModal();
    const callback = afterLogin;
    afterLogin = null;
    if (callback) callback();
  }

  function validateAccountForm(form) {
    let isValid = true;
    for (const input of form.querySelectorAll('input[required]')) {
      const valid = input.checkValidity();
      const message = valid
        ? ''
        : input.type === 'email'
          ? 'Enter a valid email address.'
          : input.validity.tooShort
            ? 'Use at least 8 characters.'
            : 'This field is required.';
      setFieldError(input, message);
      isValid = isValid && valid;
    }
    return isValid;
  }

  function chooseMode(mode) {
    const signup = mode === 'signup';
    loginForm.hidden = signup;
    signupForm.hidden = !signup;
    document.querySelectorAll('[data-auth-mode]').forEach(button => {
      const active = button.dataset.authMode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    setFormError(loginForm, '');
    setFormError(signupForm, '');
  }

  function handleSignup(event) {
    event.preventDefault();
    setFormError(signupForm, '');
    if (!validateAccountForm(signupForm)) return;
    const formData = new FormData(signupForm);
    const user = {
      name: String(formData.get('name')).trim(),
      email: String(formData.get('email')).trim().toLowerCase(),
      password: String(formData.get('password'))
    };
    try {
      const users = readUsers();
      if (users.some(existing => existing.email.toLowerCase() === user.email)) {
        setFormError(signupForm, 'An account with this email already exists. Log in instead.');
        return;
      }
      localStorage.setItem(USER_KEY, JSON.stringify([...users, user]));
      saveSession(user);
      signupForm.reset();
    } catch (error) {
      setFormError(signupForm, error instanceof Error ? error.message : 'Could not save the account in this browser.');
    }
  }

  function handleLogin(event) {
    event.preventDefault();
    setFormError(loginForm, '');
    if (!validateAccountForm(loginForm)) return;
    const formData = new FormData(loginForm);
    const email = String(formData.get('email')).trim().toLowerCase();
    const password = String(formData.get('password'));
    try {
      const user = readUsers().find(entry =>
        entry.email.toLowerCase() === email && entry.password === password
      );
      if (!user) {
        setFormError(loginForm, 'Email or password is incorrect. You can also use Demo login.');
        return;
      }
      saveSession(user);
      loginForm.reset();
    } catch (error) {
      setFormError(loginForm, error instanceof Error ? error.message : 'Could not read local account data.');
    }
  }

  function handleDemoLogin() {
    const user = {
      name: 'Demo Judge',
      email: 'judge@innokart.demo',
      password: ''
    };
    try {
      const users = readUsers();
      if (!users.some(existing => existing.email.toLowerCase() === user.email)) {
        localStorage.setItem(USER_KEY, JSON.stringify([...users, user]));
      }
      saveSession(user);
    } catch (error) {
      setFormError(loginForm, error instanceof Error ? error.message : 'Demo login could not be saved locally.');
    }
  }

  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') session = parsed;
    }
  } catch (error) {
    session = null;
    setFormError(loginForm, 'Saved login data could not be read. Please log in again.');
  }
  updateAccountButtons();

  accountButtons.forEach(button => button.addEventListener('click', () => {
    if (!session) {
      openModal();
      return;
    }
    logout();
  }));
  document.querySelectorAll('[data-auth-mode]').forEach(button => {
    button.addEventListener('click', () => chooseMode(button.dataset.authMode));
  });
  document.getElementById('account-modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });
  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);
  demoLoginButton.addEventListener('click', handleDemoLogin);
  modal.querySelectorAll('[data-password-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const input = button.parentElement.querySelector('input');
      const showing = input.type === 'password';
      input.type = showing ? 'text' : 'password';
      button.textContent = showing ? 'Hide' : 'Show';
      button.setAttribute('aria-label', `${showing ? 'Hide' : 'Show'} password`);
    });
  });
  modal.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        setFieldError(input, input.checkValidity() ? '' : 'Enter a valid value.');
      }
    });
  });

  window.addEventListener('storage', event => {
    if (event.key !== SESSION_KEY) return;
    try {
      session = event.newValue ? JSON.parse(event.newValue) : null;
    } catch (error) {
      session = null;
    }
    updateAccountButtons();
  });

  window.InnoAuth = {
    open: openModal,
    requireAuth,
    isAuthenticated: () => Boolean(session),
    getUser: () => session ? { ...session } : null,
    logout
  };
}

/**
 * Mobile Navigation Toggle
 */
function initMobileNavigation() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('is-open');
    toggleBtn.classList.toggle('is-open', isOpen);
    toggleBtn.setAttribute('aria-expanded', isOpen.toString());
    document.documentElement.classList.toggle('nav-open', isOpen);
  });

  const closeMenu = () => {
    navMenu.classList.remove('is-open');
    toggleBtn.classList.remove('is-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('nav-open');
  };

  // Close menu when clicking nav links
  navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navMenu.classList.contains('is-open')) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMenu();
  }, { passive: true });
}

/**
 * Maker Submission Button Action
 */
function initMakerSubmission() {
  const form = document.getElementById('maker-submission-form');
  const message = document.getElementById('maker-form-message');
  const submissionsList = document.getElementById('maker-submissions-list');
  const submitButton = form && form.querySelector('button[type="submit"]');
  const problem = document.getElementById('maker-problem');
  const counter = document.getElementById('maker-problem-counter');
  if (!form || !message || !problem || !counter || !submissionsList || !submitButton) return;

  const updateProblemCounter = () => {
    counter.textContent = `${problem.value.length} / 200`;
  };
  const updateSubmitState = () => {
    submitButton.disabled = !form.checkValidity();
  };
  const updateFieldError = (field, reveal) => {
    let error = field.parentElement.querySelector('.inline-field-error');
    const validity = field.validity;
    const text = validity.valueMissing
      ? 'This field is required.'
      : validity.typeMismatch
        ? field.type === 'email' ? 'Enter a valid email address.' : 'Enter a valid value.'
        : validity.patternMismatch
          ? field.name === 'phone' ? 'Enter a 10-digit phone number.' : 'Enter a 6-digit pincode.'
          : '';
    if (!error && reveal) {
      error = document.createElement('span');
      error.className = 'inline-field-error';
      error.id = `${field.id}-validation-error`;
      field.parentElement.appendChild(error);
      field.setAttribute('aria-describedby', error.id);
    }
    if (error) error.textContent = reveal ? text : '';
    field.setAttribute('aria-invalid', reveal && text ? 'true' : 'false');
  };
  const renderSubmissions = () => {
    submissionsList.replaceChildren();
    try {
      const saved = localStorage.getItem('innokart_submissions');
      const submissions = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(submissions)) throw new TypeError('Saved submissions must be a list.');
      if (submissions.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'maker-submissions-empty';
        empty.textContent = 'Your submitted gadgets will appear here.';
        submissionsList.appendChild(empty);
        return;
      }
      submissions.slice().reverse().forEach((submission) => {
        if (!submission || typeof submission !== 'object') return;
        const card = document.createElement('article');
        card.className = 'maker-submission-card';
        const title = document.createElement('strong');
        title.textContent = submission.inventionName || 'Untitled gadget';
        const details = document.createElement('span');
        details.textContent = `${submission.category || 'Other'} · ${submission.reference || 'Submitted'} · ${submission.status || 'submitted'}`;
        card.append(title, details);
        submissionsList.appendChild(card);
      });
    } catch (error) {
      const notice = document.createElement('p');
      notice.className = 'maker-submissions-empty is-error';
      notice.textContent = 'Saved submissions could not be loaded in this browser.';
      submissionsList.appendChild(notice);
    }
  };
  updateProblemCounter();
  renderSubmissions();
  updateSubmitState();
  problem.addEventListener('input', updateProblemCounter);

  form.addEventListener('input', () => {
    message.textContent = '';
    message.classList.remove('is-error', 'is-success');
    const field = document.activeElement;
    if (field && field.form === form && field.matches('input, select, textarea')
      && field.parentElement.querySelector('.inline-field-error')) {
      updateFieldError(field, true);
    }
    updateSubmitState();
  });
  form.addEventListener('change', updateSubmitState);
  form.addEventListener('focusout', event => {
    if (event.target.matches('input, select, textarea')) updateFieldError(event.target, true);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    const fields = Object.fromEntries(new FormData(form).entries());
    const requiredNames = ['name', 'email', 'phone', 'pincode', 'inventionName', 'category', 'problem', 'howItWorks', 'components'];
    const hasMissingRequiredField = requiredNames.some((name) => !String(fields[name] || '').trim());
    const videoUrl = String(fields.videoUrl || '').trim();
    const videoUrlIsSafe = !videoUrl || (() => {
      try {
        const parsed = new URL(videoUrl);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    })();

    if (hasMissingRequiredField || !form.checkValidity() || !videoUrlIsSafe) {
      message.textContent = !videoUrlIsSafe
        ? 'Enter a valid http or https build-video link, or leave it blank.'
        : 'Please complete each required field with a valid email address.';
      message.classList.add('is-error');
      form.querySelectorAll('input, select, textarea').forEach(field => {
        if (!field.checkValidity()) updateFieldError(field, true);
      });
      form.reportValidity();
      updateSubmitState();
      return;
    }

    const storageKey = 'innokart_submissions';
    let submissions;
    try {
      const saved = localStorage.getItem(storageKey);
      submissions = saved === null ? [] : JSON.parse(saved);
      if (!Array.isArray(submissions)) {
        throw new TypeError('Saved submissions must be an array.');
      }
    } catch (error) {
      message.textContent = 'Your submission could not be saved because existing submission data could not be read.';
      message.classList.add('is-error');
      updateSubmitState();
      return;
    }

    let reference;
    do {
      reference = `INK-${Math.floor(10000 + Math.random() * 90000)}`;
    } while (submissions.some((submission) => submission && submission.reference === reference));

    const submission = {
      reference,
      name: String(fields.name).trim(),
      email: String(fields.email).trim(),
      phone: String(fields.phone).trim(),
      pincode: String(fields.pincode).trim(),
      inventionName: String(fields.inventionName).trim(),
      category: String(fields.category),
      problem: String(fields.problem).trim(),
      howItWorks: String(fields.howItWorks).trim(),
      components: String(fields.components).trim(),
      videoUrl,
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify([...submissions, submission]));
    } catch (error) {
      message.textContent = 'Your submission could not be saved. Check your browser storage and try again.';
      message.classList.add('is-error');
      updateSubmitState();
      return;
    }

    form.reset();
    form.querySelectorAll('.inline-field-error').forEach(error => { error.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(field => field.setAttribute('aria-invalid', 'false'));
    updateProblemCounter();
    renderSubmissions();
    message.textContent = `Thank you! Your invention was submitted. Reference: ${reference}`;
    message.classList.add('is-success');
    updateSubmitState();
  });
}

function initFooterCategoryFilters() {
  document.querySelectorAll('.site-footer [data-category]').forEach(link => {
    link.addEventListener('click', () => {
      const category = link.dataset.category;
      const filter = Array.from(document.querySelectorAll('#category-filter .filter-btn'))
        .find(button => button.dataset.category === category);
      if (filter) filter.click();
    });
  });
}

function initActiveNavigation() {
  const links = Array.from(document.querySelectorAll('#nav-menu .nav-link[href^="#"]'));
  const targets = links
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if (!targets.length || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach(link => {
      const active = link.getAttribute('href') === `#${visible.target.id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-25% 0px -60% 0px', threshold: [0, 0.05, 0.25] });
  targets.forEach(target => observer.observe(target));
}

/**
 * Simple Toast Notification
 */
let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById('toast-notice');
  const msgEl = document.getElementById('toast-msg');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.add('show');

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

/* ==========================================================================
   Motion System (cubic-bezier(.2,.8,.2,1), vanilla JS, no external libraries)
   ========================================================================== */

/**
 * Parametric Cubic Bezier solver for cubic-bezier(.2, .8, .2, 1)
 */
function createCubicBezier(p1x, p1y, p2x, p2y) {
  return function (t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 6; i++) {
      const currentX = 3 * (1 - u) * (1 - u) * u * p1x + 3 * (1 - u) * u * u * p2x + u * u * u;
      const dx = 3 * (1 - u) * (1 - u) * p1x + 6 * (1 - u) * u * (p2x - p1x) + 3 * u * u * (1 - p2x);
      if (Math.abs(currentX - t) < 0.001 || dx === 0) break;
      u -= (currentX - t) / dx;
      u = Math.max(0, Math.min(1, u));
    }
    return 3 * (1 - u) * (1 - u) * u * p1y + 3 * (1 - u) * u * u * p2y + u * u * u;
  };
}

const easeCurve = createCubicBezier(0.2, 0.8, 0.2, 1.0);

/**
 * Navbar: Transparent at top, becomes blurred dark bar with bottom border after 40px of scroll
 */
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const updateNavbar = () => {
    if (window.scrollY > 40) {
      navbar.classList.add('is-scrolled');
    } else {
      navbar.classList.remove('is-scrolled');
    }
  };

  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();
}

/**
 * Product cards: Soft orange spotlight following cursor via --mx and --my
 */
function initCardSpotlights() {
  const grid = document.getElementById('inventions-grid');
  if (!grid) return;

  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (isTouch) return;

  grid.addEventListener('mousemove', (e) => {
    const card = e.target.closest('.invention-card');
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mx', `${x}px`);
    card.style.setProperty('--my', `${y}px`);
  });

  grid.addEventListener('mouseleave', (e) => {
    const card = e.target.closest('.invention-card');
    if (card) {
      card.style.setProperty('--mx', '-500px');
      card.style.setProperty('--my', '-500px');
    }
  }, true);
}

/**
 * Primary buttons: Magnetic pull toward cursor (max 8px, desktop only)
 */
function initMagneticButtons() {
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (isTouch) return;

  document.addEventListener('mousemove', (e) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const btn = e.target.closest('.btn-primary');
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;

    const maxPull = 8;
    const pullX = Math.max(-maxPull, Math.min(maxPull, deltaX * 0.35));
    const pullY = Math.max(-maxPull, Math.min(maxPull, deltaY * 0.35));

    btn.style.transform = `translate(${pullX}px, ${pullY}px)`;
  });

  document.addEventListener('mouseout', (e) => {
    const btn = e.target.closest('.btn-primary');
    if (btn && (!e.relatedTarget || !btn.contains(e.relatedTarget))) {
      btn.style.transform = '';
    }
  });
}

function initButtonRipples() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('button, .btn');
    if (!button || button.disabled) return;

    const rect = button.getBoundingClientRect();
    const diameter = Math.max(rect.width, rect.height) * 1.8;
    const ripple = document.createElement('span');
    ripple.className = 'button-ripple';
    if (getComputedStyle(button).position === 'static') button.style.position = 'relative';
    button.classList.add('has-button-ripple');
    ripple.style.width = `${diameter}px`;
    ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - diameter / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - diameter / 2}px`;
    button.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}

function initCardTilt() {
  const grid = document.getElementById('inventions-grid');
  if (!grid) return;

  let touchDrag = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function resetCard(card) {
    if (!card) return;
    card.classList.remove('is-tilting');
    card.style.removeProperty('--card-tilt-x');
    card.style.removeProperty('--card-tilt-y');
  }

  function setTilt(card, rotateX, rotateY) {
    if (!card.classList.contains('is-revealed')) return;
    card.style.setProperty('--card-tilt-x', `${rotateX}deg`);
    card.style.setProperty('--card-tilt-y', `${rotateY}deg`);
    card.classList.add('is-tilting');
  }

  grid.addEventListener('pointerdown', (event) => {
    const card = event.target.closest('.invention-card');
    if (!card || event.pointerType !== 'touch') return;
    touchDrag = {
      card,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false
    };
  });

  grid.addEventListener('pointermove', (event) => {
    const card = event.target.closest('.invention-card');
    if (!card) return;

    if (event.pointerType === 'touch') {
      if (!touchDrag || touchDrag.card !== card) return;
      const dx = event.clientX - touchDrag.startX;
      const dy = event.clientY - touchDrag.startY;
      if (!touchDrag.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        touchDrag.dragging = true;
      }
      if (!touchDrag.dragging) return;
      setTilt(card, clamp(-dy / 12, -5, 5), clamp(dx / 12, -6, 6));
      return;
    }

    if (event.pointerType !== 'mouse' || !card.classList.contains('is-revealed')) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt(card, clamp(-y * 7, -4, 4), clamp(x * 9, -5, 5));
  });

  function endTouchDrag() {
    if (touchDrag && touchDrag.dragging) {
      touchDrag.card.dataset.tiltDragged = 'true';
      resetCard(touchDrag.card);
    }
    touchDrag = null;
  }

  grid.addEventListener('pointerup', endTouchDrag);
  grid.addEventListener('pointercancel', endTouchDrag);
  document.addEventListener('pointerup', endTouchDrag);
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.invention-card');
    if (!card || card.dataset.tiltDragged !== 'true') return;
    delete card.dataset.tiltDragged;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);
  grid.addEventListener('pointerleave', (event) => {
    const card = event.target.closest('.invention-card');
    if (event.pointerType === 'mouse') resetCard(card);
  }, true);
}

function initCustomCursor() {
  const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!desktopPointer.matches || reducedMotion.matches || window.innerWidth <= 768) return;

  const cursor = document.createElement('span');
  cursor.className = 'custom-cursor-orb';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursor);
  document.documentElement.classList.add('has-custom-cursor');

  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || document.hidden) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    cursor.classList.add('is-visible');
    const target = event.target.closest('a, button, [role="button"]');
    cursor.classList.toggle('is-interactive', Boolean(target));
    if (frame) return;

    frame = requestAnimationFrame(() => {
      cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
      frame = 0;
    });
  }, { passive: true });

  document.addEventListener('pointerdown', () => cursor.classList.add('is-pressed'));
  document.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      cursor.classList.remove('is-visible', 'is-pressed');
    }
  });
  reducedMotion.addEventListener('change', (event) => {
    if (event.matches) {
      cursor.remove();
      document.documentElement.classList.remove('has-custom-cursor');
    }
  });
}

function initVisibilityMotionPause() {
  const updateMotionState = () => {
    document.documentElement.classList.toggle('motion-paused', document.hidden);
  };
  document.addEventListener('visibilitychange', updateMotionState);
  updateMotionState();
}

/**
 * Hero stats: Count up from 0 once when they enter the view (<600ms, unified easing)
 */
function initHeroStatsCountUp() {
  const heroStatsWrap = document.querySelector('.hero-stats');
  if (!heroStatsWrap) return;

  const countEl = document.getElementById('hero-stat-count');
  const recycledEl = document.getElementById('hero-stat-recycled');
  const statValues = heroStatsWrap.querySelectorAll('.hero-stat-value');
  const testedEl = statValues.length > 1 ? statValues[1] : null;

  const targetCount = (countEl && countEl.dataset.target)
    ? parseInt(countEl.dataset.target, 10)
    : (Array.isArray(inventions) ? inventions.length : 6);
  const targetTested = 100;
  const targetRecycled = (recycledEl && recycledEl.dataset.target)
    ? parseInt(recycledEl.dataset.target, 10)
    : 60;

  const items = [
    { el: countEl, target: targetCount, suffix: '' },
    { el: testedEl, target: targetTested, suffix: '%' },
    { el: recycledEl, target: targetRecycled, suffix: '%' }
  ];

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(item => {
      if (item.el) setStatValue(item.el, item.target, item.suffix);
    });
    return;
  }

  // Set initial state to 0
  items.forEach(item => {
    if (item.el) setStatValue(item.el, 0, item.suffix);
  });

  let hasAnimated = false;
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasAnimated) {
        hasAnimated = true;
        obs.unobserve(entry.target);
        items.forEach(item => {
          if (item.el) {
            animateCountUp(item.el, item.target, item.suffix, 550);
          }
        });
      }
    });
  }, {
    threshold: 0.15
  });

  observer.observe(heroStatsWrap);
}

function animateCountUp(element, targetVal, suffix = '', duration = 550) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setStatValue(element, targetVal, suffix);
    return;
  }

  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeCurve(progress);
    const current = Math.round(eased * targetVal);
    setStatValue(element, current, suffix);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      setStatValue(element, targetVal, suffix);
    }
  }
  requestAnimationFrame(step);
}

function setStatValue(element, value, suffix) {
  element.textContent = String(value);
  if (suffix) {
    if (suffix === 'Days') element.appendChild(document.createTextNode(' '));
    const percent = document.createElement('span');
    percent.textContent = suffix;
    element.appendChild(percent);
  }
}

function initNumbersCountUp() {
  const row = document.querySelector('.numbers-row');
  if (!row || typeof IntersectionObserver === 'undefined') return;

  const catalog = Array.isArray(inventions) ? inventions : [];
  const avg = (field) => catalog.length
    ? Math.round(catalog.reduce((sum, item) => sum + Number(item[field] || 0), 0) / catalog.length)
    : 0;
  const items = [
    { el: document.getElementById('stat-total-inventions'), target: catalog.length, suffix: '' },
    { el: document.getElementById('stat-avg-build-days'), target: avg('buildDays'), suffix: 'Days' },
    { el: document.getElementById('stat-avg-recycled'), target: avg('recycledPercent'), suffix: '%' }
  ].filter(item => item.el);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(item => setStatValue(item.el, item.target, item.suffix));
    return;
  }

  items.forEach(item => setStatValue(item.el, 0, item.suffix));
  const observer = new IntersectionObserver((entries, obs) => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    obs.disconnect();
    items.forEach(item => animateCountUp(item.el, item.target, item.suffix, 850));
  }, { threshold: 0.08, rootMargin: '0px 0px 60px 0px' });
  observer.observe(row);
}

/**
 * Scroll Reveal: Fade + 30px rise, staggered 70ms per item in a group
 */
let revealObserver = null;
let revealIsMobile = null;

function initScrollReveals() {
  if (revealObserver) {
    revealObserver.disconnect();
  }

  revealIsMobile = window.matchMedia('(max-width: 768px)').matches;
  revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        animateRecycledRing(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: revealIsMobile ? '0px 0px 120px 0px' : '0px 0px -40px 0px',
    threshold: revealIsMobile ? 0.01 : 0.08
  });

  // Groups with 70ms stagger per child
  const groups = [
    { container: '.steps-strip', items: '.step-card' },
    { container: '.numbers-row', items: '.number-card' },
    { container: '.inside-tech-points', items: '.inside-point-card' },
    { container: '.footer-top', items: '.footer-brand, .footer-links-group, .footer-contact' }
  ];

  groups.forEach(g => {
    const parent = document.querySelector(g.container);
    if (!parent) return;
    const children = parent.querySelectorAll(g.items);
    children.forEach((child, idx) => {
      child.classList.add('reveal-item');
      child.style.setProperty('--reveal-delay', `${idx * 70}ms`);
      revealObserver.observe(child);
    });
  });

  // Standalone section elements
  const standaloneSelectors = [
    '.section-head',
    '.inventions-toolbar',
    '.filter-bar',
    '.inside-tech-content',
    '.passport-preview-card',
    '.cta-card',
    '.numbers-row',
    '#calculator .container > *',
    '#makers .container > *'
  ];

  standaloneSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.classList.add('reveal-item');
      el.style.setProperty('--reveal-delay', '0ms');
      revealObserver.observe(el);
    });
  });

  observeInventionCards();
}

window.addEventListener('resize', () => {
  if (revealIsMobile !== window.matchMedia('(max-width: 768px)').matches) {
    initScrollReveals();
  }
}, { passive: true });

function observeInventionCards() {
  const grid = document.getElementById('inventions-grid');
  if (!grid || !revealObserver) return;

  const cards = grid.querySelectorAll('.invention-card');
  cards.forEach((card, idx) => {
    card.classList.add('reveal-item');
    card.style.setProperty('--reveal-delay', `${idx * 70}ms`);
    revealObserver.observe(card);
  });
}

function animateRecycledRing(card) {
  const ring = card.querySelector('.recycled-ring-value');
  if (!ring || ring.dataset.animated === 'true') return;

  ring.dataset.animated = 'true';
  const target = Math.max(0, Math.min(100, Number(ring.dataset.target) || 0));
  const endOffset = 100 - target;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof ring.animate !== 'function') {
    ring.setAttribute('stroke-dashoffset', String(endOffset));
    return;
  }

  ring.animate([
    { strokeDashoffset: 100 },
    { strokeDashoffset: endOffset }
  ], {
    duration: 900,
    easing: 'cubic-bezier(.2,.8,.2,1)',
    fill: 'forwards'
  });
}

function initSectionHeadingParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || typeof IntersectionObserver === 'undefined') return;

  const headings = [...document.querySelectorAll('main > section:not(#hero) .section-headline')];
  if (!headings.length) return;

  const visibleHeadings = new Set();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleHeadings.add(entry.target);
      else {
        visibleHeadings.delete(entry.target);
        entry.target.style.removeProperty('--heading-parallax');
      }
    });
  }, { rootMargin: '80px 0px' });
  headings.forEach(heading => observer.observe(heading));

  let frame = 0;
  const update = () => {
    frame = 0;
    if (document.hidden) return;
    visibleHeadings.forEach(heading => {
      const rect = heading.getBoundingClientRect();
      const offset = Math.max(-10, Math.min(10, (window.innerHeight * 0.52 - rect.top) * -0.018));
      heading.style.setProperty('--heading-parallax', `${offset.toFixed(2)}px`);
    });
  };
  const schedule = () => {
    if (!frame && !document.hidden) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('visibilitychange', schedule);
}

/**
 * Smooth scroll to anchors with offset for fixed navbar (<600ms, unified easing)
 */
function initAnchorSmoothScroll() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();

    const navbar = document.getElementById('navbar');
    const navHeight = navbar ? navbar.offsetHeight : 72;
    const targetY = Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - (navHeight + 16));

    if (history.pushState) {
      history.pushState(null, '', href);
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, targetY);
      return;
    }

    smoothScrollTo(targetY, 550);
  });
}

function smoothScrollTo(targetY, duration = 550) {
  const startY = window.pageYOffset;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) return;

  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeCurve(progress);
    window.scrollTo(0, startY + distance * eased);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

// Global hooks for cart.js and motion system
window.showToast = showToast;
window.observeInventionCards = observeInventionCards;
