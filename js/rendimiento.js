/*
 * Silvia Crea — optimización de pestaña.
 * No consulta prefers-reduced-motion ni detecta el ahorro de energía:
 * las animaciones de marca permanecen activas cuando la página está visible.
 * Al cambiar a otra pestaña, se pausan para liberar CPU y se reanudan al volver.
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const sync = () => {
    root.classList.toggle('silvia-tab-hidden', document.visibilityState === 'hidden');
  };
  document.addEventListener('visibilitychange', sync, { passive: true });
  window.addEventListener('pageshow', sync, { passive: true });
  window.addEventListener('pagehide', sync, { passive: true });
  sync();
})();
