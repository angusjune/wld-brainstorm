/**
 * Brainstorm — Browser live reload client
 * Injected into every screen served by the brainstorm server.
 *
 * Feature: Live reload via SSE (server pushes reload when files change)
 */

(function () {
  'use strict';

  const SSE_URL = window.__BRAINSTORM_SSE_URL || '/api/events';

  function connectSSE() {
    const es = new EventSource(SSE_URL);
    es.onmessage = (e) => {
      if (e.data === 'reload') {
        location.reload();
      }
    };
    es.onerror = () => {
      es.close();
      setTimeout(connectSSE, 2000);
    };
  }
  connectSSE();
})();
