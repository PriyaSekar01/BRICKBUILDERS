/* =========================================================
   BRICKBUILDERS — INTERACTIONS
   ========================================================= */

"use strict";

const siteHeader = document.getElementById("siteHeader");
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const navLinks = document.querySelectorAll("#mainNav a");
const contactForm = document.getElementById("contactForm");
const yearElement = document.getElementById("year");

const CONFIG = {
    whatsappNumber: "919999999999",
    revealThreshold: 0.12,
    revealRootMargin: "0px 0px -55px 0px"
};

/* ---------------------------------------------------------
   HEADER
   --------------------------------------------------------- */

function updateHeader() {
    siteHeader?.classList.toggle("scrolled", window.scrollY > 30);
}

/* ---------------------------------------------------------
   MOBILE MENU
   --------------------------------------------------------- */

function setMenuState(open) {
    if (!mainNav || !menuToggle) return;

    mainNav.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute(
        "aria-label",
        open ? "Close navigation" : "Open navigation"
    );

    document.body.classList.toggle("menu-open", open);
}

function toggleMobileMenu() {
    setMenuState(!mainNav?.classList.contains("open"));
}

function closeMobileMenu() {
    setMenuState(false);
}

/* ---------------------------------------------------------
   SCROLL REVEAL
   --------------------------------------------------------- */

function initScrollReveal() {
    const elements = document.querySelectorAll(
        ".reveal, .reveal-left, .reveal-right, .reveal-scale"
    );

    if (!elements.length) return;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!("IntersectionObserver" in window) || reducedMotion) {
        elements.forEach((element) => {
            element.classList.add("is-visible");
        });
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                } else {
                    /*
                     * Remove the class when the element leaves the viewport.
                     * This allows the animation to happen again when the
                     * user scrolls back to the section.
                     */
                    entry.target.classList.remove("is-visible");
                }
            });
        },
        {
            threshold: CONFIG.revealThreshold,
            rootMargin: CONFIG.revealRootMargin
        }
    );

    elements.forEach((element) => observer.observe(element));
}

/* ---------------------------------------------------------
   HERO LETTER MOTION
   --------------------------------------------------------- */

function initLetterAnimation() {
    const title = document.querySelector(".split-title");
    if (!title) return;

    /*
     * We animate only the two visible text lines separately.
     * The spans are created with aria-hidden so the heading remains
     * understandable to assistive technology through aria-label.
     */
    const firstLine = "Brick by brick,";
    const secondLine = "we build success.";

    title.setAttribute("aria-label", `${firstLine} ${secondLine}`);

    const makeLetters = (text, extraClass = "") =>
        [...text].map((letter, index) => {
            if (letter === " ") return " ";
            return `<span class="letter ${extraClass}" style="--i:${index}">${letter}</span>`;
        }).join("");

    title.innerHTML = `
        <span class="title-line" aria-hidden="true">
            ${makeLetters(firstLine)}
        </span>
        <span class="title-line title-accent" aria-hidden="true">
            ${makeLetters(secondLine, "accent-letter")}
        </span>
    `;

    requestAnimationFrame(() => {
        title.classList.add("letters-ready");
    });
}

/* ---------------------------------------------------------
   HERO PARALLAX
   --------------------------------------------------------- */

function initHeroParallax() {
    const hero = document.querySelector(".hero");
    const media = document.querySelector(".hero-media");
    const grid = document.querySelector(".hero-grid");

    if (!hero || !media) return;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const touchDevice = window.matchMedia(
        "(hover: none) and (pointer: coarse)"
    ).matches;

    if (reducedMotion || touchDevice) return;

    let ticking = false;

    function update() {
        const rect = hero.getBoundingClientRect();
        const progress = Math.max(
            0,
            Math.min(1, -rect.top / hero.offsetHeight)
        );

        media.style.transform =
            `scale(1.06) translate3d(0, ${progress * 55}px, 0)`;

        if (grid) {
            grid.style.transform =
                `translate3d(0, ${progress * 25}px, 0)`;
        }

        ticking = false;
    }

    function requestUpdate() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    update();
}

/* ---------------------------------------------------------
   ANIMATED CONSTRUCTION HERO
   --------------------------------------------------------- */

