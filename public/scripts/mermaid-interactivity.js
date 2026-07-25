/**
 * Mermaid Diagram Interactive Handlers
 * Provides zoom, pan, 1:1 reset, and SVG/PNG download functionality
 * for compiled Markdown documents.
 */
if (!window.__mermaidHandlersInitialized) {
  window.__mermaidHandlersInitialized = true;

  window.__mermaidZoom = function (btn, factor) {
    var card = btn.closest('.mermaid-diagram-card');
    if (!card) return;
    var viewport = card.querySelector('.mermaid-svg-viewport');
    if (!viewport) return;

    var currentScale = parseFloat(viewport.getAttribute('data-scale') || '1');
    var newScale = Math.max(0.4, Math.min(3.5, currentScale * factor));
    viewport.setAttribute('data-scale', newScale.toString());
    viewport.style.transform = 'scale(' + newScale + ')';
    viewport.style.transformOrigin = 'top center';
  };

  window.__mermaidResetZoom = function (btn) {
    var card = btn.closest('.mermaid-diagram-card');
    if (!card) return;
    var viewport = card.querySelector('.mermaid-svg-viewport');
    if (!viewport) return;

    viewport.setAttribute('data-scale', '1');
    viewport.style.transform = 'scale(1)';
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
    if (card) {
      card.scrollLeft = 0;
      card.scrollTop = 0;
    }
  };

  window.__mermaidWheel = function (event, viewport) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      event.preventDefault();
      var currentScale = parseFloat(viewport.getAttribute('data-scale') || '1');
      var factor = event.deltaY < 0 ? 1.15 : 0.85;
      var newScale = Math.max(0.4, Math.min(3.5, currentScale * factor));
      viewport.setAttribute('data-scale', newScale.toString());
      viewport.style.transform = 'scale(' + newScale + ')';
      viewport.style.transformOrigin = 'top center';
    }
  };

  window.__mermaidPanStart = function (event, viewport) {
    if (event.button !== 0) return;
    var target = event.target;
    if (target && (target.closest('.mermaid-toolbar') || target.tagName === 'BUTTON')) return;

    event.preventDefault();
    var startX = event.clientX;
    var startY = event.clientY;
    var scrollLeft = viewport.scrollLeft;
    var scrollTop = viewport.scrollTop;
    var card = viewport.closest('.mermaid-diagram-card');
    var cardScrollLeft = card ? card.scrollLeft : 0;
    var cardScrollTop = card ? card.scrollTop : 0;

    viewport.style.cursor = 'grabbing';

    function onMouseMove(moveEvent) {
      var dx = moveEvent.clientX - startX;
      var dy = moveEvent.clientY - startY;
      viewport.scrollLeft = scrollLeft - dx;
      viewport.scrollTop = scrollTop - dy;
      if (card) {
        card.scrollLeft = cardScrollLeft - dx;
        card.scrollTop = cardScrollTop - dy;
      }
    }

    function onMouseUp() {
      viewport.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  window.__mermaidDownloadSvg = function (btn) {
    var card = btn.closest('.mermaid-diagram-card');
    if (!card) return;
    var svgEl = card.querySelector('svg');
    if (!svgEl) return;

    var svgData = new XMLSerializer().serializeToString(svgEl);
    var blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'mermaid-diagram-' + Date.now() + '.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  window.__mermaidDownloadPng = function (btn) {
    var card = btn.closest('.mermaid-diagram-card');
    if (!card) return;
    var svgEl = card.querySelector('svg');
    if (!svgEl) return;

    var svgData = new XMLSerializer().serializeToString(svgEl);
    if (!svgData.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      svgData = svgData.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Modern UTF-8 Data URI encoding (no deprecated unescape)
    var dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);

    var img = new Image();
    img.onload = function () {
      var bbox = svgEl.getBoundingClientRect();
      var width = Math.max(bbox.width || 800, 400);
      var height = Math.max(bbox.height || 600, 300);
      var scale = 2;

      var canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      var ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Transparent Canvas Background (no fillRect)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);

      var pngUrl = canvas.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'mermaid-diagram-' + Date.now() + '.png';
      a.click();
    };
    img.src = dataUrl;
  };
}
