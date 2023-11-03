Map3D = Map3D || (() => { throw new Error('Map3D is not defined'); })();
Map3D.prototype.lottie = {
  apiList: ['https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js'],
  init: async function (viewer) {
    this.destroy();
    var t = this;
    t.viewer = viewer;
    await t._create3DLibrary();
  },
  /**
   * 加载lottie动画库
   */
  _create3DLibrary() {
    var cssExpr = new RegExp("\\.css");
    if (navigator.onLine) {
      console.log("设备已连接到互联网,开始加载lottie动画库");

      const promises = this.apiList.map(url => {
        return new Promise((resolve, reject) => {
          const element = cssExpr.test(url)
            ? Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${url}`, onload: resolve, onerror: reject })
            : Object.assign(document.createElement('script'), { src: `${url}`, ['defer']: true, onload: resolve, onerror: reject });
          document.head.appendChild(element);
        });
      });

      return Promise.all(promises);
    }
  },
  createAnimation(dom, { animationJson }) {
    if (!dom) throw new Error("dom 不能为空");
    if (!animationJson) throw new Error("animationJson 不能为空");

    const element = typeof dom === 'string' ? document.getElementById(dom) : dom;

    if (!(element instanceof Element || element instanceof HTMLDocument)) throw new Error("dom 类型错误");

    const animation = bodymovin.loadAnimation({
      container: element,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: animationJson
    });
    return animation;
  },
  destroy() {

  },
};
