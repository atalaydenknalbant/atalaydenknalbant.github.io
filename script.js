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
let fieldHeight = 0;
let scrollTop = 0;
let animationFrame = null;
let ocrTerms = [];
const pointer = {
  x: 0,
  y: 0,
  active: false,
  focus: 0,
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const technicalTerms = [
  "computer vision",
  "object detection",
  "semantic segmentation",
  "instance segmentation",
  "panoptic segmentation",
  "image classification",
  "keypoint detection",
  "pose estimation",
  "optical flow",
  "depth estimation",
  "monocular depth",
  "stereo matching",
  "visual odometry",
  "camera calibration",
  "epipolar geometry",
  "homography estimation",
  "bundle adjustment",
  "image registration",
  "feature matching",
  "SIFT descriptor",
  "ORB features",
  "Harris corner",
  "Canny edge",
  "Hough transform",
  "RANSAC fitting",
  "saliency map",
  "class activation map",
  "Grad CAM",
  "CNN backbone",
  "ResNet feature map",
  "Vision Transformer",
  "Swin Transformer",
  "U Net decoder",
  "DeepLab head",
  "YOLO detector",
  "Faster R CNN",
  "Mask R CNN",
  "DETR decoder",
  "SAM prompt",
  "DINO features",
  "CLIP image encoder",
  "feature pyramid network",
  "atrous convolution",
  "dilated convolution",
  "deformable convolution",
  "depthwise convolution",
  "anchor boxes",
  "region proposal",
  "ROI pooling",
  "bounding box regression",
  "non maximum suppression",
  "IoU threshold",
  "COCO mAP",
  "Pascal VOC",
  "Dice coefficient",
  "boundary F score",
  "pixel accuracy",
  "segmentation mask",
  "mask refinement",
  "foreground extraction",
  "background subtraction",
  "edge detection",
  "corner detection",
  "object tracking",
  "multi object tracking",
  "re identification",
  "tracking by detection",
  "motion estimation",
  "scene understanding",
  "visual grounding",
  "image retrieval",
  "contrastive pretraining",
  "self supervised vision",
  "domain adaptation",
  "synthetic augmentation",
  "photometric distortion",
  "random crop",
  "color jitter",
  "mosaic augmentation",
  "cutmix augmentation",
  "label smoothing",
  "occlusion handling",
  "small object detection",
  "zero shot detection",
  "few shot segmentation",
  "open vocabulary detection",
  "weak supervision",
  "active learning",
  "annotation noise",
  "dataset bias",
  "out of distribution image",
  "adversarial patch",
  "visual benchmark",
];

const resizeCanvas = () => {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.offsetWidth;
  height = canvas.offsetHeight;
  fieldHeight = Math.max(
    height * 2,
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
};

const updateScrollState = () => {
  scrollTop = Math.max(0, window.scrollY || window.pageYOffset || 0);
};

const shuffleTerms = (terms) => {
  const shuffled = Array.from(new Set(terms));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

const hasBoxCollision = (candidate, boxes) => boxes.some((box) => (
  candidate.left < box.right
  && candidate.right > box.left
  && candidate.top < box.bottom
  && candidate.bottom > box.top
));

const createOcrTerms = () => {
  const minCount = width < 700 ? 10 : 18;
  const maxCount = width < 700 ? 30 : 72;
  const desiredCount = Math.max(minCount, Math.min(maxCount, Math.floor((width * fieldHeight) / 68000)));
  const selectedTerms = shuffleTerms(technicalTerms);
  const placedBoxes = [];

  ocrTerms = [];

  for (const text of selectedTerms) {
    if (ocrTerms.length >= desiredCount) break;

    let placedTerm = null;

    for (let attempt = 0; attempt < 110; attempt += 1) {
      const size = 13 + Math.random() * (width < 700 ? 5 : 8);
      const revealGrowth = 1.8;
      const driftX = 10 + Math.random() * 8;
      const driftY = 5 + Math.random() * 5;

      ctx.font = `800 ${size}px "Atkinson Hyperlegible", ui-sans-serif, system-ui, sans-serif`;

      const textWidth = ctx.measureText(text).width;
      const maxWidth = textWidth * ((size + revealGrowth) / size);
      const horizontalMargin = 28;
      const verticalMargin = 76;

      if (maxWidth > width - horizontalMargin * 2) continue;

      const x = horizontalMargin + Math.random() * Math.max(1, width - maxWidth - horizontalMargin * 2);
      const y = verticalMargin + Math.random() * Math.max(1, fieldHeight - verticalMargin * 2);
      const box = {
        left: x - driftX - 30,
        right: x + maxWidth + driftX + 30,
        top: y - size * 0.88 - driftY - 22,
        bottom: y + size * 0.88 + driftY + 22,
      };

      if (hasBoxCollision(box, placedBoxes)) continue;

      placedBoxes.push(box);
      placedTerm = {
        text,
        x,
        y,
        width: textWidth,
        maxWidth,
        size,
        revealGrowth,
        driftX,
        driftY,
        phase: Math.random() * Math.PI * 2,
        drift: 0.2 + Math.random() * 0.36,
        baseAlpha: 0.1 + Math.random() * 0.07,
        blur: 3.2 + Math.random() * 2.6,
        reveal: 0,
      };
      break;
    }

    if (placedTerm) {
      ocrTerms.push(placedTerm);
    }
  }
};

const getTermReveal = (term, x, y) => {
  if (!pointer.active) return 0;

  const padX = 42;
  const padY = Math.max(28, term.size * 1.4);
  const left = x - padX;
  const right = x + term.maxWidth + padX;
  const top = y - padY;
  const bottom = y + padY;
  const nearestX = Math.max(left, Math.min(pointer.x, right));
  const nearestY = Math.max(top, Math.min(pointer.y, bottom));
  const distance = Math.hypot(pointer.x - nearestX, pointer.y - nearestY);

  return Math.max(0, 1 - distance / 170);
};

const drawOcrTerm = (term, time) => {
  const driftX = Math.sin(time * term.drift + term.phase) * term.driftX;
  const driftY = Math.cos(time * term.drift * 0.78 + term.phase) * term.driftY;
  const x = term.x + driftX;
  const y = term.y - scrollTop + driftY;

  if (y < -90 || y > height + 90) {
    term.reveal += (0 - term.reveal) * 0.14;
    return;
  }

  const revealTarget = getTermReveal(term, x, y);

  term.reveal += (revealTarget - term.reveal) * 0.14;

  const readingPulse = Math.sin(time * 4.4 + term.phase) * 0.5 + 0.5;
  const blur = Math.max(0, term.blur * (1 - term.reveal) - term.reveal * 0.85);
  const alpha = term.baseAlpha + term.reveal * 0.62 + readingPulse * term.reveal * 0.08;
  const size = term.size + term.reveal * term.revealGrowth;
  const visibleWidth = term.width * (size / term.size);
  const sharpened = term.reveal > 0.08;

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.font = `800 ${size}px "Atkinson Hyperlegible", ui-sans-serif, system-ui, sans-serif`;
  ctx.filter = `blur(${blur.toFixed(2)}px)`;
  ctx.fillStyle = sharpened
    ? `rgba(232, 226, 214, ${alpha})`
    : `rgba(179, 184, 184, ${alpha})`;
  ctx.fillText(term.text, x, y);

  if (term.reveal > 0.04) {
    ctx.filter = "none";
    ctx.globalAlpha = term.reveal * 0.55;
    ctx.fillStyle = "rgba(198, 184, 160, 0.82)";
    ctx.fillRect(x, y + size * 0.64, visibleWidth * term.reveal, 1);
    ctx.globalAlpha = term.reveal * 0.18;
    ctx.fillRect(x, y - size * 0.72, visibleWidth, 1);
  }

  ctx.restore();
};

const drawOcrSweep = (time) => {
  const scanX = ((time * 58) % (width + 280)) - 140;
  const gradient = ctx.createLinearGradient(scanX - 90, 0, scanX + 90, 0);

  gradient.addColorStop(0, "rgba(198, 184, 160, 0)");
  gradient.addColorStop(0.5, "rgba(198, 184, 160, 0.02)");
  gradient.addColorStop(1, "rgba(198, 184, 160, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(scanX - 90, 0, 180, height);
};

const drawPointerFocus = () => {
  pointer.focus += ((pointer.active ? 1 : 0) - pointer.focus) * 0.08;

  if (pointer.focus < 0.01) return;

  const radius = 170 + pointer.focus * 80;
  const gradient = ctx.createRadialGradient(
    pointer.x,
    pointer.y,
    0,
    pointer.x,
    pointer.y,
    radius,
  );

  gradient.addColorStop(0, `rgba(198, 184, 160, ${0.06 * pointer.focus})`);
  gradient.addColorStop(0.55, `rgba(198, 184, 160, ${0.02 * pointer.focus})`);
  gradient.addColorStop(1, "rgba(198, 184, 160, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(pointer.x - radius, pointer.y - radius, radius * 2, radius * 2);
};

const drawOcrField = (now = 0) => {
  const motionScale = prefersReducedMotion.matches ? 0.55 : 1;
  const time = now * 0.001 * motionScale;

  updateScrollState();
  ctx.clearRect(0, 0, width, height);
  drawOcrSweep(time);

  for (const term of ocrTerms) {
    drawOcrTerm(term, time);
  }

  drawPointerFocus();
  animationFrame = requestAnimationFrame(drawOcrField);
};

const initCanvas = () => {
  resizeCanvas();
  updateScrollState();
  createOcrTerms();
  drawOcrField();
};

initCanvas();

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
}, { passive: true });

window.addEventListener("pointerleave", () => {
  pointer.active = false;
}, { passive: true });

window.addEventListener("scroll", updateScrollState, { passive: true });

window.addEventListener("resize", () => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  initCanvas();
});

window.addEventListener("load", () => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  initCanvas();
});
