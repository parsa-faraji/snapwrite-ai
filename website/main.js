// ── SnapWrite AI — Landing Page Interactivity ──

(function () {
  "use strict";

  // ── Mobile Menu ──
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      const open = mobileMenu.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", open);
      menuToggle.innerHTML = open
        ? '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'
        : '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>';
    });

    // Close on link click
    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.innerHTML =
          '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>';
      });
    });
  }

  // ── Scroll Animations ──
  const animEls = document.querySelectorAll(".anim");
  if (animEls.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0, rootMargin: "50px" }
    );
    animEls.forEach((el) => observer.observe(el));

    // Fallback: after 1s, show any still-hidden elements (in case observer didn't fire)
    setTimeout(() => {
      animEls.forEach((el) => {
        if (!el.classList.contains("visible")) {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight + 100) {
            el.classList.add("visible");
          }
        }
      });
    }, 300);
  } else {
    animEls.forEach((el) => el.classList.add("visible"));
  }

  // ── Sticky Mobile CTA ──
  const hero = document.querySelector(".hero");
  const mobileCta = document.getElementById("mobile-cta");
  if (hero && mobileCta && "IntersectionObserver" in window) {
    const heroObs = new IntersectionObserver(
      ([e]) => {
        mobileCta.classList.toggle("show", !e.isIntersecting);
      },
      { threshold: 0 }
    );
    heroObs.observe(hero);
  }

  // ── Interactive Demo ──
  const demo = document.getElementById("demo-interactive");
  if (demo) {
    const steps = demo.querySelectorAll(".demo-step");
    const dots = demo.querySelectorAll(".demo-dot");
    let current = 0;
    let interval;

    function showStep(i) {
      steps.forEach((s, idx) => {
        s.classList.toggle("active", idx === i);
      });
      dots.forEach((d, idx) => {
        d.classList.toggle("active", idx === i);
      });
      current = i;
    }

    function nextStep() {
      showStep((current + 1) % steps.length);
    }

    function startAutoplay() {
      interval = setInterval(nextStep, 3000);
    }

    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => {
        clearInterval(interval);
        showStep(i);
        startAutoplay();
      });
    });

    showStep(0);
    startAutoplay();
  }

  // ── Pricing Toggle ──
  const toggle = document.getElementById("pricing-toggle");
  const monthlyPrices = document.querySelectorAll(".price-monthly");
  const annualPrices = document.querySelectorAll(".price-annual");
  const monthlyLinks = document.querySelectorAll(".link-monthly");
  const annualLinks = document.querySelectorAll(".link-annual");

  if (toggle) {
    toggle.addEventListener("change", () => {
      const annual = toggle.checked;
      monthlyPrices.forEach((el) => (el.style.display = annual ? "none" : ""));
      annualPrices.forEach((el) => (el.style.display = annual ? "" : "none"));
      monthlyLinks.forEach((el) => (el.style.display = annual ? "none" : ""));
      annualLinks.forEach((el) => (el.style.display = annual ? "" : "none"));
    });
  }

  // ── Smooth scroll offset for fixed nav ──
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        const top = target.offsetTop - 72;
        window.scrollTo({ top, behavior: "smooth" });
      }
    });
  });
})();