function initConstructionCanvas() {
    const canvas = document.querySelector(".hero-canvas");
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;
    let width = 0;
    let height = 0;
    let animationFrame;
    let cameraX = 0;
    let cameraY = 0;
    let targetCameraX = 0;
    let targetCameraY = 0;
    const particles = Array.from({ length: 56 }, (_, index) => ({
        x: (index * 83) % 1000,
        y: (index * 47) % 100,
        speed: .8 + (index % 5) * .24,
        size: 1 + (index % 3)
    }));

    const line = (startX, startY, endX, endY, color, thickness = 1) => {
        context.strokeStyle = color;
        context.lineWidth = thickness;
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();
    };

    const glow = (x, y, radius, color) => {
        const light = context.createRadialGradient(x, y, 0, x, y, radius);
        light.addColorStop(0, color);
        light.addColorStop(1, "rgba(255,196,91,0)");
        context.fillStyle = light;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };

    const drawWorker = (x, groundY, phase, color = "rgba(255,196,91,.78)") => {
        const walk = Math.sin(phase) * 4;
        context.strokeStyle = color;
        context.fillStyle = color;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x, groundY - 29, 4, 0, Math.PI * 2);
        context.fill();
        line(x, groundY - 24, x, groundY - 12, color, 2);
        line(x, groundY - 21, x - 7 - walk, groundY - 15, color, 1.5);
        line(x, groundY - 21, x + 7 + walk, groundY - 16, color, 1.5);
        line(x, groundY - 12, x - 5 + walk, groundY, color, 1.5);
        line(x, groundY - 12, x + 5 - walk, groundY, color, 1.5);
    };

    const drawJcb = (x, groundY, phase, scale) => {
        const armLift = Math.sin(phase * .7) * 7;
        const trackWidth = 82 * scale;
        const trackHeight = 18 * scale;
        const baseY = groundY - trackHeight;
        const pivotX = x + 47 * scale;
        const pivotY = groundY - 51 * scale;
        const armX = x + 94 * scale;
        const armY = groundY - 104 * scale - armLift;
        const bucketX = x + 132 * scale;
        const bucketY = groundY - 20 * scale - armLift;

        context.fillStyle = "rgba(5,8,9,.95)";
        context.strokeStyle = "rgba(255,196,91,.86)";
        context.lineWidth = 2;
        context.beginPath();
        context.roundRect(x, baseY, trackWidth, trackHeight, 7 * scale);
        context.fill();
        context.stroke();

        context.fillStyle = "rgba(216,137,18,.92)";
        context.fillRect(x + 13 * scale, baseY - 9 * scale, 54 * scale, 10 * scale);
        context.fillRect(x + 24 * scale, groundY - 42 * scale, 38 * scale, 34 * scale);
        context.strokeStyle = "rgba(255,196,91,.7)";
        context.strokeRect(x + 24 * scale, groundY - 42 * scale, 38 * scale, 34 * scale);

        context.fillStyle = "rgba(19,31,35,.92)";
        context.beginPath();
        context.moveTo(x + 31 * scale, groundY - 36 * scale);
        context.lineTo(x + 57 * scale, groundY - 36 * scale);
        context.lineTo(x + 57 * scale, groundY - 16 * scale);
        context.lineTo(x + 31 * scale, groundY - 16 * scale);
        context.closePath();
        context.fill();

        line(pivotX, pivotY, armX, armY, "rgba(255,196,91,.9)", 7 * scale);
        line(armX, armY, bucketX, bucketY, "rgba(255,196,91,.82)", 6 * scale);
        line(bucketX, bucketY, bucketX + 18 * scale, bucketY + 10 * scale, "rgba(255,196,91,.82)", 4 * scale);
        context.strokeStyle = "rgba(255,196,91,.9)";
        context.strokeRect(bucketX + 10 * scale, bucketY + 7 * scale, 24 * scale, 13 * scale);

        context.fillStyle = "rgba(255,196,91,.3)";
        context.beginPath();
        context.arc(x + 19 * scale, baseY + trackHeight / 2, 6 * scale, 0, Math.PI * 2);
        context.arc(x + 61 * scale, baseY + trackHeight / 2, 6 * scale, 0, Math.PI * 2);
        context.fill();
    };

    function resize() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = document.querySelector(".hero")?.offsetHeight || window.innerHeight;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function drawScene(time = 0) {
        const seconds = time / 1000;
        const pulse = (Math.sin(seconds * 2.2) + 1) / 2;
        const buildPulse = (Math.sin(seconds * .45) + 1) / 2;
        const sky = context.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, "#24384a");
        sky.addColorStop(.55, "#31505b");
        sky.addColorStop(1, "#111b1d");
        context.fillStyle = sky;
        context.fillRect(0, 0, width, height);

        glow(width * .78, height * .22, Math.min(230, width * .2), "rgba(216,137,18,.16)");
        context.fillStyle = "rgba(255,196,91,.8)";
        context.beginPath();
        context.arc(width * .78, height * .22, 3 + pulse * 2, 0, Math.PI * 2);
        context.fill();

        for (let star = 0; star < 32; star += 1) {
            const starX = (star * 137) % width;
            const starY = 36 + ((star * 61) % Math.max(80, height * .3));
            context.fillStyle = `rgba(255,255,255,${.12 + ((star + Math.floor(seconds)) % 4) * .07})`;
            context.fillRect(starX, starY, 1, 1);
        }

        context.fillStyle = "rgba(5,8,10,.55)";
        for (let block = 0; block < 9; block += 1) {
            const blockWidth = 70 + (block % 3) * 34;
            const blockHeight = 40 + (block % 4) * 22;
            const blockX = block * width / 8 - 40;
            context.fillRect(blockX, height * .57 - blockHeight, blockWidth, blockHeight);
        }

        context.strokeStyle = "rgba(255,196,91,.11)";
        context.lineWidth = 1;
        const gridSize = 72;
        const drift = (seconds * 10) % gridSize;
        for (let x = -gridSize + drift; x < width; x += gridSize) {
            context.beginPath();
            context.moveTo(x, height * .42);
            context.lineTo(x - width * .16, height);
            context.stroke();
        }
        for (let y = height * .42; y < height; y += gridSize * .72) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }

        cameraX += (targetCameraX - cameraX) * .035;
        cameraY += (targetCameraY - cameraY) * .035;
        context.save();
        context.translate(cameraX, cameraY);

        const buildingWidth = Math.min(470, width * .46);
        const buildingHeight = Math.min(370, height * .46);
        const buildingDrift = 14 + Math.sin(seconds * .32) * 10;
        const compositionCenter = width < 780 ? .72 : .78;
        const buildingX = width * compositionCenter - buildingWidth / 2 + buildingDrift;
        const groundY = height * .70;
        const buildingY = groundY - buildingHeight;
        const floorHeight = 52;
        const activeFloor = Math.floor((seconds * .3) % Math.max(1, Math.floor(buildingHeight / floorHeight)));

        context.fillStyle = "rgba(7,10,12,.88)";
        context.fillRect(buildingX, buildingY, buildingWidth, buildingHeight);
        context.strokeStyle = "rgba(255,196,91,.58)";
        context.shadowColor = "rgba(255,196,91,.35)";
        context.shadowBlur = 16;
        context.strokeRect(buildingX, buildingY, buildingWidth, buildingHeight);
        context.shadowBlur = 0;

        context.strokeStyle = "rgba(255,255,255,.22)";
        for (let floorIndex = 1; floorIndex < buildingHeight / floorHeight; floorIndex += 1) {
            const floor = buildingY + floorIndex * floorHeight;
            line(buildingX, floor, buildingX + buildingWidth, floor, "rgba(255,255,255,.22)");
            if (floorIndex === activeFloor + 1) {
                line(buildingX, floor, buildingX + buildingWidth, floor, `rgba(255,196,91,${.42 + buildPulse * .35})`, 2);
            }
        }

        const scaffoldLeft = buildingX - 30;
        const scaffoldRight = buildingX + buildingWidth + 30;
        context.setLineDash([8, 6]);
        line(scaffoldLeft, buildingY - 12, scaffoldLeft, buildingY + buildingHeight + 18, "rgba(255,196,91,.54)", 2);
        line(scaffoldRight, buildingY - 12, scaffoldRight, buildingY + buildingHeight + 18, "rgba(255,196,91,.54)", 2);
        for (let level = buildingY + 12; level < buildingY + buildingHeight; level += 52) {
            line(scaffoldLeft - 10, level, scaffoldRight + 10, level, "rgba(255,196,91,.35)");
        }
        context.setLineDash([]);
        for (let level = buildingY + 14; level < buildingY + buildingHeight - 30; level += 52) {
            line(scaffoldLeft, level, scaffoldRight, level + 34, "rgba(255,196,91,.24)");
            line(scaffoldRight, level, scaffoldLeft, level + 34, "rgba(255,196,91,.24)");
        }

        const windowGlow = .25 + pulse * .45;
        for (let row = buildingY + 15; row < buildingY + buildingHeight - 18; row += floorHeight) {
            for (let column = buildingX + 18; column < buildingX + buildingWidth - 20; column += 48) {
                context.fillStyle = `rgba(255,196,91,${windowGlow * (.65 + ((column + row) % 3) * .12)})`;
                context.fillRect(column, row, 18, 13);
            }
        }

        const craneMastX = buildingX + buildingWidth * .72;
        const craneTop = buildingY - 108;
        const craneStart = craneMastX - Math.min(220, width * .2);
        const craneEnd = craneMastX + Math.min(250, width * .22);
        context.strokeStyle = "rgba(255,196,91,.82)";
        line(craneMastX, buildingY, craneMastX, craneTop, "rgba(255,196,91,.82)", 3);
        line(craneStart, craneTop, craneEnd, craneTop, "rgba(255,196,91,.82)", 3);
        context.lineWidth = 1;
        for (let y = craneTop + 18; y < buildingY; y += 28) {
            line(craneMastX - 14, y, craneMastX + 14, y + 28, "rgba(255,196,91,.82)");
            line(craneMastX + 14, y, craneMastX - 14, y + 28, "rgba(255,196,91,.82)");
        }

        const trolleyX = craneMastX + Math.sin(seconds * .7) * Math.min(120, width * .12);
        const hookLength = 78 + pulse * 28;
        line(trolleyX, craneTop, trolleyX, craneTop + hookLength, "rgba(255,196,91,.9)", 2);
        context.fillStyle = "rgba(255,196,91,.95)";
        context.fillRect(trolleyX - 10, craneTop - 4, 20, 8);
        context.strokeStyle = "rgba(255,196,91,.9)";
        context.strokeRect(trolleyX - 13, craneTop + hookLength, 26, 22);
        glow(trolleyX, craneTop + hookLength + 11, 34, "rgba(216,137,18,.16)");

        const beaconAlpha = .25 + pulse * .65;
        context.fillStyle = `rgba(255,196,91,${beaconAlpha})`;
        context.beginPath();
        context.arc(scaffoldLeft, buildingY + 24, 4 + pulse * 2, 0, Math.PI * 2);
        context.arc(scaffoldRight, buildingY + 24, 4 + pulse * 2, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = "rgba(255,196,91,.32)";
        context.setLineDash([3, 7]);
        line(buildingX - 42, buildingY + buildingHeight + 26, buildingX + buildingWidth + 42, buildingY + buildingHeight + 26, "rgba(255,196,91,.32)");
        context.setLineDash([]);
        line(buildingX - 42, buildingY + buildingHeight + 19, buildingX - 42, buildingY + buildingHeight + 33, "rgba(255,196,91,.32)");
        line(buildingX + buildingWidth + 42, buildingY + buildingHeight + 19, buildingX + buildingWidth + 42, buildingY + buildingHeight + 33, "rgba(255,196,91,.32)");

        drawWorker(
            buildingX - 66 + Math.sin(seconds * .55) * 14,
            buildingY + buildingHeight + 23,
            seconds * 3.2,
            "rgba(255,196,91,.82)"
        );
        drawWorker(
            buildingX + buildingWidth + 58 + Math.sin(seconds * .42 + 2) * 12,
            buildingY + buildingHeight + 23,
            seconds * 2.8 + 2,
            "rgba(255,255,255,.52)"
        );
        drawWorker(
            buildingX + buildingWidth * .28 + Math.sin(seconds * .65 + 1) * 8,
            buildingY + buildingHeight - 8,
            seconds * 3.5 + 1,
            "rgba(255,196,91,.58)"
        );

        context.fillStyle = "rgba(4,7,8,.85)";
        context.fillRect(0, groundY, width, height - groundY);
        context.fillStyle = "rgba(255,196,91,.12)";
        context.fillRect(0, groundY, width, 2);
        for (let roadLine = -width; roadLine < width * 2; roadLine += 150) {
            const roadOffset = (seconds * 42) % 150;
            line(roadLine + roadOffset, height, roadLine + roadOffset + 70, height, "rgba(255,196,91,.22)", 2);
        }
        drawJcb(
            Math.max(42, buildingX - 165),
            groundY + 8,
            seconds,
            Math.min(1, Math.max(.62, width / 1100))
        );
        context.restore();

        particles.forEach((particle) => {
            const particleX = (particle.x / 1000 * width + seconds * particle.speed * 12) % width;
            const particleY = height * (.56 + particle.y / 260);
            const flicker = .14 + ((Math.sin(seconds * 2 + particle.x) + 1) / 2) * .35;
            context.fillStyle = `rgba(255,196,91,${flicker})`;
            context.fillRect(particleX, particleY, particle.size, particle.size);
        });
    }

    function render(time) {
        drawScene(time);
        if (!reducedMotion) animationFrame = requestAnimationFrame(render);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        targetCameraX = (event.clientX / window.innerWidth - .5) * -18;
        targetCameraY = (event.clientY / window.innerHeight - .5) * -10;
    }, { passive: true });
    window.addEventListener("pointerleave", () => {
        targetCameraX = 0;
        targetCameraY = 0;
    }, { passive: true });
    render(0);

    return () => cancelAnimationFrame(animationFrame);
}

