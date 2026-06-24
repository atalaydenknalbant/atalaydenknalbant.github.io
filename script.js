const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const filterButtons = document.querySelectorAll(".filter-button");
const projectCards = document.querySelectorAll(".project-card");
const year = document.querySelector("#year");
const ocrField = document.querySelector("#ocr-field");
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
let ocrResizeTimer = null;
let activeOcrTerm = null;
let ocrPointerFrame = null;
let latestPointer = null;
const supportsOcrHover = window.matchMedia("(hover: hover)");

const getPageHeight = () => Math.max(
  window.innerHeight * 2,
  document.documentElement.scrollHeight,
  document.body.scrollHeight,
);

const getPageWidth = () => (
  document.documentElement.clientWidth
  || window.innerWidth
  || 1200
);

const estimateTextWidth = (text, fontSize) => text.length * fontSize * 0.57;

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

const createOcrField = () => {
  if (!ocrField) return;

  const pageWidth = getPageWidth();
  const pageHeight = getPageHeight();
  const minCount = pageWidth < 700 ? 5 : 8;
  const maxCount = pageWidth < 700 ? 9 : 16;
  const desiredCount = Math.min(
    technicalTerms.length,
    Math.max(minCount, Math.min(maxCount, Math.floor(pageHeight / (pageWidth < 700 ? 520 : 360)))),
  );
  const horizontalMargin = pageWidth < 700 ? 24 : 48;
  const verticalMargin = 96;
  const placedBoxes = [];

  ocrField.style.height = `${pageHeight}px`;
  setActiveOcrTerm(null);
  ocrField.innerHTML = "";

  for (const text of shuffleTerms(technicalTerms)) {
    if (placedBoxes.length >= desiredCount) break;

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const fontSize = 13 + Math.random() * (pageWidth < 700 ? 4 : 7);
      const textWidth = estimateTextWidth(text, fontSize);
      const maxWidth = textWidth + 18;
      const availableWidth = pageWidth - horizontalMargin * 2;

      if (maxWidth > availableWidth) continue;

      const x = horizontalMargin + Math.random() * Math.max(1, availableWidth - maxWidth);
      const y = verticalMargin + Math.random() * Math.max(1, pageHeight - verticalMargin * 2);
      const box = {
        left: x - 34,
        right: x + maxWidth + 34,
        top: y - fontSize * 1.1 - 24,
        bottom: y + fontSize * 1.1 + 24,
      };

      if (hasBoxCollision(box, placedBoxes)) continue;

      const term = document.createElement("span");
      term.className = "ocr-term";
      term.textContent = text;
      term.style.left = `${x}px`;
      term.style.top = `${y}px`;
      term.style.fontSize = `${fontSize}px`;
      term.style.opacity = `${0.68 + Math.random() * 0.18}`;
      term.ocrBox = box;
      ocrField.appendChild(term);
      placedBoxes.push(box);
      break;
    }
  }
};

const setActiveOcrTerm = (term) => {
  if (activeOcrTerm === term) return;
  if (activeOcrTerm) activeOcrTerm.classList.remove("is-revealed");
  activeOcrTerm = term;
  if (activeOcrTerm) activeOcrTerm.classList.add("is-revealed");
};

const getHoveredOcrTerm = ({ x, y }) => {
  if (!ocrField || !supportsOcrHover.matches) return null;

  const pageY = y + window.scrollY;
  let bestTerm = null;
  let bestDistance = Infinity;

  for (const term of ocrField.children) {
    const box = term.ocrBox;
    if (!box) continue;

    const left = box.left - 18;
    const right = box.right + 18;
    const top = box.top - 18;
    const bottom = box.bottom + 18;

    if (x < left || x > right || pageY < top || pageY > bottom) continue;

    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const distance = Math.hypot(x - centerX, pageY - centerY);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestTerm = term;
    }
  }

  return bestTerm;
};

const updateOcrHover = () => {
  ocrPointerFrame = null;
  setActiveOcrTerm(latestPointer ? getHoveredOcrTerm(latestPointer) : null);
};

const scheduleOcrHover = (event) => {
  if (!supportsOcrHover.matches) return;

  latestPointer = {
    x: event.clientX,
    y: event.clientY,
  };

  if (!ocrPointerFrame) {
    ocrPointerFrame = window.requestAnimationFrame(updateOcrHover);
  }
};

createOcrField();

window.addEventListener("resize", () => {
  window.clearTimeout(ocrResizeTimer);
  setActiveOcrTerm(null);
  latestPointer = null;
  ocrResizeTimer = window.setTimeout(createOcrField, 160);
}, { passive: true });

window.addEventListener("load", createOcrField);
window.addEventListener("pointermove", scheduleOcrHover, { passive: true });
window.addEventListener("pointerleave", () => {
  latestPointer = null;
  setActiveOcrTerm(null);
}, { passive: true });
