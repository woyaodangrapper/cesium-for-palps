export interface ViewerOptions {
  enableDebugMode?: boolean; // 启用调试模式
  geocoder?: boolean; // 地理编码器
  homeButton?: boolean; // 主页按钮
  sceneModePicker?: boolean; // 场景模式选择器
  baseLayerPicker?: boolean; // 底图层选择器
  navigationHelpButton?: boolean; // 导航帮助按钮
  animation?: boolean; // 动画控制器
  timeline?: boolean; // 时间线
  fullscreenButton?: boolean; // 全屏按钮
  vrButton?: boolean; // VR按钮
  infoBox?: boolean; // 信息框
  selectionIndicator?: boolean; // 选择指示器
  shadows?: boolean; // 阴影
  shouldAnimate?: boolean; // 是否应该执行动画
  webGlContextAttributes?: boolean; // WebGL上下文选项，影响色彩感知
  msaaSamples?: number; // 多重采样抗锯齿（MSAA）的采样数
  id?: HTMLElement | string; // 容器元素，可以是DOM元素或元素ID
}

export interface MapOptions {
  mapId?: HTMLElement | string;
  noBasemap?: boolean;
  noTerrain?: boolean;
}

export interface SetupOptions {
  /**
   * 是否开启深度检测地形。
   * @default true
   */
  enableDepthTestAgainstTerrain?: boolean;

  /**
   * 是否开启高动态范围 (HDR) 模式。
   * @default true
   */
  enableHighDynamicRange?: boolean;

  /**
   * 是否开启光照效果。
   * @default true
   */
  enableLighting?: boolean;

  /**
   * 是否开启像素渲染（如果设备支持）。
   * @default true
   */
  enablePixelatedRendering?: boolean;

  /**
   * 是否开启快速近似抗锯齿 (FXAA) 技术。
   * @default true
   */
  enableFXAA?: boolean;

  /**
   * 是否开启雾效果。
   * @default true
   */
  enableFog?: boolean;

  /**
   * 是否显示大气层效果。
   * @default true
   */
  enableGroundAtmosphere?: boolean;

  /**
   * 是否开启调试模式。
   * @default false
   */
  enableDebugMode?: boolean;
}

/**
 * WebGL 上下文选项配置接口
 */
export interface WebGLContextOptions {
  /**
   * 是否启用透明度。可能会增加绘图操作的计算成本和内存消耗。
   * @default true
   */
  alpha?: boolean;

  /**
   * 是否启用深度缓冲。可能会增加渲染复杂度，并增加 GPU 内存消耗。
   * @default true
   */
  depth?: boolean;

  /**
   * 是否启用模板缓冲。可能会增加渲染复杂度，并增加 GPU 内存消耗。
   * @default true
   */
  stencil?: boolean;

  /**
   * 是否启用抗锯齿。可能会增加渲染操作的计算成本。
   * @default true
   */
  antialias?: boolean;

  /**
   * 是否启用预乘透明度。可能会增加绘图操作的计算成本。
   * @default true
   */
  premultipliedAlpha?: boolean;

  /**
   * 是否保留绘图缓冲区。可能会增加内存消耗，特别是对于大型或复杂的场景。
   * @default true
   */
  preserveDrawingBuffer?: boolean;

  /**
   * 如果性能差会失败。这可能会导致一些 WebGL 功能被禁用，以提高性能。
   * @default true
   */
  failIfMajorPerformanceCaveat?: boolean;
}
