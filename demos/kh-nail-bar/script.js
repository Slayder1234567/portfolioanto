/* ============================================
   KH NAIL BAR — Interactions
   ============================================ */

window.history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

document.addEventListener('DOMContentLoaded', () => {

    // ---- Navbar Scroll ----
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 80);
    });

    // ---- Mobile Nav Toggle ----
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('open');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('open');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // ---- Active Nav Link on Scroll ----
    const sections = document.querySelectorAll('section[id]');
    const navLinkEls = document.querySelectorAll('.nav-link');

    const observerNav = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinkEls.forEach(link => {
                    link.classList.toggle('active',
                        link.getAttribute('href') === '#' + entry.target.id
                    );
                });
            }
        });
    }, { threshold: 0.3 });

    sections.forEach(section => observerNav.observe(section));

    // ---- Reveal on Scroll ----
    const revealElements = document.querySelectorAll('.reveal');

    const observerReveal = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
                observerReveal.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    revealElements.forEach(el => observerReveal.observe(el));

    // ---- Contact Form ----
    const contactForm = document.getElementById('contactForm');
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const btn = contactForm.querySelector('button[type="submit"]');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span>Request sent!</span>';
        btn.style.background = 'var(--beige-dark)';

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            contactForm.reset();
        }, 3000);
    });

    // ---- Smooth Scroll ----
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ---- Marquee hover fix ----
    const marqueeTrack = document.querySelector('.marquee-track');
    if (marqueeTrack) {
        let lastHovered = null;
        marqueeTrack.addEventListener('mousemove', (e) => {
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && el.matches('.marquee-content span:not(.marquee-dot)')) {
                if (lastHovered && lastHovered !== el) lastHovered.classList.remove('marquee-hovered');
                el.classList.add('marquee-hovered');
                lastHovered = el;
            } else if (lastHovered) {
                lastHovered.classList.remove('marquee-hovered');
                lastHovered = null;
            }
        });
        marqueeTrack.addEventListener('mouseleave', () => {
            if (lastHovered) {
                lastHovered.classList.remove('marquee-hovered');
                lastHovered = null;
            }
        });
    }

    // ---- Gallery hover parallax effect ----
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('mousemove', (e) => {
            const rect = item.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            const img = item.querySelector('img');
            if (img) {
                img.style.transform = `scale(1.08) translate(${x * 10}px, ${y * 10}px)`;
            }
        });

        item.addEventListener('mouseleave', () => {
            const img = item.querySelector('img');
            if (img) {
                img.style.transform = '';
            }
        });
    });

    // ---- Addon cards: set wrapper height to card's collapsed height ----
    document.querySelectorAll('.addon-wrap').forEach(wrap => {
        const card = wrap.querySelector('.addon-card');
        if (card) {
            wrap.style.height = card.offsetHeight + 'px';
        }
    });

    // ---- Policy cards stagger ----
    document.querySelectorAll('.policy-card').forEach((card, i) => {
        card.style.transitionDelay = `${i * 0.08}s`;
    });

});
