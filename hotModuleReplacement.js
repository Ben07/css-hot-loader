var normalizeUrl = require('normalize-url');
var srcByModuleId = Object.create(null);

var getCurrentScriptUrl = function(moduleId) {
  var src = srcByModuleId[moduleId];
  if (!src && document) {
    if (document.currentScript) {
      src = document.currentScript.src;
    } else {
      var scripts = document.getElementsByTagName('script');
      src = scripts[scripts.length - 1].src;
    }
    srcByModuleId[moduleId] = src;
  }

  return function(fileMap) {
    var splitResult = /([^\\/]+)\.js$/.exec(src);
    var filename = splitResult && splitResult[1];
    if (!filename) {
      return [src.replace('.js', '.css')];
    }
    return fileMap.split(',').map(function(mapRule) {
      var reg = new RegExp(filename + '\\.js$', 'g')
      return normalizeUrl(src.replace(reg, mapRule.replace(/{fileName}/g, filename) + '.css'), { stripWWW: false });
    });
  };
}

function updateCss(el, url) {
  if (!url) {
    url = el.href.split('?')[0];
  }

  if (!url || !(url.indexOf('.css') > -1)) return;

  var newEl = el.cloneNode();
  newEl.addEventListener('load', function () {
    el.remove();
  });
  newEl.addEventListener('error', function () {
    el.remove();
  });
  newEl.href = url + '?' + Date.now();
  el.parentNode.appendChild(newEl);
}

function reloadStyle(src) {
  var elements = document.querySelectorAll('link');
  var loaded = false;
  [].slice.call(elements).forEach(function(el) {
    var url = getReloadUrl(el.href, src);
    if (url) {
      updateCss(el, url);
      loaded = true;
    }
  });
  return loaded;
}

function getReloadUrl(href, src) {
  href = normalizeUrl(href, { stripWWW: false });
  var ret;
  src.some(function(url) {
    if (href.indexOf(src) > -1) {
      ret = url;
    }
  });
  return ret;
}

function reloadAll() {
  var elements = document.querySelectorAll('link');
  [].slice.call(elements).forEach(function(el) {
    updateCss(el);
  });
}

module.exports = function(moduleId, options) {
  var getScriptSrc = getCurrentScriptUrl(moduleId);
  return function() {
    if (typeof document === 'undefined') {
      return;
    }

    var src = getScriptSrc(options.fileMap);
    var reloaded = reloadStyle(src);
    if (reloaded) {
      console.log('[HMR] css reload %s', src.join(' '));
    } else {
      console.log('[HMR] Reload all css');
      reloadAll();
    }
  }
};
