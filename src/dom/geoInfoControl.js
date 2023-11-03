Map3D = Map3D || (() => { throw new Error('Map3D is not defined'); })();
Map3D.prototype.geo = {
  box: {
    handler: null,
    viewer: null,
    helper: null,
    apiList: ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'],
    init: function (viewer) {
      this.destroy();

      var t = this;
      t.viewer = viewer;
      t._createGeoDms();
      t._createClass();
      t._create3DLibrary();
      t._createNotifyProperty();
    },
    /**
     * 加载gsap动画库
     */
    _create3DLibrary() {
      // cssExpr 用于判断资源是否是css
      var cssExpr = new RegExp("\\.css");
      if (navigator.onLine) {
        console.log("设备已连接到互联网,开始加载gsap动画库");
        this.apiList.forEach(url => {
          const element = cssExpr.test(url)
            ? Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${url}` })
            : Object.assign(document.createElement('script'), { src: `${url}`, ['defer']: true });
          document.head.appendChild(element);
        });
      } else {
        console.log("设备未连接到互联网,无法加载gsap动画库");
      }


    },
    _createClass: function () {
      // 创建一个style元素
      var style = document.createElement('style');

      // 设置style元素的type属性
      style.setAttribute('type', 'text/css');

      // 设置style元素的innerHTML内容，动态注入样式
      style.innerHTML = ` #geo-info-control {position: absolute;z-index: 991;width: 100%;padding: 6px 10px;font-size: 13px;color: rgb(233, 233, 233);text-shadow: 2px 2px 2px #000;background-color: rgb(14 14 14 / 64%);right: 0px;bottom: 0px;background: rgba(255, 255, 255, 0);}#geo-info-control div{float: right;min-width: 80px;margin-right: 20px;}`;
      style.innerHTML += ` #geo-percentage-text {margin-left: 8px; text-align: right; width: 32px; font-size: 13px;}`
      style.innerHTML += ` #geo-percentage-ontrol {display: flex;flex-direction: row;align-items: center;}`
      style.innerHTML += ` #geo-percentage-loader {display: flex;flex-direction: row;align-items: center;top: 0px;float: left; min-width: 0px; margin-left: 45px; margin-right: 0;width: 16px;height: 14px;display: inline-block;position: relative;}#geo-percentage-loader::after, #geo-percentage-loader::before {content: "";width: 10px;height: 10px;border-radius: 50%;border: 2px solid #8ab4f8;position: absolute;left: 0;-webkit-animation: animloader14 0s linear infinite;animation: animloader14 0s linear infinite;}#geo-percentage-loader::after {-webkit-animation-delay: 1s;animation-delay: 1s;}`
      style.innerHTML += `.geo-percentage-loader-animation {top: 0px;float: left; min-width: 0px; margin-left: 45px;width: 16px;height: 16px;display: inline-block;position: relative;}.geo-percentage-loader-animation::after, .geo-percentage-loader-animation::before {content: "";opacity: 0;width: 12px;height: 12px;border-radius: 50%;border: 2px solid #fff;position: absolute;left: 0;top: 0;-webkit-animation: geo-animloader1 2s linear infinite;animation: geo-animloader1 2s linear infinite;}.geo-percentage-loader-animation::after {-webkit-animation-delay: 1s;animation-delay: 1s;}@-webkit-keyframes geo-animloader1 {0% {transform: scale(0);opacity: 1;}100% {transform: scale(1);opacity: 0;}}@keyframes geo-animloader1 {0% {transform: scale(0);opacity: 1;}100% {transform: scale(1);opacity: 0;}}`
      style.innerHTML += ` #geo-info-control div:nth-child(1) {float: left; }`

      // 将style元素添加到head元素中
      document.head.appendChild(style);
    },
    _createGeoDms: function () {
      // 用于创建div元素的函数
      const createElem = (type, id, text = "") => {
        const elem = document.createElement(type);
        elem.id = id;
        elem.textContent = text;
        return elem;
      };

      // 创建父级div元素
      const geoInfoControl = createElem("div", "geo-info-control");

      // 创建子级div元素
      const geoPercentageControl = createElem("div", "geo-percentage-ontrol");
      geoPercentageControl.appendChild(createElem("span", "geo-percentage-loader"));
      geoPercentageControl.appendChild(createElem("span", "geo-percentage-text", "100%"));
      geoInfoControl.appendChild(geoPercentageControl);

      // 遍历数组并创建其他子级div元素并设置内容
      const elems = [
        { id: "geo-camera_z", text: "相机:19619961.51米" },
        { id: "geo-mouse-terrain_z", text: "高程:右键地图获取米" },
        { id: "geo-mouse-terrain_y", text: "维:55.539356" },
        { id: "geo-mouse-terrain_x", text: "经:-54.647885" },
        { id: "geo-dms", text: "-54°38'52.38\"N 55°32'21.68\"E" },
      ];
      elems.forEach((elem) => geoInfoControl.appendChild(createElem("div", elem.id, elem.text)));

      // 将父级div元素添加到<body>标签中
      document.body.appendChild(geoInfoControl);

    },
    _createNotifyProperty() {
      let that = this;
      // 获取创建的元素
      const { geoMouseTerrainZ, geoMouseTerrainY, geoMouseTerrainX, geoCameraZ, geoDms, geoPercentageLoader, geoPercentageText } = {
        geoMouseTerrainZ: document.getElementById("geo-mouse-terrain_z"),
        geoMouseTerrainY: document.getElementById("geo-mouse-terrain_y"),
        geoMouseTerrainX: document.getElementById("geo-mouse-terrain_x"),
        geoCameraZ: document.getElementById("geo-camera_z"),
        geoDms: document.getElementById("geo-dms"),
        geoPercentageLoader: document.getElementById("geo-percentage-loader"),
        geoPercentageText: document.getElementById("geo-percentage-text"),
      };
      if (!geoMouseTerrainZ || !geoMouseTerrainY || !geoMouseTerrainX || !geoCameraZ || !geoDms || !geoPercentageLoader || !geoPercentageText) return;

      // 获取viewer对象
      const viewer = this.viewer;
      const camera = viewer.camera;
      const scene = viewer?.scene || (() => { throw new Error('viewer is not defined') })();
      this.handler = this.handler || new Cesium.ScreenSpaceEventHandler(scene.canvas);
      this.handler.setInputAction(function (movement) {

        const { x, y } = movement.endPosition
          ? movement.endPosition
          : movement.position;
        var ray = viewer.scene.camera.getPickRay({ x, y });
        var cartesian = viewer.scene.globe.pick(ray, scene) || viewer.scene.camera.pickEllipsoid({ x, y }, scene.globe.ellipsoid);
        if (!cartesian) return;

        var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        var { longitude, latitude, height } =
        {
          longitude: Cesium.Math.toDegrees(cartographic.longitude),
          latitude: Cesium.Math.toDegrees(cartographic.latitude),
          height: cartographic.height.toFixed(1)
        };


        function updateElementWithAnimation(element, content) {
          if (typeof gsap === 'undefined') {
            element.textContent = content;
            return
          };
          gsap.to(element, {
            duration: 0.3,
            opacity: 0,
            onComplete: function () {
              element.textContent = content;
              gsap.to(element, { duration: 0.3, opacity: 0.5 });
            }
          });
        }

        updateElementWithAnimation(geoMouseTerrainX, `经:${longitude.toFixed(6)}`);
        updateElementWithAnimation(geoMouseTerrainY, `纬:${latitude.toFixed(6)}`);
        updateElementWithAnimation(geoMouseTerrainZ, `高程:${height > 0 ? height : 0}米`);
        updateElementWithAnimation(geoDms, `${that._toDegrees(longitude.toFixed(6))}N ${that._toDegrees(latitude.toFixed(6))}E`);

      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      this.handler.setInputAction(function (event) {
        var cameraCartographic = camera.positionCartographic;
        geoCameraZ.textContent = `相机:${cameraCartographic.height.toFixed(2)}米`;
      }, Cesium.ScreenSpaceEventType.WHEEL);

      // 监控地图加载
      this.helper = new Cesium.EventHelper();

      var count = 0;
      var wrongNumber = 0;

      function getPercent(num, total) {
        num = parseFloat(num);
        total = parseFloat(total);
        if (isNaN(num) || isNaN(total)) {
          return "-";
        }
        return total <= 0 ? 0 : Math.round((num / total) * 10000) / 100.0;
      }

      this.helper.add(viewer.scene.globe.tileLoadProgressEvent, function (e) {
        geoPercentageLoader.classList.add('geo-percentage-loader-animation');
        geoPercentageLoader.id = "";
        if (e > count) {
          count = e;
        }

        if (++wrongNumber > 2) {
          wrongNumber = 0;
          geoPercentageText.innerText = (100 - getPercent(e, count)).toFixed(0) + "%";
        }

        if (e === 0) {
          count = 0;
          geoPercentageLoader.id = "geo-percentage-loader";
          geoPercentageText.innerText = (100 - getPercent(e, count)).toFixed(0) + "%";
          geoPercentageLoader.classList.remove('geo-percentage-loader-animation');
        }
      });
    },
    _toDegrees(val) {
      if (typeof val === "undefined" || val === "") {
        return "";
      }

      var degrees = Math.floor(val);
      var minutes = Math.floor((val - degrees) * 60);
      var seconds = ((val - degrees - minutes / 60) * 3600).toFixed(2);

      return degrees + "°" + minutes + "'" + seconds + "\"";
    },
    destroy() {
      // 移除样式元素
      var styleElement = document.querySelector('style[type="text/css"]');
      if (styleElement) {
        styleElement.remove();
      }

      // 移除父级div元素
      var geoInfoControl = document.getElementById('geo-info-control');
      if (geoInfoControl) {
        geoInfoControl.parentNode.removeChild(geoInfoControl);
      }

      // 停止事件监听
      if (this.handler) {
        this.handler.destroy();
        this.handler = null;
      }

      // 停止事件监听
      if (this.helper) {
        this.helper.removeAll();
        this.helper = null;
      }

      var cssExpr = new RegExp("\\.css");
      const scriptElements = document.getElementsByTagName('script');
      this.apiList.forEach(url => {
        const element = cssExpr.test(url)
          ? Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${url}` })
          : Object.assign(document.createElement('script'), { src: `${url}`, ['defer']: true });

        for (const scriptElement of scriptElements)
          if (scriptElement.src === url)
            document.head.removeChild(element);
      });
      // 清空viewer引用
      this.viewer = null;
    },
  }
};
