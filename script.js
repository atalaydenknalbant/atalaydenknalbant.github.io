const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const subscribers = new Set();
const animationStart = performance.now();
let elapsed = 0;
let scrollFrame = null;

document.querySelector("#year").textContent = new Date().getFullYear();
const updateHeader = () => {
  header.dataset.elevated = String(scrollY > 18);
};
addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

function animate(now) {
  elapsed = (now - animationStart) / 1000;
  subscribers.forEach((draw) => draw(elapsed));
  requestAnimationFrame(animate);
}
function subscribe(draw) {
  subscribers.add(draw);
  draw(elapsed);
}
requestAnimationFrame(animate);

function setMenu(open, restoreFocus = false) {
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
  navToggle.title = open ? "Close navigation" : "Open navigation";
  navToggle.querySelector("img").src =
    "assets/icons/" + (open ? "x" : "menu") + ".svg";
  navLinks.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
  if (restoreFocus) navToggle.focus();
}
navToggle.addEventListener("click", () =>
  setMenu(navToggle.getAttribute("aria-expanded") !== "true"),
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navLinks.classList.contains("open"))
    setMenu(false, true);
});
document.addEventListener("click", (event) => {
  if (!header.contains(event.target) && navLinks.classList.contains("open"))
    setMenu(false);
});
matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
  if (event.matches) setMenu(false);
});

const filterButtons = [...document.querySelectorAll(".filter-button")];
const projectCards = [...document.querySelectorAll(".project-card")];
function applyFilter(filter) {
  filterButtons.forEach((button) => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  let count = 0;
  projectCards.forEach((card) => {
    card.hidden =
      filter !== "all" && !card.dataset.category.split(" ").includes(filter);
    if (!card.hidden) count++;
  });
  document.querySelector("#filter-status").textContent =
    count + " projects shown";
}
filterButtons.forEach((button) =>
  button.addEventListener("click", () => applyFilter(button.dataset.filter)),
);
applyFilter("all");

const stopScroll = () => {
  cancelAnimationFrame(scrollFrame);
  scrollFrame = null;
};
addEventListener("wheel", stopScroll, { passive: true });
addEventListener("touchmove", stopScroll, { passive: true });
addEventListener("keydown", (event) => {
  if (
    ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(
      event.key,
    )
  )
    stopScroll();
});
function revealTarget(target) {
  const details = target.closest("details");
  if (details) details.open = true;
  if (target.closest(".project-card")) applyFilter("all");
}
function scrollToTarget(target, instant = false) {
  stopScroll();
  revealTarget(target);
  const start = scrollY;
  const destination = () =>
    Math.max(
      0,
      Math.min(
        target.getBoundingClientRect().top + scrollY - header.offsetHeight - 20,
        document.documentElement.scrollHeight - innerHeight,
      ),
    );
  const duration = instant
    ? 0
    : Math.min(1500, Math.max(850, Math.abs(destination() - start) * 0.5));
  const startTime = performance.now();
  const step = (now) => {
    const progress = duration ? Math.min(1, (now - startTime) / duration) : 1;
    const eased =
      progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
    window.scrollTo({
      top: start + (destination() - start) * eased,
      behavior: "instant",
    });
    if (progress < 1) scrollFrame = requestAnimationFrame(step);
    else {
      const focusTarget =
        target.id === "contact" ? target.querySelector("a") : target;
      if (!focusTarget.hasAttribute("tabindex") && focusTarget.tagName !== "A")
        focusTarget.setAttribute("tabindex", "-1");
      focusTarget.focus({ preventScroll: true });
      scrollFrame = null;
    }
  };
  scrollFrame = requestAnimationFrame(step);
}
document.addEventListener("click", (event) => {
  const anchor = event.target.closest("a[href^='#']");
  if (
    !anchor ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const hash = anchor.getAttribute("href");
  const target = document.getElementById(hash.slice(1));
  if (!target) return;
  event.preventDefault();
  setMenu(false);
  anchor.classList.remove("nav-wave");
  void anchor.offsetWidth;
  anchor.classList.add("nav-wave");
  setTimeout(() => anchor.classList.remove("nav-wave"), 740);
  history.pushState(null, "", hash);
  scrollToTarget(target);
});
function restoreHash() {
  const target = document.getElementById(location.hash.slice(1));
  if (target) scrollToTarget(target, true);
}
addEventListener("hashchange", restoreHash);
if (location.hash) addEventListener("load", restoreHash, { once: true });

async function loadMetrics(url, fields) {
  try {
    const response = await fetch(url, {
      cache: "no-cache",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return;
    const data = await response.json();
    fields.forEach(([property, id]) => {
      if (Number.isInteger(data[property]) && data[property] >= 0)
        document.getElementById(id).textContent = data[property];
    });
  } catch {
    /* Keep the last published counts if the cache is unavailable. */
  }
}
loadMetrics("assets/profile-stats.json", [
  ["githubRepoCount", "githubRepoCount"],
  ["hfSpaceCount", "hfSpaceCount"],
]);
loadMetrics("assets/scholar-stats.json", [
  ["paperCount", "publishedPaperCount"],
]);

import("./scripts/hero-orbit.mjs")
  .then(({ createHeroOrbit }) =>
    createHeroOrbit(document.querySelector(".identity-orbit")),
  )
  .then(subscribe)
  .catch((error) => {
    document.querySelector(".identity-orbit").dataset.renderer = "unavailable";
    console.warn(
      "3D orbit unavailable; keeping the static portrait:",
      error.message,
    );
  });
