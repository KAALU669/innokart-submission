(function () {
  'use strict';

  const overlay = document.getElementById('intro');
  const canvas = document.getElementById('intro-canvas');
  const context = canvas ? canvas.getContext('2d') : null;
  const brand = overlay ? overlay.querySelector('.intro-brand') : null;
  const wordmark = overlay ? overlay.querySelector('.intro-wordmark') : null;
  const tagline = overlay ? overlay.querySelector('.intro-tagline') : null;
  const sweep = overlay ? overlay.querySelector('.intro-sweep') : null;
  const skipButton = overlay ? overlay.querySelector('.intro-skip') : null;
  const markPaths = overlay ? overlay.querySelectorAll('.intro-mark path') : [];
  const duration = 2.3;
  const noIntro = new URLSearchParams(window.location.search).get('nointro') === '1';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shouldPlay = !noIntro && !reducedMotion;
  if (shouldPlay) {
    try {
      shouldPlay = sessionStorage.getItem('inno_intro_seen') !== '1';
    } catch (error) {
      console.warn('Unable to read intro session state; playing intro for this visit.', error);
    }
  }
  let frame = 0;
  let entranceFrame = 0;
  let startedAt = 0;
  let completed = false;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let lastTime = 0;
  let canvasFresh = true;
  let slowFrames = 0;
  let particlesReduced = false;
  const mobile = window.innerWidth <= 768;
  const particles = [];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothstep(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function sunXPosition() {
    return window.innerWidth <= 768 || window.innerHeight <= 520 ? 0.68 : 0.8;
  }

  function sizeCanvas() {
    if (!canvas || !context) return;
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    canvasFresh = true;
  }

  function createParticles() {
    const count = mobile ? 50 : 120;
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        phase: Math.random() * Math.PI * 2,
        size: 0.6 + Math.random() * 1.2,
        driftX: (Math.random() - 0.5) * 0.012,
        driftY: (Math.random() - 0.5) * 0.012,
        trailX: 0,
        trailY: 0,
        trailReady: false
      });
    }
  }

  function initializeMark() {
    for (let i = 0; i < markPaths.length; i += 1) {
      const path = markPaths[i];
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.dataset.length = `${length}`;
    }
  }

  function drawParticles(elapsed, delta) {
    const spiral = smoothstep((elapsed - 0.4) / 0.6);
    context.beginPath();
    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      if (elapsed < 0.4) {
        particle.x += particle.driftX * delta;
        particle.y += particle.driftY * delta;
        if (particle.x < -0.05) particle.x = 1.05;
        if (particle.x > 1.05) particle.x = -0.05;
        if (particle.y < -0.05) particle.y = 1.05;
        if (particle.y > 1.05) particle.y = -0.05;
      }

      const originX = particle.x * width;
      const originY = particle.y * height;
      const offsetX = originX - width * 0.5;
      const offsetY = originY - height * 0.5;
      const angle = particle.phase + spiral * 2.8;
      const radiusScale = 1 - spiral * 0.92;
      const x = width * 0.5 + (offsetX * Math.cos(angle) - offsetY * Math.sin(angle)) * radiusScale;
      const y = height * 0.5 + (offsetX * Math.sin(angle) + offsetY * Math.cos(angle)) * radiusScale;
      const twinkle = 0.55 + (Math.sin(elapsed * 5.2 + particle.phase) + 1) * 0.225;

      if (particle.trailReady && elapsed >= 0.4 && elapsed <= 1) {
        context.moveTo(particle.trailX, particle.trailY);
        context.lineTo(x, y);
      }
      context.moveTo(x + particle.size * twinkle, y);
      context.arc(x, y, particle.size * twinkle, 0, Math.PI * 2);
      particle.trailX = x;
      particle.trailY = y;
      particle.trailReady = true;
    }
    context.globalAlpha = 0.3 + spiral * 0.2;
    context.lineWidth = 1;
    context.strokeStyle = '#f2a05a';
    context.stroke();
    context.globalAlpha = 0.7;
    context.fillStyle = '#ffc17b';
    context.fill();
  }

  function drawHorizontalLine(progress) {
    if (progress <= 0) return;
    const halfWidth = width * 0.48 * smoothstep(progress);
    context.globalAlpha = 0.9 * (1 - progress * 0.35);
    context.lineWidth = 1;
    context.strokeStyle = '#f5a158';
    context.shadowColor = '#e08a4a';
    context.shadowBlur = 14;
    context.beginPath();
    context.moveTo(width * 0.5 - halfWidth, height * 0.5);
    context.lineTo(width * 0.5 + halfWidth, height * 0.5);
    context.stroke();
    context.shadowBlur = 0;
  }

  function drawEnergyRings(progress) {
    context.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const rank = (i + 1) / 5;
      const pulse = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      const radius = width * (0.025 + rank * 0.07 + pulse * 0.11);
      context.ellipse(width * 0.5, height * 0.5, radius, radius * 0.18, 0, 0, Math.PI * 2);
    }
    context.globalAlpha = 0.22;
    context.lineWidth = 1.2;
    context.strokeStyle = '#f0a35f';
    context.shadowColor = '#e08a4a';
    context.shadowBlur = 8;
    context.stroke();
    context.shadowBlur = 0;
  }

  function drawBeam(progress) {
    if (progress <= 0) return;
    const rise = smoothstep(progress);
    const beamHeight = height * 0.42 * rise;
    context.globalAlpha = 0.7 * (1 - rise * 0.32);
    context.lineWidth = 1.4;
    context.strokeStyle = '#ffd6a2';
    context.shadowColor = '#f6a85f';
    context.shadowBlur = 18;
    context.beginPath();
    context.moveTo(width * 0.5, height * 0.5);
    context.lineTo(width * 0.5, height * 0.5 - beamHeight);
    context.stroke();
    context.shadowBlur = 0;
  }

  function drawLogoRipple(progress) {
    if (progress <= 0 || progress >= 1) return;
    const p = smoothstep(progress);
    const radius = width * (0.04 + p * 0.4);
    context.globalAlpha = (1 - p) * 0.45;
    context.lineWidth = 1.2;
    context.strokeStyle = '#e99a58';
    context.shadowColor = '#e08a4a';
    context.shadowBlur = 12;
    context.beginPath();
    context.ellipse(width * 0.5, height * 0.5, radius, radius * 0.18, 0, 0, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 0;
  }

  function drawHorizon(progress) {
    if (progress <= 0) return;
    const p = smoothstep(progress);
    context.globalAlpha = (1 - progress * 0.35) * 0.8;
    context.lineWidth = 1.5 + p * 2;
    context.strokeStyle = '#f2a35e';
    context.shadowColor = '#f18c43';
    context.shadowBlur = 18;
    context.beginPath();
    context.ellipse(width * 0.5, height * 1.07, width * (0.08 + p * 0.72), height * (0.015 + p * 0.72), 0, Math.PI, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 0;
  }

  function drawFlash(elapsed) {
    const flash = clamp(1 - Math.abs(elapsed - 0.96) / 0.04, 0, 1) * 0.12;
    if (flash <= 0) return;
    context.globalAlpha = flash;
    context.fillStyle = '#fff0dc';
    context.fillRect(0, 0, width, height);
  }

  function updateBrand(elapsed) {
    const reveal = smoothstep((elapsed - 1.12) / 0.68);
    const exit = smoothstep((elapsed - 1.8) / 0.5);
    const scale = 0.92 + reveal * 0.08 + exit * 0.15;
    const opacity = reveal * (1 - exit);
    brand.style.transform = `translate(-50%, -50%) scale(${scale})`;
    brand.style.opacity = `${opacity}`;

    const wipe = smoothstep((elapsed - 1.2) / 0.38);
    wordmark.style.clipPath = `inset(0 ${(1 - wipe) * 100}% 0 0)`;
    const glowProgress = clamp((elapsed - 1.2) / 0.58, 0, 1);
    const glow = glowProgress < 0.55
      ? glowProgress / 0.55 * 40
      : 40 - (glowProgress - 0.55) / 0.45 * 22;
    wordmark.style.textShadow = `0 0 ${glow}px rgba(224, 138, 74, ${0.15 + reveal * 0.45})`;

    const taglineProgress = smoothstep((elapsed - 1.42) / 0.32);
    tagline.style.opacity = `${taglineProgress * (1 - exit)}`;
    tagline.style.letterSpacing = `${0.6 - taglineProgress * 0.3}em`;

    const iconProgress = smoothstep((elapsed - 1) / 0.3);
    for (let i = 0; i < markPaths.length; i += 1) {
      const length = Number(markPaths[i].dataset.length);
      markPaths[i].style.strokeDashoffset = `${length * (1 - iconProgress)}`;
    }
  }

  function draw(elapsed, delta) {
    if (canvasFresh || elapsed < 0.4) {
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
      context.fillStyle = '#0A0705';
      context.fillRect(0, 0, width, height);
      canvasFresh = false;
    } else {
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 0.22;
      context.fillStyle = '#0A0705';
      context.fillRect(0, 0, width, height);
    }

    context.globalCompositeOperation = 'lighter';
    context.globalAlpha = 1;
    drawParticles(elapsed, delta);
    drawHorizontalLine(clamp(elapsed / 0.4, 0, 1));

    const energyProgress = clamp((elapsed - 0.4) / 0.6, 0, 1);
    if (elapsed >= 0.4 && elapsed <= 1) {
      drawEnergyRings(energyProgress);
      drawBeam(energyProgress);
    }

    drawFlash(elapsed);
    drawLogoRipple(clamp((elapsed - 1) / 0.8, 0, 1));
    drawHorizon(clamp((elapsed - 1.8) / 0.5, 0, 1));
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }

  function completeIntro() {
    if (completed) return;
    completed = true;
    if (frame) cancelAnimationFrame(frame);
    if (entranceFrame) cancelAnimationFrame(entranceFrame);
    window.removeEventListener('resize', sizeCanvas);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('pointerdown', onSkipPointerDown, true);
    if (skipButton) skipButton.removeEventListener('click', finishIntro);
    document.removeEventListener('click', onSkipClick, true);
    if (skipButton && document.activeElement === skipButton) skipButton.blur();
    if (overlay) overlay.remove();
    document.documentElement.classList.remove('intro-active');
    document.documentElement.classList.add('intro-done', 'intro-entering');
    window.innoIntroDone = true;
    window.dispatchEvent(new CustomEvent('intro:done', {
      detail: { sunX: sunXPosition() }
    }));
    clearEntranceClass();
  }

  function finishIntro() {
    if (completed) return;
    if (overlay && canvas && context) {
      draw(duration, 0);
      updateBrand(duration);
      if (sweep) sweep.style.opacity = '0';
      if (overlay) overlay.style.clipPath = 'inset(0 0 0 100%)';
    }
    completeIntro();
  }

  function animationFrame(now) {
    if (completed) return;
    const frameTime = now - lastTime;
    const elapsed = clamp((now - startedAt) / 1000, 0, duration);
    const delta = Math.min(Math.max(frameTime / 1000, 0), 0.05);
    lastTime = now;
    if (frameTime > 28) {
      slowFrames += 1;
      if (slowFrames >= 10 && !particlesReduced) {
        particles.length = Math.ceil(particles.length / 2);
        particlesReduced = true;
      }
    } else {
      slowFrames = 0;
    }

    draw(elapsed, delta);
    updateBrand(elapsed);

    const exitProgress = clamp((elapsed - 2) / 0.3, 0, 1);
    if (overlay) overlay.style.clipPath = `inset(0 ${exitProgress * 100}% 0 0)`;
    if (sweep) {
      sweep.style.opacity = `${1 - Math.abs(exitProgress * 2 - 1)}`;
      sweep.style.transform = `translateX(${(exitProgress * 2 - 1) * width}px)`;
    }

    if (elapsed >= duration) {
      completeIntro();
      return;
    }
    frame = requestAnimationFrame(animationFrame);
  }

  function onKeyDown(event) {
    if (!completed && (event.key === 'Escape' || event.key === 'Enter')) {
      event.preventDefault();
      finishIntro();
    }
  }

  function onVisibilityChange() {
    if (document.hidden) finishIntro();
  }

  function onSkipClick(event) {
    if (!skipButton) return;
    const rect = skipButton.getBoundingClientRect();
    if (event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom) {
      finishIntro();
    }
  }

  function onSkipPointerDown(event) {
    if (!skipButton) return;
    const rect = skipButton.getBoundingClientRect();
    if (event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom) {
      finishIntro();
    }
  }

  function clearEntranceClass() {
    const entranceStartedAt = performance.now();
    function finishEntrance(now) {
      if (now - entranceStartedAt >= 300) {
        document.documentElement.classList.remove('intro-entering');
        if (reducedMotion) document.documentElement.classList.remove('intro-reduced');
        entranceFrame = 0;
        return;
      }
      entranceFrame = requestAnimationFrame(finishEntrance);
    }
    entranceFrame = requestAnimationFrame(finishEntrance);
  }

  function playReducedMotionFade() {
    document.documentElement.classList.add('intro-reduced', 'intro-entering');
    window.innoIntroDone = true;
    window.dispatchEvent(new CustomEvent('intro:done', {
      detail: { sunX: sunXPosition() }
    }));
    entranceFrame = requestAnimationFrame(() => {
      document.documentElement.classList.add('intro-done');
      clearEntranceClass();
    });
  }

  window.finishIntro = finishIntro;

  if (!overlay || !canvas || !context || !shouldPlay) {
    document.documentElement.classList.remove('intro-active');
    if (overlay) overlay.remove();
    completed = true;
    if (reducedMotion && !noIntro) playReducedMotionFade();
    else {
      document.documentElement.classList.add('intro-done');
      window.innoIntroDone = true;
      window.dispatchEvent(new CustomEvent('intro:done', {
        detail: { sunX: sunXPosition() }
      }));
    }
    return;
  }

  document.documentElement.classList.add('intro-active');
  overlay.setAttribute('aria-hidden', 'false');
  try {
    sessionStorage.setItem('inno_intro_seen', '1');
  } catch (error) {
    console.warn('Unable to save intro session state; intro may replay after reload.', error);
  }
  if (skipButton) skipButton.addEventListener('click', finishIntro);
  document.addEventListener('click', onSkipClick, true);
  document.addEventListener('pointerdown', onSkipPointerDown, true);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', onVisibilityChange);
  createParticles();
  initializeMark();
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas, { passive: true });
  startedAt = performance.now();
  lastTime = startedAt;
  if (document.hidden) {
    finishIntro();
    return;
  }
  frame = requestAnimationFrame(animationFrame);
})();
