const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const filterButtons = document.querySelectorAll(".filter-button");
const projectCards = document.querySelectorAll(".project-card");
const year = document.querySelector("#year");
const canvas = document.querySelector("#signal-canvas");
const ctx = canvas.getContext("2d");
const githubRepoCount = document.querySelector("#githubRepoCount");
const hfSpaceCount = document.querySelector("#hfSpaceCount");
const publishedPaperCount = document.querySelector("#publishedPaperCount");

year.textContent = new Date().getFullYear();

const setHeaderState = () => {
  header.dataset.elevated = String(window.scrollY > 18);
};

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

navToggle.addEventListener("click", () => {
  const open = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!open));
  navLinks.classList.toggle("open", !open);
  document.body.classList.toggle("menu-open", !open);
});

const closeMenu = () => {
  navToggle.setAttribute("aria-expanded", "false");
  navLinks.classList.remove("open");
  document.body.classList.remove("menu-open");
};

const easeInOutCubic = (progress) => (
  progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - ((-2 * progress + 2) ** 3) / 2
);

const getScrollTarget = (target) => {
  const headerOffset = 96;
  const rawTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;
  const maxTop = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(rawTop, maxTop));
};

const slowScrollTo = (target) => {
  const startTop = window.scrollY;
  const endTop = getScrollTarget(target);
  const distance = endTop - startTop;
  const duration = Math.min(1500, Math.max(900, Math.abs(distance) * 0.42));
  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = easeInOutCubic(progress);

    window.scrollTo(0, startTop + distance * eased);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};

const playNavWave = (anchor) => {
  anchor.classList.remove("nav-wave");
  void anchor.offsetWidth;
  anchor.classList.add("nav-wave");
  window.setTimeout(() => anchor.classList.remove("nav-wave"), 760);
};

document.addEventListener("click", (event) => {
  const anchor = event.target.closest("a[href^='#']");
  if (!anchor) return;

  const target = document.querySelector(anchor.getAttribute("href"));
  if (!target) return;

  event.preventDefault();

  const shouldPlayWave = (
    navLinks.contains(anchor)
    || anchor.classList.contains("brand-lockup")
    || anchor.classList.contains("button")
  );

  if (shouldPlayWave) {
    playNavWave(anchor);
  }

  if (navLinks.contains(anchor)) {
    closeMenu();
  }

  slowScrollTo(target);
  history.pushState(null, "", anchor.getAttribute("href"));
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    projectCards.forEach((card) => {
      const visible = filter === "all" || card.dataset.category.split(" ").includes(filter);
      card.classList.toggle("is-hidden", !visible);
    });
  });
});

const setMetricText = (element, value) => {
  if (element) element.textContent = value;
};

const getJsonCache = async (cacheUrl) => {
  const response = await fetch(cacheUrl, {
    cache: "no-cache",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Cache request failed: ${response.status}`);
  }

  return response.json();
};

getJsonCache("assets/profile-stats.json")
  .then((stats) => {
    setMetricText(githubRepoCount, stats.githubRepoCount);
    setMetricText(hfSpaceCount, stats.hfSpaceCount);
  })
  .catch(() => {
    setMetricText(githubRepoCount, "33");
    setMetricText(hfSpaceCount, "6");
  });

getJsonCache("assets/scholar-stats.json")
  .then((stats) => setMetricText(publishedPaperCount, stats.paperCount))
  .catch(() => setMetricText(publishedPaperCount, "2"));

let width = 0;
let height = 0;
let particles = [];
let animationFrame = null;
const pointer = {
  x: 0,
  y: 0,
  active: false,
  strength: 0,
};

const palette = ["#2980b9", "#6dd5fa", "#ffffff", "#bcecff"];

const resizeCanvas = () => {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.offsetWidth;
  height = canvas.offsetHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
};

const createParticles = () => {
  const count = Math.max(34, Math.min(90, Math.floor(width / 18)));
  particles = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.28,
    vy: (Math.random() - 0.5) * 0.28,
    size: 1.2 + Math.random() * 2.4,
    color: palette[index % palette.length],
  }));
};

const drawParticles = () => {
  ctx.clearRect(0, 0, width, height);

  for (const particle of particles) {
    if (pointer.active) {
      const dx = particle.x - pointer.x;
      const dy = particle.y - pointer.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const radius = 230;

      if (distance < radius) {
        const force = (1 - distance / radius) * pointer.strength;
        particle.vx += (dx / distance) * force;
        particle.vy += (dy / distance) * force;
      }
    }

    particle.vx *= 0.99;
    particle.vy *= 0.99;
    particle.x += particle.vx;
    particle.y += particle.vy;

    if (particle.x < -20) particle.x = width + 20;
    if (particle.x > width + 20) particle.x = -20;
    if (particle.y < -20) particle.y = height + 20;
    if (particle.y > height + 20) particle.y = -20;
  }

  pointer.strength *= 0.96;

  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const a = particles[i];
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 150) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(109, 213, 250, ${0.16 * (1 - distance / 150)})`;
        ctx.lineWidth = 1;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  for (const particle of particles) {
    ctx.beginPath();
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = 0.76;
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  animationFrame = requestAnimationFrame(drawParticles);
};

const initCanvas = () => {
  resizeCanvas();
  createParticles();
  drawParticles();
};

initCanvas();

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
  pointer.strength = 0.55;
}, { passive: true });

window.addEventListener("pointerleave", () => {
  pointer.active = false;
}, { passive: true });

window.addEventListener("resize", () => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  initCanvas();
});