/* ---------------------------------------------------------
   PROJECT IMAGE PARALLAX
   --------------------------------------------------------- */

function initProjectParallax() {
    const images = document.querySelectorAll(".project-image");

    if (!images.length) return;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const touchDevice = window.matchMedia(
        "(hover: none) and (pointer: coarse)"
    ).matches;

    if (reducedMotion || touchDevice) return;

    let ticking = false;

    function update() {
        const viewport = window.innerHeight;

        images.forEach((image) => {
            const rect = image.getBoundingClientRect();

            if (rect.bottom < 0 || rect.top > viewport) return;

            const center = rect.top + rect.height / 2;
            const distance = (center - viewport / 2) / viewport;
            const offset = Math.max(-4, Math.min(4, distance * -4));

            image.style.backgroundPosition =
                `center calc(50% + ${offset}px)`;
        });

        ticking = false;
    }

    function requestUpdate() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    update();
}

/* ---------------------------------------------------------
   PROJECT SLIDER
   --------------------------------------------------------- */

function initProjectSlider() {
    const slider = document.querySelector(".projects-slider");
    if (!slider) return;

    const slides = [...slider.querySelectorAll(".project-card")];
    const dots = [...slider.querySelectorAll(".project-dot")];
    const previous = slider.querySelector("[data-project-prev]");
    const next = slider.querySelector("[data-project-next]");
    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;
    let current = 0;
    let timer;

    function showProject(index) {
        current = (index + slides.length) % slides.length;
        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle("is-active", slideIndex === current);
        });
        dots.forEach((dot, dotIndex) => {
            const active = dotIndex === current;
            dot.classList.toggle("is-active", active);
            dot.setAttribute("aria-selected", String(active));
        });
    }

    function restartTimer() {
        window.clearInterval(timer);
        if (!reducedMotion) {
            timer = window.setInterval(() => showProject(current + 1), 6500);
        }
    }

    previous?.addEventListener("click", () => {
        showProject(current - 1);
        restartTimer();
    });

    next?.addEventListener("click", () => {
        showProject(current + 1);
        restartTimer();
    });

    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            showProject(index);
            restartTimer();
        });
    });

    showProject(0);
    restartTimer();
}

