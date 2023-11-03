let defaultOptions = {
  mapId: "mapBox",
  noBasemap: true,
  noTerrain: true
}
var that;
var gisData;

/**
 * 初始化基础类
 */
class Map3D {
  //========== 构造方法 ========== 
  constructor(options) {
    // if (!$webglReport()) throw new Error("浏览器不支持WebGL，需更换浏览器");
    if (!options) options = defaultOptions;
    that = this;
    this.mapId = options.mapId || defaultOptions.mapId;
    this.noTerrain = (options.noTerrain != null ? options.noTerrain : defaultOptions.noTerrain);
    this.noBasemap = (options.noBasemap != null ? options.noBasemap : defaultOptions.noBasemap);

    //传入了DOM
    if (!options.dom)
      this._createMapEle()

    this._create3DLibrary()
    return new Promise((resolve, reject) => {
      try {
        window.onload = async () => {
          let viewer = that._viewer = await this._createMap();
          this._loadingImageUnderlays(viewer)

          resolve({ viewer, mapMain: that })
        };
      } catch (error) {
        reject(error)
      }
    })

  }

  //========== 对外属性 ========== 
  /**
   *  获取viewer
   */
  get viewer() {
    return this._viewer;
  }

  //创建Map元素
  _createMapEle() {//创建可视域video DOM  元素
    const mapContainer = document.createElement('div');
    mapContainer.classList.add('map-container');
    mapContainer.style.zIndex = 999;
    mapContainer.id = this.mapId;
    document.body.appendChild(mapContainer);
    return mapContainer;
  }

