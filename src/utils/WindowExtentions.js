/**
 * 获取浏览器类型及版本
 */
Window.prototype.$getExplorerInfo = function () {
  var explorer = window.navigator.userAgent.toLowerCase();

  if (explorer.indexOf("msie") >= 0) {
    var ver = Number(explorer.match(/msie ([\d]+)/)[1]);
    return { type: "IE", version: ver };
  }
  else if (explorer.indexOf("firefox") >= 0) {
    var ver = Number(explorer.match(/firefox\/([\d]+)/)[1]);
    return { type: "Firefox", version: ver };
  }
  else if (explorer.indexOf("chrome") >= 0) {
    var ver = Number(explorer.match(/chrome\/([\d]+)/)[1]);
    return { type: "Chrome", version: ver };
  }
  else if (explorer.indexOf("opera") >= 0) {
    var ver = Number(explorer.match(/opera.([\d]+)/)[1]);
    return { type: "Opera", version: ver };
  }
  else if (explorer.indexOf("Safari") >= 0) {
    var ver = Number(explorer.match(/version\/([\d]+)/)[1]);
    return { type: "Safari", version: ver };
  }
  // Add support for Edge browser
  else if (explorer.indexOf("edge") >= 0) {
    var ver = Number(explorer.match(/edge\/([\d]+)/)[1]);
    return { type: "Edge", version: ver };
  }

  return { type: explorer, version: -1 };
};

/**
 * 检测浏览器webgl支持
 */
Window.prototype.$webglReport = function () {
  var exinfo = Window.$getExplorerInfo();
  if (exinfo.type == "IE" && exinfo.version < 11) {
    return false;
  }

  try {
    var glContext;
    var canvas = document.createElement('canvas');
    var requestWebgl2 = typeof WebGL2RenderingContext !== 'undefined';
    if (requestWebgl2) {
      glContext = canvas.getContext('webgl2') || canvas.getContext('experimental-webgl2') || undefined;
    }
    if (glContext == null) {
      glContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || undefined;
    }
    if (glContext == null) {
      return false;
    }
  } catch (e) {
    return false;
  }
  return true;
};