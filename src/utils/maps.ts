import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import '@/components/mapIndicatorComponent';
import '@/style/maps.scss';
import '@/style/zoom.scss';

import type {
  ViewerOptions, MapOptions, SetupOptions, WebGLContextOptions,
} from '@/api/model/mapModel';

/**
 * 初始化基础类
 */
export class Map3D {
  public viewer: Cesium.Viewer;

  public container: string | HTMLElement;

  // 使用静态方法创建和初始化 Map3D 实例
  public static async create(options: MapOptions = {}): Promise<Map3D> {
    // 创建 Map3D 实例
    return new Promise<Map3D>((resolve, reject) => {
      try {
        const instance = new Map3D(options);
        resolve(instance);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 构造函数私有化，只能通过静态方法创建实例
  private constructor(options: MapOptions) {
    const { mapId = 'mapBox' } = options;
    this.container = mapId;
    this.create3D({
      id: mapId,
    });
  }

  /**
   *  获取viewer
   */
  get Viewer() {
    return this.viewer;
  }

  /**
   *  容器元素
   */
  get Container() {
    if (typeof this.container === 'string') {
      return document.getElementById(this.container);
    }
    return this.container;
  }

  private create3D(options: ViewerOptions = {}) {
    // eslint-disable-next-line max-len
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNGZiOTc1NS0zZmZlLTQ4MzUtODFlMS00ZDI2NWE5YTFkZjIiLCJpZCI6MTgwMDUsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NzMxMTcwODd9.WPytI-wsAoBmC7NLmz01l0GcYoh3bvTES7z1yZQgGMM';
    const {
      enableDebugMode = true,
      geocoder = false, // 地理编码器
      homeButton = false, // 主页按钮
      sceneModePicker = false, // 场景模式选择器
      baseLayerPicker = false, // 底图层选择器
      navigationHelpButton = false, // 导航帮助按钮
      animation = false, // 动画控制器
      timeline = false, // 动画控制器
      fullscreenButton = false, // 全屏按钮
      vrButton = false, // VR按钮
      infoBox = false, // 信息框
      selectionIndicator = false, // 选择指示器
      shadows = false, // 阴影
      shouldAnimate = true, // 是否应该执行动画
      webGlContextAttributes = true, // WebGL上下文选项 如果需要色彩感知如截图等需要开启此选项(会带来性能损耗)
      msaaSamples = 1,
      id = 'cesiumContainer',
    } = options;
    // WebGL上下文选项
    let webGlContextOptions: WebGLContextOptions;
    if (webGlContextAttributes) {
      webGlContextOptions = {
        alpha: true, // 启用透明度。可能会增加绘图操作的计算成本和内存消耗。
        depth: true, // 启用深度缓冲。可能会增加渲染复杂度，并增加GPU内存消耗。
        stencil: true, // 启用模板缓冲。可能会增加渲染复杂度，并增加GPU内存消耗。
        antialias: true, // 启用抗锯齿。可能会增加渲染操作的计算成本。
        premultipliedAlpha: true, // 预乘透明度。可能会增加绘图操作的计算成本。
        preserveDrawingBuffer: true, // 保留绘图缓冲区。可能会增加内存消耗，特别是对于大型或复杂的场景。
        failIfMajorPerformanceCaveat: true, // 如果性能差，会失败。这可能会导致一些WebGL功能被禁用，以提高性能。
      };
    }
    if (enableDebugMode) {
      // 创建参数对象数组
      const settings = [
        { 参数: 'MSAA多采样抗锯齿', 设置值: msaaSamples },
        { 参数: '启用透明度', 设置值: webGlContextOptions.alpha },
        { 参数: '启用深度缓冲', 设置值: webGlContextOptions.depth },
        { 参数: '启用模板缓冲', 设置值: webGlContextOptions.stencil },
        { 参数: '启用抗锯齿', 设置值: webGlContextOptions.antialias },
        { 参数: '预乘透明度', 设置值: webGlContextOptions.premultipliedAlpha },
        { 参数: '保留绘图缓冲区', 设置值: webGlContextOptions.preserveDrawingBuffer },
        { 参数: '如果性能差，会失败', 设置值: webGlContextOptions.failIfMajorPerformanceCaveat },
      ];

      // 输出表格到控制台
      console.table(settings);
    }

    this.viewer = new Cesium.Viewer(id, {
      ...{
        geocoder, // 地理编码器
        homeButton, // 主页按钮
        sceneModePicker, // 场景模式选择器
        baseLayerPicker, // 底图层选择器
        navigationHelpButton, // 导航帮助按钮
        animation, // 动画控制器
        timeline, // 时间线
        fullscreenButton, // 全屏按钮
        vrButton, // VR按钮
        infoBox, // 信息框
        selectionIndicator, // 选择指示器
        shadows, // 阴影
        shouldAnimate, // 是否应该执行动画
        webGlContextAttributes, // WebGL上下文选项 如果需要色彩感知如截图等需要开启此选项(会带来性能损耗)
        msaaSamples,
      },
      contextOptions: {
        requestWebgl1: false,
        allowTextureFilterAnisotropic: false,
        webgl: webGlContextOptions,
      },
    });

    this.setupViewerOptions();
    this.hideCesiumElement();
    this.setMouseStyle();
    this.enableSphereStyleEnhancements();
  }

  /**
   * 隐藏不需要的官方控件
   */
  private hideCesiumElement() {
    [
      'cesium-viewer-toolbar',
      'cesium-viewer-animationContainer',
      'cesium-viewer-fullscreenContainer',
      'cesium-viewer-timelineContainer',
      'cesium-viewer-bottom',
    ].forEach((toolName) => {
      const element = document.querySelector(`.${toolName}`) as HTMLElement;
      if (element instanceof HTMLElement) {
        element.style.display = 'none';
      }
    });
  }

  /**
   * 设置鼠标样式
   * @param {Cesium.Viewer} viewer - Cesium Viewer 对象
   * @returns {Cesium.ScreenSpaceEventHandler} - 创建并返回一个ScreenSpaceEventHandler对象
   */
  private setMouseStyle(viewer: Cesium.Viewer = this.viewer) {
    // 创建鼠标样式的DOM元素
    const mouseZoom = document.createElement('div');
    const zoomImg = document.createElement('div');

    // 添加类名
    mouseZoom.classList.add('cesium-mousezoom');
    zoomImg.classList.add('zoomimg');

    // 将zoomImg添加到mouseZoom中
    mouseZoom.appendChild(zoomImg);
    // 将mouseZoom添加到指定的容器中
    this.Container.appendChild(mouseZoom);

    // 创建ScreenSpaceEventHandler对象
    const screenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // 配置缩放事件类型
    viewer.scene.screenSpaceCameraController.zoomEventTypes = [
      Cesium.CameraEventType.WHEEL,
      Cesium.CameraEventType.PINCH,
    ];
    // 配置倾斜事件类型
    viewer.scene.screenSpaceCameraController.tiltEventTypes = [
      Cesium.CameraEventType.MIDDLE_DRAG,
      Cesium.CameraEventType.PINCH,
      Cesium.CameraEventType.RIGHT_DRAG,
    ];

    // 处理鼠标按下事件
    function handleMouseAction(movement) {
      // 移除鼠标移动事件监听器
      screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      // 设置鼠标样式的位置
      mouseZoom.style.top = `${movement.position.y}px`;
      mouseZoom.style.left = `${movement.position.x}px`;
      // 设置鼠标样式的类名为可见状态
      mouseZoom.className = 'cesium-mousezoom cesium-mousezoom-visible';
    }

    // 处理鼠标松开事件
    function handleMouseUp() {
      // 添加鼠标移动事件监听器
      screenSpaceEventHandler.setInputAction((movement) => {
        mouseZoom.style.top = `${movement.endPosition.y}px`;
        mouseZoom.style.left = `${movement.endPosition.x}px`;
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      // 设置鼠标样式的类名为隐藏状态
      mouseZoom.className = 'cesium-mousezoom';
    }

    // 添加鼠标按下事件监听器
    screenSpaceEventHandler.setInputAction(handleMouseAction, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
    screenSpaceEventHandler.setInputAction(handleMouseAction, Cesium.ScreenSpaceEventType.MIDDLE_DOWN);

    // 添加鼠标松开事件监听器
    // screenSpaceEventHandler.setInputAction(handleMouseUp, Cesium.ScreenSpaceEventType.LEFT_UP);
    screenSpaceEventHandler.setInputAction(handleMouseUp, Cesium.ScreenSpaceEventType.RIGHT_UP);
    screenSpaceEventHandler.setInputAction(handleMouseUp, Cesium.ScreenSpaceEventType.MIDDLE_UP);

    // 滚轮滚动事件
    let wheelAction = null;
    screenSpaceEventHandler.setInputAction((_event: any) => {
      if (!wheelAction) {
        wheelAction = screenSpaceEventHandler.setInputAction(handleMouseUp, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      }
      // 设置鼠标样式的类名为可见状态
      mouseZoom.className = 'cesium-mousezoom cesium-mousezoom-visible';
      // 200毫秒后将鼠标样式的类名设置为隐藏状态
      setTimeout(() => {
        mouseZoom.className = 'cesium-mousezoom';
      }, 200);
    }, Cesium.ScreenSpaceEventType.WHEEL);

    // 返回ScreenSpaceEventHandler对象
    return screenSpaceEventHandler;
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
  private setupViewerOptions(viewer: Cesium.Viewer = this.viewer, options: SetupOptions = {}) {
    const {
      enableDepthTestAgainstTerrain = true,
      enableHighDynamicRange = true,
      enableLighting = true,
      enablePixelatedRendering = true,
      enableFXAA = true,
      enableFog = true,
      enableGroundAtmosphere = true,
      enableDebugMode = false,
    } = options;

    const { scene } = viewer;
    const { globe } = scene;

    // 配置场景选项
    globe.depthTestAgainstTerrain = enableDepthTestAgainstTerrain;
    scene.highDynamicRange = enableHighDynamicRange;
    globe.enableLighting = enableLighting;
    scene.postProcessStages.fxaa.enabled = enableFXAA;
    scene.fog.enabled = enableFog;
    globe.showGroundAtmosphere = enableGroundAtmosphere;

    // 像素渲染配置
    if (enablePixelatedRendering) {
      let resolutionScale = window.devicePixelRatio;
      while (resolutionScale >= 2.0) {
        resolutionScale /= 2.0;
      }
      viewer.resolutionScale = resolutionScale;
    }

    // 调试模式配置
    if (enableDebugMode) {
      scene.debugShowFramesPerSecond = true;

      console.table([
        { 参数: 'FXAA抗锯齿', 设置值: enableFXAA },
        { 参数: '大气', 设置值: enableGroundAtmosphere },
        { 参数: '雾', 设置值: enableFog },
        { 参数: '像素渲染', 设置值: enablePixelatedRendering },
        { 参数: 'HDR', 设置值: enableHighDynamicRange },
        { 参数: '深度检测', 设置值: enableDepthTestAgainstTerrain },
      ]);
    }

    // 移除默认图像图层并设置当前时间
    viewer.imageryLayers.removeAll();
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date());
  }

  /**
   * 开启球体样式增强
   * @param {*} viewer
   */
  private enableSphereStyleEnhancements(viewer: Cesium.Viewer = this.viewer) {
    viewer.scene.highDynamicRange = true;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#171744');
    viewer.scene.moon.show = false;
    // viewer.scene.skyBox.show = false;
    // viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#171744');
  }
}