/* ---------------------------------------------------------
   CONTACT / WHATSAPP
   --------------------------------------------------------- */

function initContactForm() {
    contactForm?.addEventListener("submit", (event) => {
        event.preventDefault();

        const getValue = (id) =>
            document.getElementById(id)?.value.trim() || "";

        const name = getValue("name");
        const phone = getValue("phone");
        const email = getValue("email");
        const projectType = document.getElementById("projectType")?.value || "";
        const message = getValue("message");

        const text = [
            "Hello BRICKBUILDERS,",
            "",
            "I would like to discuss a project.",
            "",
            `Name: ${name || "Not provided"}`,
            `Phone: ${phone || "Not provided"}`,
            `Email: ${email || "Not provided"}`,
            `Project Type: ${projectType || "Not selected"}`,
            `Message: ${message || "Not provided"}`
        ].join("\n");

        const whatsappUrl =
            `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;

        window.open(
            whatsappUrl,
            "_blank",
            "noopener,noreferrer"
        );
    });
}

/* ---------------------------------------------------------
   EVENTS
   --------------------------------------------------------- */

function initEvents() {
    window.addEventListener("scroll", updateHeader, { passive: true });

    menuToggle?.addEventListener("click", toggleMobileMenu);

    navLinks.forEach((link) => {
        link.addEventListener("click", closeMobileMenu);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMobileMenu();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 780) {
            closeMobileMenu();
        }
    });
}

/* ---------------------------------------------------------
   FOOTER
   --------------------------------------------------------- */

function initFooterYear() {
    if (yearElement) {
        yearElement.textContent = String(new Date().getFullYear());
    }
}

/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */

function init() {
    updateHeader();
    initEvents();
    initScrollReveal();
    initLetterAnimation();
    initHeroParallax();
    initConstructionCanvas();
    initProjectParallax();
    initProjectSlider();
    initContactForm();
    initFooterYear();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}
