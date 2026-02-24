/**
 * Social Media Automation — CMS Embed Script
 *
 * Usage:
 * <script src="https://YOUR_FRONTEND_URL/embed.js"
 *         data-container="sma-embed"
 *         data-width="100%"
 *         data-height="800px"
 *         data-theme="dark">
 * </script>
 */
(function() {
  'use strict';

  // Auto-detect app URL from script src
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var scriptSrc = currentScript.getAttribute('src') || '';
  var APP_URL = scriptSrc.replace(/\/embed\.js.*$/, '') || window.location.origin;

  function getScriptConfig() {
    return {
      container: currentScript.getAttribute('data-container') || 'sma-embed',
      width: currentScript.getAttribute('data-width') || '100%',
      height: currentScript.getAttribute('data-height') || '800px',
      apiKey: currentScript.getAttribute('data-api-key') || null,
      projectId: currentScript.getAttribute('data-project-id') || null,
      theme: currentScript.getAttribute('data-theme') || 'dark',
    };
  }

  function mountTool() {
    var config = getScriptConfig();

    // Get or create container
    var container = document.getElementById(config.container);
    if (!container) {
      container = document.createElement('div');
      container.id = config.container;
      document.body.appendChild(container);
    }

    // Build iframe URL
    var iframeUrl = APP_URL;
    var params = new URLSearchParams();
    if (config.projectId) params.append('projectId', config.projectId);
    if (config.apiKey) params.append('apiKey', config.apiKey);
    if (config.theme) params.append('theme', config.theme);
    var qs = params.toString();
    if (qs) iframeUrl += '?' + qs;

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.width = config.width;
    iframe.style.height = config.height;
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
    iframe.setAttribute('title', 'Social Media Automation');

    container.innerHTML = '';
    container.appendChild(iframe);
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    console.log('[SMA] Embed mounted successfully');

    // PostMessage communication
    window.addEventListener('message', function(event) {
      if (event.origin !== APP_URL) return;
      switch (event.data.type) {
        case 'SMA_READY':
          console.log('[SMA] Ready');
          break;
        case 'SMA_RESIZE':
          if (event.data.height) {
            iframe.style.height = event.data.height + 'px';
          }
          break;
      }
    });

    iframe.onload = function() {
      iframe.contentWindow.postMessage({
        type: 'SMA_CONFIG',
        config: config
      }, APP_URL);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountTool);
  } else {
    mountTool();
  }

  // Global API
  window.SocialMediaAutomation = window.SocialMediaAutomation || {
    version: '1.0.0',
    mount: mountTool,
    config: getScriptConfig,
    reload: function() {
      var config = getScriptConfig();
      var container = document.getElementById(config.container);
      if (container) {
        var iframe = container.querySelector('iframe');
        if (iframe) iframe.src = iframe.src;
      }
    },
    destroy: function() {
      var config = getScriptConfig();
      var container = document.getElementById(config.container);
      if (container) container.innerHTML = '';
    },
    postMessage: function(message) {
      var config = getScriptConfig();
      var container = document.getElementById(config.container);
      if (container) {
        var iframe = container.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(message, APP_URL);
        }
      }
    }
  };
})();
