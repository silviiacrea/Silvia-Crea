/*
 * Silvia Crea — controlador de rendimiento no intrusivo.
 * Conserva todos los efectos visuales. Solo pausa animaciones infinitas
 * cuando la pestaña está oculta o el efecto está fuera del área visible.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const selector = '.sparkles, .item-card.is-featured, .item-card.is-offer, ' +
    '.item-card.is-featured.is-offer';

  const isInfiniteAnimation = (element) => {
    try {
      const style = getComputedStyle(element);
      return style.animationName !== 'none' &&
        style.animationIterationCount.split(',').some(value =>
          value.trim() === 'infinite'
        );
    } catch (_) {
      return false;
    }
  };

  const observeAnimatedElement = (element) => {
    if (!(element instanceof Element) || !element.matches(selector)) return;
    if (intersectionObserver && isInfiniteAnimation(element)) {
      intersectionObserver.observe(element);
    }
  };

  let intersectionObserver = null;
  if ('IntersectionObserver' in window) {
    intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target;
        if (document.hidden) continue;
        element.classList.toggle('perf-pause-infinite', !entry.isIntersecting);
      }
    }, { root: null, rootMargin: '120px 0px', threshold: 0.01 });
  }

  const updateVisibility = () => {
    const hidden = document.hidden;
    root.classList.toggle('silvia-tab-hidden', hidden);
    if (!hidden) {
      document.querySelectorAll('.perf-pause-infinite').forEach(element => {
        if (!intersectionObserver) element.classList.remove('perf-pause-infinite');
      });
    }
  };

  document.addEventListener('visibilitychange', updateVisibility, { passive: true });
  updateVisibility();

  const scan = (node) => {
    if (!(node instanceof Element)) return;
    observeAnimatedElement(node);
    node.querySelectorAll?.(selector).forEach(observeAnimatedElement);
  };

  const start = () => {
    document.querySelectorAll(selector).forEach(observeAnimatedElement);
    if ('MutationObserver' in window && document.body) {
      const mutationObserver = new MutationObserver(records => {
        for (const record of records) {
          record.addedNodes.forEach(node => {
            if (node.nodeType === 1) scan(node);
          });
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
