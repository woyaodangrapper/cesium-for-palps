/*第三方类库加载管理js，方便切换lib*/
(function () {
  const targetScript = document.currentScript;

  //当前版本号,用于清理浏览器缓存
  var cacheVersion = Date.parse(new Date());

  // cssExpr 用于判断资源是否是css
  var cssExpr = new RegExp("\\.css");

  function inputLibs(list = []) {
    const libmods = targetScript.getAttribute("libmods") || "defer";

    list.forEach(url => {
      const element = cssExpr.test(url)
        ? Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${url}?time=${cacheVersion}` })
        : Object.assign(document.createElement('script'), { src: `${url}?time=${cacheVersion}`, [libmods]: true });

      document.head.appendChild(element);
    });
  }


  //加载类库资源文件
  function load() {
    var arrInclude = (targetScript.getAttribute("include") || "").split(",");
    var libpath = targetScript.getAttribute("libpath") || "";
    if (libpath.lastIndexOf("/") != libpath.length - 1) libpath += "/";

    var libsConfig = {
      cesium: [
        libpath + "lib/Cesium/Cesium.js",
        libpath + "lib/Cesium/Widgets/widgets.css",
      ],
      util: [
        libpath + "utils/RegexExtentions.js",
        libpath + "utils/WindowExtentions.js",
      ]
    };

    for (var i in arrInclude) {
      var key = arrInclude[i];
      inputLibs(libsConfig[key]);
    }

  }

  load();
})();
