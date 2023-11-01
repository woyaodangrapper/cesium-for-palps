var defaultOptions = {
  mapId: 'mapBox',
  toInitialPosition: true,
  noBasemap: true,
  noTerrain: true,
  cameraPosition: {
    y: 30.275377,
    x: 120.111744,
    z: 325.1,
    h: 3.17,
    p: -1.5012066139,
    r: 0,
  },
};
var that;
var gisData;

/**
 * 初始化基础类
 */
class mapMain {
  //========== 构造方法 ==========
  constructor(options) {
    if (!this._webglReport()) throw new Error('浏览器不支持WebGL，需更换浏览器');
    if (!options) options = defaultOptions;
    that = this;
    this.mapId = options.mapId || defaultOptions.mapId;
    this.cameraPosition = options.cameraPosition || defaultOptions.cameraPosition;
    this.toInitialPosition =
      options.toInitialPosition != null ? options.toInitialPosition : defaultOptions.toInitialPosition;
    this.noTerrain = options.noTerrain != null ? options.noTerrain : defaultOptions.noTerrain;
    this.noBasemap = options.noBasemap != null ? options.noBasemap : defaultOptions.noBasemap;
    if (!this.cameraPosition || !this.cameraPosition) {
      console.log('初始化失败：请确认相机位置与视点位置正确！');
      return;
    }
    //传入了DOM
    if (!options.dom) this._createMapEle();

    this._create3DLibrary();
    return new Promise((resolve, reject) => {
      try {
        window.onload = async () => {
          let viewer = (that._viewer = await this._createMap());
          if (!this.noTerrain) that._terrainProvider(viewer);
          that._locationTimeNoon(viewer);
          if (!this.noBasemap) that._loadingImageUnderlays(viewer);
          that._enableSphereStyleEnhancements(viewer);
          if (this.toInitialPosition) that._flyToDefaultPosition(viewer, that.cameraPosition);
          that._mousePositionBox(viewer, that.mapId);
          resolve(viewer);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  //========== 对外属性 ==========
  /**
   *  获取viewer
   */
  get viewer() {
    return this._viewer;
  }

  //创建Map元素
  _createMapEle() {
    //创建可视域video DOM  元素
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
  _create3DLibrary() {}
  /**
   * 创建地图
   */
  _createMap() {
    let that = this;
    return new Promise((resolve, reject) => {
      that._create3D(
        {
          id: this.mapId,
          showGroundAtmosphere: true,
          success: function (_viewer) {
            _viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
              Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
            );
            resolve(_viewer);
          },
        },
        Cesium,
      );
    });
  }
  _create3D(options, Cesium) {
    Cesium.Ion.defaultAccessToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNGZiOTc1NS0zZmZlLTQ4MzUtODFlMS00ZDI2NWE5YTFkZjIiLCJpZCI6MTgwMDUsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NzMxMTcwODd9.WPytI-wsAoBmC7NLmz01l0GcYoh3bvTES7z1yZQgGMM';

    //初始化部分参数 如果没有就默认设为false;
    var args = [
      'geocoder',
      'homeButton',
      'sceneModePicker',
      'baseLayerPicker',
      'navigationHelpButton',
      'animation',
      'timeLine',
      'fullscreenButton',
      'vrButton',
      'infoBox',
      'selectionIndicator',
      'shadows',
    ];
    for (var i = 0; i < args.length; i++) {
      if (!options[args[i]]) {
        options[args[i]] = false;
      }
    }
    options['shouldAnimate'] = true; //飞行漫游启动 viewer动画效果
    var container = options['id'];
    //创建viewer
    var viewer = new Cesium.Viewer(container, options);
    /**对Cesium的改造 *******************************************************************/
    //隐藏Cesium原有的一些控件，默认只剩一个球
    this._hideCesiumElement();

    //设置鼠标的样式，在使用滚轮及右键对地球缩放或旋转时在鼠标位置添加一个图标
    this._setMouseStyle(viewer, container);

    //解决限定相机进入地下
    viewer.camera.changed.addEventListener(function () {
      if (viewer.camera._suspendTerrainAdjustment && viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
        viewer.camera._suspendTerrainAdjustment = false;
        viewer.camera._adjustHeightForTerrain();
      }
    });

    viewer.scene.globe.depthTestAgainstTerrain = true;
    //开启hdr
    viewer.scene.highDynamicRange = true;

    viewer.scene.globe.enableLighting = true;

    // 分辨率调整函数
    if (Cesium.FeatureDetection.supportsImageRenderingPixelated()) {
      //判断是否支持图像渲染像素化处理
      viewer.resolutionScale = window.devicePixelRatio;
    }
    //是否开启抗锯齿
    viewer.scene.fxaa = true;
    viewer.scene.postProcessStages.fxaa.enabled = true;
    var supportsImageRenderingPixelated = viewer.cesiumWidget._supportsImageRenderingPixelated;
    if (supportsImageRenderingPixelated) {
      var vtxf_dpr = window.devicePixelRatio;
      while (vtxf_dpr >= 2.0) {
        vtxf_dpr /= 2.0;
      }
      viewer.resolutionScale = vtxf_dpr;
    }

    viewer.scene.fog.enabled = true; //雾
    viewer.scene.globe.enableLighting = true; //照明

    //移除默认的bing影像图层
    viewer.imageryLayers.removeAll();
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date());

    //是否关闭大气效果
    if (options.showGroundAtmosphere && options.showGroundAtmosphere == true) {
      viewer.scene.globe.showGroundAtmosphere = true;
    } else {
      viewer.scene.globe.showGroundAtmosphere = false;
    }

    /************************Debug模式 */
    //debug模式，显示实时帧率
    if (options.debug) {
      viewer.scene.debugShowFramesPerSecond = true;
    }

    viewer.config = options;

    /************************回调函数 */
    //加载成功后回调函数
    if (options.success) {
      options.success(viewer);
    }

    return viewer;
  }
  _setMouseStyle(viewer, container) {
    //修改视图默认鼠标操作方式
    viewer.scene.screenSpaceCameraController.zoomEventTypes = [
      Cesium.CameraEventType.WHEEL,
      Cesium.CameraEventType.PINCH,
    ];
    viewer.scene.screenSpaceCameraController.tiltEventTypes = [
      Cesium.CameraEventType.MIDDLE_DRAG,
      Cesium.CameraEventType.PINCH,
      Cesium.CameraEventType.RIGHT_DRAG,
    ];
    // document.body.appendChild( renderer.domElement );

    let buff = document.createElement('div');
    let buff_1 = document.createElement('div');
    buff.setAttribute('class', 'cesium-mousezoom');
    buff_1.setAttribute('class', 'zoomimg');
    buff.appendChild(buff_1);
    document.getElementById(container).appendChild(buff);
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    function getMousezoomElement() {
      if (document.getElementsByClassName('cesium-mousezoom').length >= 1) {
        // HTMLElement Element
        let objs = document.getElementsByClassName('cesium-mousezoom');
        for (let index = 0; index < objs.length; index++) {
          let Element = objs[index];
          return Element;
        }
      }
      return undefined;
    }
    //按住鼠标右键
    handler.setInputAction(function (event) {
      handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      let element = getMousezoomElement();
      if (element) {
        element.style.top = event.position.y + 'px';
        element.style.left = event.position.x + 'px';
        element.className = 'cesium-mousezoom cesium-mousezoom-visible';
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
    //抬起鼠标右键
    handler.setInputAction(function (event) {
      let element = getMousezoomElement();
      handler.setInputAction(function (evnet) {
        if (element) {
          element.style.top = evnet.endPosition.y + 'px';
          element.style.left = evnet.endPosition.x + 'px';
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      element.className = 'cesium-mousezoom';
    }, Cesium.ScreenSpaceEventType.RIGHT_UP);

    //按住鼠标中键
    handler.setInputAction(function (event) {
      handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      let element = getMousezoomElement();
      if (element) {
        element.style.top = event.position.y + 'px';
        element.style.left = event.position.x + 'px';
        element.className = 'cesium-mousezoom cesium-mousezoom-visible';
      }
    }, Cesium.ScreenSpaceEventType.MIDDLE_DOWN);
    //抬起鼠标中键
    handler.setInputAction(function (event) {
      let element = getMousezoomElement();
      handler.setInputAction(function (evnet) {
        if (element) {
          element.style.top = evnet.endPosition.y + 'px';
          element.style.left = evnet.endPosition.x + 'px';
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      element.className = 'cesium-mousezoom';
    }, Cesium.ScreenSpaceEventType.MIDDLE_UP);

    //滚轮滚动
    handler.setInputAction(function (evnet) {
      let element = getMousezoomElement();
      handler.setInputAction(function (evnet) {
        if (element) {
          element.style.top = evnet.endPosition.y + 'px';
          element.style.left = evnet.endPosition.x + 'px';
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      element.className = 'cesium-mousezoom cesium-mousezoom-visible';
      setTimeout(function () {
        element.className = 'cesium-mousezoom';
      }, 200);
    }, Cesium.ScreenSpaceEventType.WHEEL);
  }
  _hideCesiumElement() {
    const array = [
      'cesium-viewer-toolbar',
      'cesium-viewer-animationContainer',
      'cesium-viewer-timelineContainer',
      'cesium-viewer-bottom',
    ];
    for (let index = 0; index < array.length; index++) {
      const element = array[index];
      if (document.getElementsByClassName(element).length >= 1) {
        // HTMLElement Element
        let objs = document.getElementsByClassName(element);
        for (let index = 0; index < objs.length; index++) {
          objs[index].style.visibility = 'hidden';
        }
      }
    }
  }
  /**
   * 加载杭州地形
   */
  _terrainProvider(viewer) {
    var provider = new Cesium.CesiumTerrainProvider({
      url: 'http://file.crcr.top/three-dimensional-model/杭州-地形切片/地形切片/',
      requestWaterMask: true, //开启法向量
      requestVertexNormals: true, //开启水面特效
    });
    viewer.terrainProvider = provider;
  }

  /**
   * 定位时戳到中午十二点
   * @param viewer
   */
  _locationTimeNoon(viewer) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 月份从0开始，所以需要加1
    const day = currentDate.getDate();

    const _time = `${year}-${month}-${day}T04:00:00.00Z`;
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(_time));
  }
  /**
   * 加载影像底图
   */
  _loadingImageUnderlays(viewer) {
    var defaultOptions = {
      name: '影像底图',
      type: 'mapbox',
      layer: 'satellite',
      brightness: 0,
    };

    var imageryProvider = this._createImageryProvider(defaultOptions);
    var imageryOption = {
      show: true,
      alpha: this._opacity,
    };
    if (
      options.rectangle &&
      options.rectangle.xmin &&
      options.rectangle.xmax &&
      options.rectangle.ymin &&
      options.rectangle.ymax
    ) {
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
        case 'crs':
          if (value == '4326' || value.toUpperCase() == 'EPSG4326') {
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
        case 'rectangle':
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
      case 'image':
        layer = new Cesium.SingleTileImageryProvider(options);
        break;
      case 'xyz':
      case 'tile':
        options.customTags = {
          'z&1': function z1(imageryProvider, x, y, level) {
            return level + 1;
          },
        };
        layer = new Cesium.UrlTemplateImageryProvider(options);
        break;
      case 'wms':
        layer = new Cesium.WebMapServiceImageryProvider(options);
        break;
      case 'wmts':
        layer = new Cesium.WebMapTileServiceImageryProvider(options);
        break;
      case 'arcgis':
      case 'arcgis_tile':
      case 'arcgis_dynamic':
        layer = new Cesium.ArcGisMapServerImageryProvider(options);
        break;
      case 'arcgis_cache':
        if (!Cesium.UrlTemplateImageryProvider.padLeft0) {
          Cesium.UrlTemplateImageryProvider.padLeft0 = function (numStr, n) {
            numStr = String(numStr);
            var len = numStr.length;
            while (len < n) {
              numStr = '0' + numStr;
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
      case 'www_gaode':
        //高德
        var _url;
        switch (options.layer) {
          case 'vec':
          default:
            //style=7是立体的，style=8是灰色平面的
            _url =
              'http://' +
              (options.bigfont ? 'wprd' : 'webrd') +
              '0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';
            break;
          case 'img_d':
            _url = 'http://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}';
            break;
          case 'img_z':
            _url = 'http://webst0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8';
            break;
          case 'time':
            var time = new Date().getTime();
            _url = 'http://tm.amap.com/trafficengine/mapabc/traffictile?v=1.0&;t=1&x={x}&y={y}&z={z}&&t=' + time;
            break;
        }

        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: ['1', '2', '3', '4'],
          maximumLevel: 18,
        });
        break;
      case 'www_google':
        //谷歌国内
        var _url;

        if (config.crs == '4326' || config.crs == 'wgs84') {
          //wgs84   无偏移
          switch (options.layer) {
            default:
            case 'img_d':
              _url = 'http://www.google.cn/maps/vt?lyrs=s&x={x}&y={y}&z={z}';
              break;
          }
        } else {
          //有偏移
          switch (options.layer) {
            case 'vec':
            default:
              _url = 'http://mt{s}.google.cn/vt/lyrs=m@207000000&hl=zh-CN&gl=CN&src=app&x={x}&y={y}&z={z}&s=Galile';
              break;
            case 'img_d':
              _url = 'http://mt{s}.google.cn/vt/lyrs=s&hl=zh-CN&gl=CN&x={x}&y={y}&z={z}&s=Gali';
              break;
            case 'img_z':
              _url = 'http://mt{s}.google.cn/vt/imgtp=png32&lyrs=h@207000000&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}&s=Galil';
              break;
            case 'ter':
              _url = 'http://mt{s}.google.cn/vt/lyrs=t@131,r@227000000&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}&s=Galile';
              break;
          }
        }

        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: ['1', '2', '3'],
          maximumLevel: 20,
        });
        break;
      case 'www_osm':
        //OSM开源地图
        var _url = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: 'abc',
          maximumLevel: 18,
        });
        break;
      case 'www_geoq':
        //智图开源地图
        var _url = 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}';
        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: 'abc',
          maximumLevel: 18,
        });
        break;
      case 'thematic_geoq':
        //智图水系开源地图
        var _url = 'http://thematic.geoq.cn/arcgis/rest/services/ThematicMaps/WorldHydroMap/MapServer/tile/{z}/{y}/{x}';
        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: 'abc',
          maximumLevel: 18,
        });
      case 'sl_geoq':
        //智图深蓝开源地图
        var _url = 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}';
        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: 'abc',
          maximumLevel: 18,
        });
        break;
      case 'local':
        //本地
        var _url = options.url + '/{z}/{y}/{x}.png';
        layer = new Cesium.UrlTemplateImageryProvider({
          url: options.proxy ? new Cesium.Resource({ url: _url, proxy: options.proxy }) : _url,
          subdomains: 'abc',
          maximumLevel: 18,
        });
        break;
      case 'tdt':
        //天地图
        var _url;
        // 添加mapbox自定义地图实例 mapbox://styles/1365508153/ckmy004lc1bsj17n94k80cfik
        switch (options.layer) {
          case 'satellite':
            break;
          case 'navigation':
            _url = 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
            break;
          case 'blue':
            // _url = "http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer?tk=d97070ed5b0f397ed2dd8317bcbb486d";
            _url =
              'http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
            break;
          case 'terrain':
            break;
        }

        layer = new Cesium.UrlTemplateImageryProvider({
          url: _url,
          subdomains: 'abc',
          maximumLevel: 18,
        });
        break;
      case 'mapbox':
        //mapboxgl的底图
        var style;
        // 添加mapbox自定义地图实例 mapbox://styles/1365508153/ckmy004lc1bsj17n94k80cfik
        var config = {
          url: 'https://api.mapbox.com/styles/v1',
          username: '1365508153',
          styleId: style,
          accessToken: 'pk.eyJ1IjoiMTM2NTUwODE1MyIsImEiOiJja214ejg5ZWMwZGhqMnJxa3F3MjVuaTJqIn0.ERt-vJ_qoD10EP5CvwsEzQ',
          scaleFactor: true,
        };
        switch (options.layer) {
          case 'satellite':
            style = 'ckmy0yizu18bx17pdcfh81ikn';
            break;
          case 'navigation':
            style = 'ckmy0li0j1cd717la2xd0mamg';
            break;
          case 'blue':
            style = 'ckmy004lc1bsj17n94k80cfik';
            break;
          case 'terrain':
            style = 'ckn9dnm5b2m9a17o0nijfqbl3';
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
  _template(_, data) {
    var camera = that.viewer.camera;
    var position = camera.positionCartographic;
    function formatNum(num, digits) {
      return Number(num.toFixed(digits || 0));
    }
    $('#terrain_height').html('高程:' + data.terrain_height + '米');
    $('#terrain_y').html('维:' + data.y + '');
    $('#terrain_x').html('经:' + data.x + '');
    $('#camera_height').html('相机:' + formatNum(position.height, 2) + '米');
    $('#degrees_').html('' + data.degrees_x + '"N ' + data.degrees_y + '"E');
  }
  _getCurrentMousePosition(viewer, position) {
    var scene = viewer.scene;
    var cartesian;
    //在模型上提取坐标
    var pickedObject = scene.pick(position);

    if (!pickedObject) {
      // 将屏幕坐标转换为地理坐标
      var pickRay = scene.camera.getPickRay(position);
      var worldPosition = scene.globe.pick(pickRay, scene);

      if (Cesium.defined(worldPosition)) {
        return worldPosition;
      }
    }
    if (scene.pickPositionSupported && Cesium.defined(pickedObject)) {
      //pickPositionSupported :判断是否支持深度拾取,不支持时无法进行鼠标交互绘制
      var cartesian = scene.pickPosition(position);
      if (Cesium.defined(cartesian)) {
        //不是entity时，支持3dtiles地下
        if (!Cesium.defined(pickedObject.id)) return cartesian;
      }
    }
    return cartesian;
  }
  _mouseHeight(viewer) {
    gisData = gisData || {};
    var canvas = viewer.scene.canvas;
    var handler = new Cesium.ScreenSpaceEventHandler(canvas);
    handler.setInputAction(function (movement) {
      var cartesian = that._getCurrentMousePosition(viewer, movement.position);
      if (cartesian) {
        var start = cartesian;
        var end = cartesian;
        // 插值
        var count = 1;
        var positions = [];
        for (var i = 0; i <= count; i++) {
          positions.push(Cesium.Cartesian3.lerp(start, end, i / count, new Cesium.Cartesian3()));
        }
        viewer.scene.clampToHeightMostDetailed(positions).then(function (clampedCartesians) {
          // 每个点的高度
          var height = [];
          for (var i = 0; i < count; ++i) {
            height.push(Cesium.Cartographic.fromCartesian(clampedCartesians[i]).height);
          }
          // console.log(height)
          gisData.terrain_height = height[0].toFixed(3);
          var format = `<div style="float: left;min-width: 0px;margin-left: 45px;margin-right: 0;"><span class="loader-x"> </span></div>
                    <span style="margin-left: 18px;text-align: right;width: 32px;" id="percentage-text" aria-labelledby="percentage-text-tooltip-text"> 100% </span>
                    <div  id="terrain_height">高程:{}米</div><div id="terrain_y">维:{}</div><div id="terrain_x">经:{}</div>`;
          format += ' <div id="camera_height">相机:{}米</div><div id="degrees_">{}"N {}"E</div>';
          that._template(format, gisData);
        });
      }
      // var e = event || win.event;
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }
  _getPercent(num, total) {
    /// <summary>
    /// 求百分比
    /// </summary>
    /// <param name="num">当前数</param>
    /// <param name="total">总数</param>
    num = parseFloat(num);
    total = parseFloat(total);
    if (isNaN(num) || isNaN(total)) {
      return '-';
    }
    return total <= 0 ? 0 : Math.round((num / total) * 10000) / 100.0;
  }
  //添加鼠标位置控件
  _mousePositionBox(viewer, containerid, crs) {
    this._mouseHeight(viewer);
    $('#' + containerid).prepend('<div id="MouseControl"  class="gis-bar" ></div>');
    $('#MouseControl').css({
      right: '0px',
      bottom: '0',
      background: '#ffffff00',
    });

    var format = `<div style="float: left;min-width: 0px;margin-left: 45px;margin-right: 0;"><span id="loader" style="top: 4px;" class="loader-x"> </span></div>
          <span style="margin-left: 20px;text-align: right;width: 32px;font-size: 13px;" id="percentage-text" aria-labelledby="percentage-text-tooltip-text"> 100% </span>
          <div  id="terrain_height">高程:{}米</div><div id="terrain_y">维:{}</div><div id="terrain_x">经:{}</div>`;
    format += ' <div id="camera_height">相机:{}米</div><div id="degrees_">{}"N {}"E</div>';
    $('#MouseControl').html(format);

    function setXYZ2Data(cartesian) {
      var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      gisData.z = cartographic.height.toFixed(1);
      var jd = Cesium.Math.toDegrees(cartographic.longitude);
      var wd = Cesium.Math.toDegrees(cartographic.latitude);
      //和地图一致的原坐标
      var fixedLen = 6;
      gisData.x = jd.toFixed(fixedLen);
      gisData.y = wd.toFixed(fixedLen);
    }
    gisData.terrain_height = '右键地图获取';
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(function () {
      var e = event || win.event;
      var ray = viewer.camera.getPickRay({ x: e.clientX, y: e.clientY });
      var cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      // var cartesian = VMSDS.positionHandler.getCurrentMousePosition(viewer.scene, {x: e.clientX, y: e.clientY});

      if (cartesian) {
        setXYZ2Data(cartesian);
        gisData.height = viewer.camera.positionCartographic.height.toFixed(1);
        gisData.heading = Cesium.Math.toDegrees(viewer.camera.heading).toFixed(0);
        gisData.pitch = Cesium.Math.toDegrees(viewer.camera.pitch).toFixed(0);

        gisData.degrees_y = that._toDegrees(gisData.y);
        gisData.degrees_x = that._toDegrees(gisData.x);
        that._template(format, gisData);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    //监控地图加载
    var helper = new Cesium.EventHelper();
    var count = 0;
    var Wrong_number = 0;
    helper.add(viewer.scene.globe.tileLoadProgressEvent, function (e) {
      $('#loader').removeClass('loader-x');
      $('#loader').addClass('loader-14');
      if (e > count) {
        count = e;
      }
      if (Wrong_number++ > 2) {
        Wrong_number = 0;
        $('#percentage-text').html(100 - that._getPercent(e, count).toFixed(0) + '%');
      }
      // console.log('每次加载地图服务矢量切片都会进入这个回调', e);

      if (e == 0) {
        $('#percentage-text').html(100 - that._getPercent(e, count).toFixed(0) + '%');
        count = 0;
        $('#loader').removeClass('loader-14');
        $('#loader').addClass('loader-x');
        // console.log("矢量切片加载完成时的回调");
      }
    });
  }

  //度转度°分′秒″
  _toDegrees(val) {
    if (typeof val == 'undefined' || val == '') {
      return '';
    }
    var i = val.indexOf('.');
    var strDu = i < 0 ? val : val.substring(0, i); //获取度
    var strFen = 0;
    var strMiao = 0;
    if (i > 0) {
      var strFen = '0' + val.substring(i);
      strFen = strFen * 60 + '';
      i = strFen.indexOf('.');
      if (i > 0) {
        strMiao = '0' + strFen.substring(i);
        strFen = strFen.substring(0, i); //获取分
        strMiao = strMiao * 60 + '';
        i = strMiao.indexOf('.');
        strMiao = strMiao.substring(0, i + 4); //取到小数点后面三位
        strMiao = parseFloat(strMiao).toFixed(2); //精确小数点后面两位
      }
    }
    return strDu + '°' + strFen + "'" + strMiao;
  }
  /**
   * 初始化交互
   */
  _flyToDefaultPosition(viewer, mapPosition) {
    this.setCameraView(viewer, mapPosition);
  }
  /**
   * 初始化交互
   */
  setCameraView(viewer, mapPosition) {
    var duration = mapPosition.duration == null ? 0 : mapPosition.duration;
    setTimeout(() => {
      try {
        if (viewer.clock.multiplier == 1 || mapPosition.force) {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(mapPosition.x, mapPosition.y, mapPosition.z), //经度、纬度、高度
            orientation: {
              heading: mapPosition.h ?? 0, //绕垂直于地心的轴旋转
              pitch: mapPosition.p ?? 0, //绕纬度线旋转
              roll: mapPosition.r ?? 0, //绕经度线旋转
            },
            duration: duration,
          });
        }
      } catch (error) {
        console.error({ e: error, message: '定位异常' });
      }
    }, 10);
  }
  //格式化数字 小数位数
  _formatNum(num, digits) {
    return Number(num.toFixed(digits || 0));
  }

  //获取当前相机视角
  getCameraView(viewer) {
    var camera = viewer.camera;
    var position = camera.positionCartographic;
    var cv = {};
    cv.y = that._formatNum(Cesium.Math.toDegrees(position.latitude), 6);
    cv.x = that._formatNum(Cesium.Math.toDegrees(position.longitude), 6);
    cv.z = that._formatNum(position.height, 2);
    cv.h = that._formatNum(camera.heading, 2);
    cv.p = that._formatNum(camera.pitch, 10);
    cv.r = that._formatNum(camera.roll, 2);
    return cv;
  }
  /**
   * 开启球体样式增强
   * @param {*} viewer
   */
  _enableSphereStyleEnhancements(viewer) {
    viewer.scene.highDynamicRange = true;
    viewer.scene.globe.baseColor = new Cesium.Color.fromCssColorString('#171744');
    viewer.scene.moon.show = false;
    viewer.scene.skyBox.show = false;
    viewer.scene.backgroundColor = new Cesium.Color.fromCssColorString('#171744');
  }

  /**
   * 检测浏览器webgl支持
   */
  _webglReport() {
    var exinfo = this._getExplorerInfo();
    if (exinfo.type == 'IE' && exinfo.version < 11) {
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
  }

  /**
   * 获取浏览器类型及版本
   */
  _getExplorerInfo() {
    var explorer = window.navigator.userAgent.toLowerCase();
    //ie
    if (explorer.indexOf('msie') >= 0) {
      var ver = Number(explorer.match(/msie ([\d]+)/)[1]);
      return { type: 'IE', version: ver };
    }
    //firefox
    else if (explorer.indexOf('firefox') >= 0) {
      var ver = Number(explorer.match(/firefox\/([\d]+)/)[1]);
      return { type: 'Firefox', version: ver };
    }
    //Chrome
    else if (explorer.indexOf('chrome') >= 0) {
      var ver = Number(explorer.match(/chrome\/([\d]+)/)[1]);
      return { type: 'Chrome', version: ver };
    }
    //Opera
    else if (explorer.indexOf('opera') >= 0) {
      var ver = Number(explorer.match(/opera.([\d]+)/)[1]);
      return { type: 'Opera', version: ver };
    }
    //Safari
    else if (explorer.indexOf('Safari') >= 0) {
      var ver = Number(explorer.match(/version\/([\d]+)/)[1]);
      return { type: 'Safari', version: ver };
    }
    return { type: explorer, version: -1 };
  }
}