  /**
   * 加载3D库
   */
  _create3DLibrary() {
    // var script = ['<!-- 额外依赖 --><script type="text/javascript" src="./src/core/index.js" libpath="../" defer></script>'];
    // script.forEach(element => {
    //   document.writeln(element);
    // });
  }
  /**
   * 创建地图
   */
  _createMap() {
    let that = this;
    return new Promise((resolve, reject) => {
      that._create3D({
        id: this.mapId,
        showGroundAtmosphere: true,
        success: function (_viewer) {
          _viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
          resolve(_viewer)
        }
      }, Cesium);
    })

  }
  _create3D(options, Cesium) {
    Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNGZiOTc1NS0zZmZlLTQ4MzUtODFlMS00ZDI2NWE5YTFkZjIiLCJpZCI6MTgwMDUsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NzMxMTcwODd9.WPytI-wsAoBmC7NLmz01l0GcYoh3bvTES7z1yZQgGMM";

    class MyCesiumViewer {
      constructor(options) {
        const {
          geocoder = false,
          homeButton = false,
          sceneModePicker = false,
          baseLayerPicker = false,
          navigationHelpButton = false,
          animation = false,
          timeLine = false,
          fullscreenButton = false,
          vrButton = false,
          infoBox = false,
          selectionIndicator = false,
          shadows = false,
          shouldAnimate = true,
          id: container
        } = options;

        Object.assign(this, { container, shouldAnimate });
        const viewer = new Cesium.Viewer(container, { options });
        this._hideCesiumElement();
        this._setMouseStyle(viewer, container);
        this._applyTerrainAdjustment(viewer);
        //创建viewer
        return { viewer, setupViewerOptions: this.setupViewerOptions }
      }


      _hideCesiumElement() {
        const elements = ["cesium-viewer-toolbar", "cesium-viewer-animationContainer", "cesium-viewer-fullscreenContainer", "cesium-viewer-timelineContainer", "cesium-viewer-bottom"];
        elements.forEach(element => {
          const el = document.querySelector(`.${element}`);
          if (el) {
            el.style.display = "none";
          }
        });
      }

      /**
       * 设置鼠标样式
       * @param {Cesium.Viewer} viewer - Cesium Viewer 对象
       * @param {string} container - 包含鼠标样式的容器元素的ID
       * @returns {Cesium.ScreenSpaceEventHandler} - 创建并返回一个ScreenSpaceEventHandler对象
       */
      _setMouseStyle(viewer, container) {
        // 创建鼠标样式的DOM元素
        const mouseZoom = document.createElement("div");
        const zoomImg = document.createElement("div");

        // 添加类名
        mouseZoom.classList.add("cesium-mousezoom");
        zoomImg.classList.add("zoomimg");

        // 将zoomImg添加到mouseZoom中
        mouseZoom.appendChild(zoomImg);
        // 将mouseZoom添加到指定的容器中
        document.getElementById(container).appendChild(mouseZoom);

        // 创建ScreenSpaceEventHandler对象
        const screenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        // 配置缩放事件类型
        viewer.scene.screenSpaceCameraController.zoomEventTypes = [
          Cesium.CameraEventType.WHEEL,
          Cesium.CameraEventType.PINCH
        ];
        // 配置倾斜事件类型
        viewer.scene.screenSpaceCameraController.tiltEventTypes = [
          Cesium.CameraEventType.MIDDLE_DRAG,
          Cesium.CameraEventType.PINCH,
          Cesium.CameraEventType.RIGHT_DRAG
        ];

        // 处理鼠标按下事件
        function handleMouseAction(movement) {
          // 移除鼠标移动事件监听器
          screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
          // 设置鼠标样式的位置
          mouseZoom.style.top = movement.position.y + "px";
          mouseZoom.style.left = movement.position.x + "px";
          // 设置鼠标样式的类名为可见状态
          mouseZoom.className = "cesium-mousezoom cesium-mousezoom-visible";
        }

        // 处理鼠标松开事件
        function handleMouseUp() {
          // 添加鼠标移动事件监听器
          screenSpaceEventHandler.setInputAction(function (movement) {
            mouseZoom.style.top = movement.endPosition.y + "px";
            mouseZoom.style.left = movement.endPosition.x + "px";
          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
          // 设置鼠标样式的类名为隐藏状态
          mouseZoom.className = "cesium-mousezoom";
        }

        // 添加鼠标按下事件监听器
        // screenSpaceEventHandler.setInputAction(handleMouseAction, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        screenSpaceEventHandler.setInputAction(handleMouseAction, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
        screenSpaceEventHandler.setInputAction(handleMouseAction, Cesium.ScreenSpaceEventType.MIDDLE_DOWN);

        // 添加鼠标松开事件监听器
        // screenSpaceEventHandler.setInputAction(handleMouseUp, Cesium.ScreenSpaceEventType.LEFT_UP);
        screenSpaceEventHandler.setInputAction(handleMouseUp, Cesium.ScreenSpaceEventType.RIGHT_UP);
        screenSpaceEventHandler.setInputAction(handleMouseUp, Cesium.ScreenSpaceEventType.MIDDLE_UP);

        // 滚轮滚动事件
        let wheelAction = null;
        screenSpaceEventHandler.setInputAction(function (event) {
          if (!wheelAction) {
            wheelAction = screenSpaceEventHandler.setInputAction(handleMouseUp, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
          }
          // 设置鼠标样式的类名为可见状态
          mouseZoom.className = "cesium-mousezoom cesium-mousezoom-visible";
          // 200毫秒后将鼠标样式的类名设置为隐藏状态
          setTimeout(function () {
            mouseZoom.className = "cesium-mousezoom";
          }, 200);
        }, Cesium.ScreenSpaceEventType.WHEEL);

        // 返回ScreenSpaceEventHandler对象
        return screenSpaceEventHandler;
      }

      /**
       * 限定相机进入地下
       *  @param {Cesium.Viewer} viewer - Cesium Viewer 对象
       */
      _applyTerrainAdjustment(viewer) {
        viewer.camera.changed.addEventListener(function () {
          if (viewer.camera._suspendTerrainAdjustment && viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
            viewer.camera._suspendTerrainAdjustment = false;
            viewer.camera._adjustHeightForTerrain();
          }
        });
      }
      /**
       * 设置Cesium Viewer的选项
       * @param {Cesium.Viewer} viewer - Cesium Viewer 对象
       * @param {Object} options - 可选选项配置对象
       * @param {boolean} [options.enableDepthTestAgainstTerrain=true] - 是否开启深度检测地形
       * @param {boolean} [options.enableHighDynamicRange=true] - 是否开启高动态范围 (HDR) 模式
       * @param {boolean} [options.enableLighting=true] - 是否开启光照效果
       * @param {boolean} [options.enablePixelatedRendering=true] - 是否开启像素渲染
       * @param {boolean} [options.enableFXAA=true] - 是否开启快速近似抗锯齿 (FXAA) 技术
       * @param {boolean} [options.enableFog=true] - 是否开启雾效果
       * @param {boolean} [options.enableGroundAtmosphere=true] - 是否显示大气层效果
       * @param {boolean} [options.enableDebugMode=false] - 是否开启调试模式
       */
      setupViewerOptions(viewer, options) {
        // 解析可选选项配置对象
        const {
          enableDepthTestAgainstTerrain = true,
          enableHighDynamicRange = true,
          enableLighting = true,
          enablePixelatedRendering = true,
          enableFXAA = true,
          enableFog = true,
          enableGroundAtmosphere = true,
          enableDebugMode = false
        } = options;

        // 配置深度检测地形
        viewer.scene.globe.depthTestAgainstTerrain = enableDepthTestAgainstTerrain;

        // 配置高动态范围 (HDR) 模式
        viewer.scene.highDynamicRange = enableHighDynamicRange;

        // 配置光照效果
        viewer.scene.globe.enableLighting = enableLighting;

        // 配置像素渲染
        if (enablePixelatedRendering && Cesium.FeatureDetection.supportsImageRenderingPixelated()) {
          viewer.resolutionScale = window.devicePixelRatio;
        }

        // 配置快速近似抗锯齿 (FXAA) 技术
        viewer.scene.fxaa = enableFXAA;
        viewer.scene.postProcessStages.fxaa.enabled = enableFXAA;

        // 配置像素渲染
        if (enablePixelatedRendering && viewer.cesiumWidget._supportsImageRenderingPixelated) {
          let vtxf_dpr = window.devicePixelRatio;
          while (vtxf_dpr >= 2.0) {
            vtxf_dpr /= 2.0;
          }
          viewer.resolutionScale = vtxf_dpr;
        }

        // 配置雾效果
        viewer.scene.fog.enabled = enableFog;

        // 配置大气层效果
        viewer.scene.globe.showGroundAtmosphere = enableGroundAtmosphere;

        // 配置调试模式
        if (enableDebugMode) {
          viewer.scene.debugShowFramesPerSecond = true;
        }

        // 移除默认的图像图层
        viewer.imageryLayers.removeAll();

        // 设置当前时间为当前日期的 JulianDate 表示
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date());
      }
    }
    const { viewer, setupViewerOptions }
      = new MyCesiumViewer(options);

    // wait for the viewer to be ready
    const viewerOptions = {
      enableDepthTestAgainstTerrain: true,
      enableHighDynamicRange: true,
      enableLighting: true,
      enablePixelatedRendering: true,
      enableFXAA: true,
      enableFog: true,
      enableGroundAtmosphere: true,
      enableDebugMode: false
    };
    setupViewerOptions(viewer, viewerOptions);

    //加载成功后回调函数
    if (options.success) {
      options.success(viewer);
    }

    return viewer;
  }

  /**
   * 加载影像底图
   */
  _loadingImageUnderlays(viewer, options = null) {

    var defaultOptions = {
      name: '影像底图',
      type: 'mapbox',
      layer: 'satellite',
      brightness: 0

    }
    options = options || defaultOptions;
    var imageryProvider = this._createImageryProvider(defaultOptions);
    var imageryOption = {
      show: true,
      alpha: this._opacity,
    };
    if (options.rectangle && options.rectangle.xmin && options.rectangle.xmax && options.rectangle.ymin && options.rectangle.ymax) {
      var xmin = options.rectangle.xmin;
      var xmax = options.rectangle.xmax;
      var ymin = options.rectangle.ymin;
      var ymax = options.rectangle.ymax;
      var rectangle = Cesium.Rectangle.fromDegrees(xmin, ymin, xmax, ymax);
      this.rectangle = rectangle;
      imageryOption.rectangle = rectangle;
    }
    if (options.brightness) imageryOption.brightness = options.brightness;
    if (options.minimumTerrainLevel) imageryOption.minimumTerrainLevel = options.minimumTerrainLevel;
    if (options.maximumTerrainLevel) imageryOption.maximumTerrainLevel = options.maximumTerrainLevel;
    var layer = new Cesium.ImageryLayer(imageryProvider, imageryOption);
    layer.config = options;

    viewer.imageryLayers.add(layer);
    return layer;
  }
  _createImageryProvider(config) {
    var options = {};
    for (var key in config) {
      var value = config[key];
      if (value == null) return;

      switch (key) {
        case "crs":
          if (value == "4326" || value.toUpperCase() == "EPSG4326") {
            options.tilingScheme = new Cesium.GeographicTilingScheme({
              numberOfLevelZeroTilesX: config.numberOfLevelZeroTilesX || 2,
              numberOfLevelZeroTilesY: config.numberOfLevelZeroTilesY || 1,
            });
          } else {
            options.tilingScheme = new Cesium.WebMercatorTilingScheme({
              numberOfLevelZeroTilesX: config.numberOfLevelZeroTilesX || 2,
              numberOfLevelZeroTilesY: config.numberOfLevelZeroTilesY || 1,
            });
          }
          break;
        case "rectangle":
          options.rectangle = Cesium.Rectangle.fromDegrees(value.xmin, value.ymin, value.xmax, value.ymax);
          break;
        default:
          options[key] = value;
          break;
      }
    }

    if (options.proxy) {
      options.url = new Cesium.Resource({
        url: options.url,
        proxy: options.proxy,
      });
    }
    var layer;
    switch (options.type) {
      case "image":
        layer = new Cesium.SingleTileImageryProvider(options);
        break;
      case "xyz":
      case "tile":
        options.customTags = {
          "z&1": function z1(imageryProvider, x, y, level) {
            return level + 1;
          },
        };
        layer = new Cesium.UrlTemplateImageryProvider(options);
        break;
      case "wms":
        layer = new Cesium.WebMapServiceImageryProvider(options);
        break;
      case "wmts":
        layer = new Cesium.WebMapTileServiceImageryProvider(options);
        break;
      case "arcgis":
      case "arcgis_tile":
      case "arcgis_dynamic":
        layer = new Cesium.ArcGisMapServerImageryProvider(options);
        break;
      case "arcgis_cache":
        if (!Cesium.UrlTemplateImageryProvider.padLeft0) {
          Cesium.UrlTemplateImageryProvider.padLeft0 = function (numStr, n) {
            numStr = String(numStr);
            var len = numStr.length;
            while (len < n) {
              numStr = "0" + numStr;
              len++;
            }
            return numStr;
          };
        }
        options.customTags = {
          //小写
          arc_x: function arc_x(imageryProvider, x, y, level) {
            return imageryProvider.padLeft0(x.toString(16), 8);
          },
          arc_y: function arc_y(imageryProvider, x, y, level) {
            return imageryProvider.padLeft0(y.toString(16), 8);
          },
          arc_z: function arc_z(imageryProvider, x, y, level) {
            return imageryProvider.padLeft0(level.toString(), 2);
          },
          //大写
          arc_X: function arc_X(imageryProvider, x, y, level) {
            return imageryProvider.padLeft0(x.toString(16), 8).toUpperCase();
          },
          arc_Y: function arc_Y(imageryProvider, x, y, level) {
            return imageryProvider.padLeft0(y.toString(16), 8).toUpperCase();
          },
          arc_Z: function arc_Z(imageryProvider, x, y, level) {
            return imageryProvider.padLeft0(level.toString(), 2).toUpperCase();
          },
        };
        layer = new Cesium.UrlTemplateImageryProvider(options);
        break;
      case "www_gaode":
        //高德
        var _url;
        switch (options.layer) {
          case "vec":
          default:
            //style=7是立体的，style=8是灰色平面的
            _url = "http://" + (options.bigfont ? "wprd" : "webrd") + "0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}";
            break;
          case "img_d":
            _url = "http://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}";
            break;
          case "img_z":
            _url = "http://webst0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8";
            break;
          case "time":
            var time = new Date().getTime();
            _url = "http://tm.amap.com/trafficengine/mapabc/traffictile?v=1.0&;t=1&x={x}&y={y}&z={z}&&t=" + time;
            break;
        }

        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: ["1", "2", "3", "4"],
          maximumLevel: 18,
        });
        break;
      case "www_google":
        //谷歌国内
        var _url;

        if (config.crs == "4326" || config.crs == "wgs84") {
          //wgs84   无偏移
          switch (options.layer) {
            default:
            case "img_d":
              _url = "http://www.google.cn/maps/vt?lyrs=s&x={x}&y={y}&z={z}";
              break;
          }
        } else {
          //有偏移
          switch (options.layer) {
            case "vec":
            default:
              _url = "http://mt{s}.google.cn/vt/lyrs=m@207000000&hl=zh-CN&gl=CN&src=app&x={x}&y={y}&z={z}&s=Galile";
              break;
            case "img_d":
              _url = "http://mt{s}.google.cn/vt/lyrs=s&hl=zh-CN&gl=CN&x={x}&y={y}&z={z}&s=Gali";
              break;
            case "img_z":
              _url = "http://mt{s}.google.cn/vt/imgtp=png32&lyrs=h@207000000&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}&s=Galil";
              break;
            case "ter":
              _url = "http://mt{s}.google.cn/vt/lyrs=t@131,r@227000000&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}&s=Galile";
              break;
          }
        }

        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: ["1", "2", "3"],
          maximumLevel: 20,
        });
        break;
      case "www_osm":
        //OSM开源地图
        var _url = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: "abc",
          maximumLevel: 18,
        });
        break;
      case "www_geoq":
        //智图开源地图
        var _url = "https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}";
        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: "abc",
          maximumLevel: 18,
        });
        break;
      case "thematic_geoq":
        //智图水系开源地图
        var _url = "http://thematic.geoq.cn/arcgis/rest/services/ThematicMaps/WorldHydroMap/MapServer/tile/{z}/{y}/{x}";
        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: "abc",
          maximumLevel: 18,
        });
      case "sl_geoq":
        //智图深蓝开源地图
        var _url = "https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}";
        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: "abc",
          maximumLevel: 18,
        });
        break;
      case "local":
        //本地
        var _url = options.url + "/{z}/{y}/{x}.png";
        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: "abc",
          maximumLevel: 18,
        });
        break;
      case "tdt":
        //天地图
        var _url;
        // 添加mapbox自定义地图实例 mapbox://styles/1365508153/ckmy004lc1bsj17n94k80cfik
        switch (options.layer) {
          case "satellite":
            break;
          case "navigation":
            _url = "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
            break;
          case "blue":
            // _url = "http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer?tk=d97070ed5b0f397ed2dd8317bcbb486d";
            _url = "http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
            break;
          case "terrain":
            break;
        }

        layer = new Cesium.UrlTemplateImageryProvider({
          url: _url,
          subdomains: "abc",
          maximumLevel: 18,
        });
        break;
      case "mapbox":
        //mapboxgl的底图
        var style;
        // 添加mapbox自定义地图实例 mapbox://styles/1365508153/ckmy004lc1bsj17n94k80cfik
        var config = {
          url: "https://api.mapbox.com/styles/v1",
          username: "1365508153",
          styleId: style,
          accessToken: "pk.eyJ1IjoiMTM2NTUwODE1MyIsImEiOiJja214ejg5ZWMwZGhqMnJxa3F3MjVuaTJqIn0.ERt-vJ_qoD10EP5CvwsEzQ",
          scaleFactor: true,
        };
        switch (options.layer) {
          case "satellite":
            style = "ckmy0yizu18bx17pdcfh81ikn";
            break;
          case "navigation":
            style = "ckmy0li0j1cd717la2xd0mamg";
            break;
          case "blue":
            style = "ckmy004lc1bsj17n94k80cfik";
            break;
          case "terrain":
            style = "ckn9dnm5b2m9a17o0nijfqbl3";
          default:
            config.styleId = options.layer;
            config.accessToken = options.accessToken;
            config.username = options.username;
            break;
        }
        config.styleId = style;
        var layer = new Cesium.MapboxStyleImageryProvider(config);
        break;
    }
    layer.config = options;
    layer.brightness = options.brightness;
    return layer;
  }

  /**
   * 设置当前相机视角
   * @param {Cesium.Viewer} viewer - Cesium Viewer 对象
   * @param {Object} mapPosition - 包含地图位置信息的对象
   */
  setCameraView(viewer, mapPosition) {
    const duration = mapPosition.duration || 0;

    if (viewer.clock.multiplier !== 1 && !mapPosition.force) return;

    try {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(mapPosition.x, mapPosition.y, mapPosition.z),
        orientation: {
          heading: mapPosition.h ?? 0,
          pitch: mapPosition.p ?? 0,
          roll: mapPosition.r ?? 0,
        },
        duration,
      });
    } catch (error) {
      console.error({ e: error, message: "定位异常" });
    }
  }

  /**
  * 获取当前相机视角
  * @param {Cesium.Viewer} viewer - Cesium Viewer 对象
  * @returns {Object} 返回包含相机视角信息的对象
  */
  getCameraView(viewer) {
    const camera = viewer.camera;

    const formatNum = (num, digits) => Number(num.toFixed(digits || 0));

    const position = camera.positionCartographic;
    return {
      y: formatNum(Cesium.Math.toDegrees(position.latitude), 6),
      x: formatNum(Cesium.Math.toDegrees(position.longitude), 6),
      z: formatNum(position.height, 2),
      h: formatNum(camera.heading, 2),
      p: formatNum(camera.pitch, 2),
      r: formatNum(camera.roll, 2)
    };
  }
  /**
   * 开启球体样式增强
   * @param {*} viewer 
   */
  _enableSphereStyleEnhancements(viewer) {
    viewer.scene.highDynamicRange = true;
    viewer.scene.globe.baseColor = new Cesium.Color.fromCssColorString("#171744");
    viewer.scene.moon.show = false;
    viewer.scene.skyBox.show = false;
    viewer.scene.backgroundColor = new Cesium.Color.fromCssColorString("#171744");
  }

}