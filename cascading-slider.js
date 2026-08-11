/* ============================================================
   CASCADING SLIDER (Osmo) — clip-path cascading carousel
   Needs gsap (already loaded on the page).
   ============================================================ */
(function () {
  "use strict";
  if (typeof window.gsap === "undefined") return;
  var gsap = window.gsap;

  function initCascadingSlider() {
    const duration = 0.65;
    const ease = 'power3.inOut';

    const breakpoints = [
      { maxWidth: 479, activeWidth: 0.78, siblingWidth: 0.08 },
      { maxWidth: 767, activeWidth: 0.70, siblingWidth: 0.10 },
      { maxWidth: 991, activeWidth: 0.60, siblingWidth: 0.10 },
      { maxWidth: Infinity, activeWidth: 0.60, siblingWidth: 0.13 },
    ];

    const wrappers = document.querySelectorAll('[data-cascading-slider-wrap]');
    wrappers.forEach(setupInstance);

    function setupInstance(wrapper) {
      const viewport = wrapper.querySelector('[data-cascading-viewport]');
      const prevButton = wrapper.querySelector('[data-cascading-slider-prev]');
      const nextButton = wrapper.querySelector('[data-cascading-slider-next]');
      const slides = Array.from(viewport.querySelectorAll('[data-cascading-slide]'));
      let totalSlides = slides.length;

      if (totalSlides === 0) return;

      if (totalSlides < 9) {
        const originalSlides = slides.slice();
        while (slides.length < 9) {
          originalSlides.forEach(function (original) {
            const clone = original.cloneNode(true);
            clone.setAttribute('data-clone', '');
            viewport.appendChild(clone);
            slides.push(clone);
          });
        }
        totalSlides = slides.length;
      }

      let activeIndex = 0;
      let isAnimating = false;
      let slideWidth = 0;
      let slotCenters = {};
      let slotWidths = {};

      function readGap() {
        const raw = getComputedStyle(viewport).getPropertyValue('--gap').trim();
        if (!raw) return 0;
        const temp = document.createElement('div');
        temp.style.width = raw;
        temp.style.position = 'absolute';
        temp.style.visibility = 'hidden';
        viewport.appendChild(temp);
        const px = temp.offsetWidth;
        viewport.removeChild(temp);
        return px;
      }

      function getSettings() {
        const windowWidth = window.innerWidth;
        for (let i = 0; i < breakpoints.length; i++) {
          if (windowWidth <= breakpoints[i].maxWidth) return breakpoints[i];
        }
        return breakpoints[breakpoints.length - 1];
      }

      function getOffset(slideIndex, fromIndex) {
        if (fromIndex === undefined) fromIndex = activeIndex;
        let distance = slideIndex - fromIndex;
        const half = totalSlides / 2;
        if (distance > half) distance -= totalSlides;
        if (distance < -half) distance += totalSlides;
        return distance;
      }

      function measure() {
        const settings = getSettings();
        const viewportWidth = viewport.offsetWidth;
        const gap = readGap();

        const activeSlideWidth = viewportWidth * settings.activeWidth;
        const siblingSlideWidth = viewportWidth * settings.siblingWidth;
        const farSlideWidth = Math.max(0, (viewportWidth - activeSlideWidth - 2 * siblingSlideWidth - 4 * gap) / 2);

        slideWidth = activeSlideWidth;

        const visibleSlots = [
          { slot: -2, width: farSlideWidth },
          { slot: -1, width: siblingSlideWidth },
          { slot: 0, width: activeSlideWidth },
          { slot: 1, width: siblingSlideWidth },
          { slot: 2, width: farSlideWidth },
        ];

        let x = 0;
        visibleSlots.forEach(function (def, i) {
          slotCenters[String(def.slot)] = x + def.width / 2;
          slotWidths[String(def.slot)] = def.width;
          if (i < visibleSlots.length - 1) x += def.width + gap;
        });

        slotCenters['-3'] = slotCenters['-2'] - farSlideWidth / 2 - gap - farSlideWidth / 2;
        slotWidths['-3'] = farSlideWidth;
        slotCenters['3'] = slotCenters['2'] + farSlideWidth / 2 + gap + farSlideWidth / 2;
        slotWidths['3'] = farSlideWidth;

        slides.forEach(function (slide) {
          slide.style.width = slideWidth + 'px';
        });
      }

      function getSlideProps(offset) {
        const clamped = Math.max(-3, Math.min(3, offset));
        const slotWidth = slotWidths[String(clamped)];
        const clipAmount = Math.max(0, (slideWidth - slotWidth) / 2);
        const translateX = slotCenters[String(clamped)] - slideWidth / 2;

        return {
          x: translateX,
          '--clip': clipAmount,
          zIndex: 10 - Math.abs(clamped),
        };
      }

      function layout(animate, previousIndex) {
        slides.forEach(function (slide, index) {
          const offset = getOffset(index);

          if (offset < -3 || offset > 3) {
            if (animate && previousIndex !== undefined) {
              const previousOffset = getOffset(index, previousIndex);
              if (previousOffset >= -2 && previousOffset <= 2) {
                const exitSlot = previousOffset < 0 ? -3 : 3;
                gsap.to(slide, Object.assign({}, getSlideProps(exitSlot), {
                  duration: duration,
                  ease: ease,
                  overwrite: true,
                }));
                return;
              }
            }

            const parkSlot = offset < 0 ? -3 : 3;
            gsap.set(slide, getSlideProps(parkSlot));
            return;
          }

          const props = getSlideProps(offset);
          slide.setAttribute('data-status', offset === 0 ? 'active' : 'inactive');

          if (animate) {
            gsap.to(slide, Object.assign({}, props, {
              duration: duration,
              ease: ease,
              overwrite: true,
            }));
          } else {
            gsap.set(slide, props);
          }
        });
      }

      function goTo(targetIndex) {
        const normalizedTarget = ((targetIndex % totalSlides) + totalSlides) % totalSlides;
        if (isAnimating || normalizedTarget === activeIndex) return;
        isAnimating = true;

        const previousIndex = activeIndex;
        const travelDirection = getOffset(normalizedTarget, previousIndex) > 0 ? 1 : -1;

        slides.forEach(function (slide, index) {
          const currentOffset = getOffset(index, previousIndex);
          const nextOffset = getOffset(index, normalizedTarget);
          const wasInRange = currentOffset >= -3 && currentOffset <= 3;
          const willBeVisible = nextOffset >= -2 && nextOffset <= 2;

          if (!wasInRange && willBeVisible) {
            const entrySlot = travelDirection > 0 ? 3 : -3;
            gsap.set(slide, getSlideProps(entrySlot));
          }

          const wasInvisible = Math.abs(currentOffset) >= 3;
          const willBeStaging = Math.abs(nextOffset) === 3;
          const crossesSides = currentOffset * nextOffset < 0;
          if (wasInvisible && willBeStaging && crossesSides) {
            gsap.set(slide, getSlideProps(nextOffset > 0 ? 3 : -3));
          }
        });

        activeIndex = normalizedTarget;
        layout(true, previousIndex);
        gsap.delayedCall(duration + 0.05, function () { isAnimating = false; });
      }

      if (prevButton) prevButton.addEventListener('click', function () { goTo(activeIndex - 1); });
      if (nextButton) nextButton.addEventListener('click', function () { goTo(activeIndex + 1); });

      slides.forEach(function (slide, index) {
        slide.addEventListener('click', function () {
          if (index !== activeIndex) goTo(index);
        });
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowLeft') goTo(activeIndex - 1);
        if (event.key === 'ArrowRight') goTo(activeIndex + 1);
      });

      let resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          measure();
          layout(false);
        }, 100);
      });

      measure();
      layout(false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener('DOMContentLoaded', initCascadingSlider);
  } else {
    initCascadingSlider();
  }
})();
