/* eslint-disable no-underscore-dangle */
import {
  Rectangle,
  TilingScheme,
  TileDiscardPolicy,
  Credit,
  Proxy,
  Event,
  Resource,
  ImageryTypes,
  CompressedTextureBuffer,
  ImageryProvider,
  ImageryLayerFeatureInfo,
  WebMercatorTilingScheme,
  GeographicTilingScheme,
  SingleTileImageryProvider,
  UrlTemplateImageryProvider,
  WebMapServiceImageryProvider,
  WebMapTileServiceImageryProvider,
  ArcGisMapServerImageryProvider,
  MapboxStyleImageryProvider,
} from 'cesium';

type URL = `${`http${'s' | ''}://` | ''}${string}/{z}/{x}/{y}${string}`;

export type ImageryProviderOption = {
  url: URL;
  name: string;
  crs?: string;
  type?: number;

  numberOfLevelZeroTilesX?: number;
  numberOfLevelZeroTilesY?: number;
};
const CESIUM_CANVAS_SIZE = 256;
export class ImageryProviderFactory implements ImageryProvider {
  private provider:
    | SingleTileImageryProvider
    | UrlTemplateImageryProvider
    | WebMapServiceImageryProvider
    | WebMapTileServiceImageryProvider
    | ArcGisMapServerImageryProvider
    | MapboxStyleImageryProvider;

  private _crs?: string;

  private _type?: number;

  private _numberOfLevelZeroTilesX?: number;

  private _numberOfLevelZeroTilesY?: number;

  constructor(options?: ImageryProviderOption) {
    this._url = options.url;
    this._crs = options.crs;
    this._type = options.type;
    this._numberOfLevelZeroTilesX = options.numberOfLevelZeroTilesX;
    this._numberOfLevelZeroTilesY = options.numberOfLevelZeroTilesY;

    if (this._crs) this._tilingScheme = this.createTilingScheme();
    else this._tilingScheme = new WebMercatorTilingScheme();

    this._customTags = this.createArcGisCacheImageryCustomTags();

    // Maybe these pixels are same with Cesium's tile size.
    this._tileWidth = CESIUM_CANVAS_SIZE;
    this._tileHeight = CESIUM_CANVAS_SIZE;
    this._rectangle = this._tilingScheme.rectangle;
  }

  /**
   * 允许在URL模板中替换自定义关键词，对象必须是字符串键和函数值的组合
   */
  private readonly _customTags?: any;

  /**
   * 影像地址
   */
  private readonly _url: string | Resource;

  /**
   * 影像的矩形范围（弧度）
   */
  private readonly _rectangle: Rectangle;

  /**
   * 每个瓦片的宽度（像素）
   */
  private readonly _tileWidth: number;

  /**
   * 每个瓦片的高度（像素）
   */
  private readonly _tileHeight: number;

  /**
   * 可请求的最大细节级别
   */
  private readonly _maximumLevel?: number;

  /**
   * 可请求的最小细节级别
   */
  private readonly _minimumLevel: number;

  /**
   * 提供者使用的切片方案
   */
  private readonly _tilingScheme: TilingScheme;

  /**
   * 瓦片丢弃策略
   */
  private readonly _tileDiscardPolicy: TileDiscardPolicy;

  /**
   * 发生异步错误时触发的事件
   */
  private readonly _errorEvent: Event;

  /**
   * 活跃时显示的信用信息
   */
  private readonly _credit: Credit;

  /**
   * 提供者使用的代理
   */
  private readonly _proxy: Proxy;

  /**
   * 图像是否包含 alpha 通道
   */
  private readonly _hasAlphaChannel: boolean;

  /**
   * 影像地址
   */
  get url() {
    return this._url;
  }

  /**
   * 获取影像的矩形范围（弧度）
   */
  get rectangle(): Rectangle {
    return this._rectangle;
  }

  /**
   * 获取每个瓦片的宽度（像素）
   */
  get tileWidth(): number {
    return this._tileWidth;
  }

  /**
   * 获取每个瓦片的高度（像素）
   */
  get tileHeight(): number {
    return this._tileHeight;
  }

  /**
   * 获取可请求的最大细节级别
   */
  get maximumLevel(): number | undefined {
    return this._maximumLevel;
  }

  /**
   * 获取可请求的最小细节级别
   */
  get minimumLevel(): number {
    return this._minimumLevel;
  }

  /**
   * 获取提供者使用的切片方案
   */
  get tilingScheme(): TilingScheme {
    return this._tilingScheme;
  }

  /**
   * 获取瓦片丢弃策略
   */
  get tileDiscardPolicy(): TileDiscardPolicy {
    return this._tileDiscardPolicy;
  }

  /**
   * 获取发生异步错误时触发的事件
   */
  get errorEvent(): Event {
    return this._errorEvent;
  }

  /**
   * 获取活跃时显示的信用信息
   */
  get credit(): Credit {
    return this._credit;
  }

  /**
   * 获取提供者使用的代理
   */
  get proxy(): Proxy {
    return this._proxy;
  }

  /**
   * 获取图像是否包含 alpha 通道
   */
  get hasAlphaChannel(): boolean {
    return this._hasAlphaChannel;
  }

  /**
   * 允许替换URL模板中的自定义关键字。对象必须将字符串作为键，将函数作为值。
   */
  get customTags(): any {
    return this._customTags;
  }

  /**
   * 获取瓦片的信用信息
   * @param x - 瓦片 X 坐标
   * @param y - 瓦片 Y 坐标
   * @param level - 瓦片级别
   * @returns 瓦片显示的信用信息
   */
  getTileCredits(x: number, y: number, level: number): Credit[] {
    // 实现方法
    return this.provider.getTileCredits(x, y, level);
  }

  /**
   * 请求瓦片图像
   * @param x - 瓦片 X 坐标
   * @param y - 瓦片 Y 坐标
   * @param level - 瓦片级别
   * @param [request] - 请求对象
   * @returns 图像的 Promise 或未定义
   */
  requestImage(x: number, y: number, level: number): Promise<ImageryTypes> | undefined {
    // 实现方法
    return this.provider.requestImage(x, y, level);
  }

  /**
   * 异步确定指定位置的特征
   * @param x - 瓦片 X 坐标
   * @param y - 瓦片 Y 坐标
   * @param level - 瓦片级别
   * @param longitude - 经度
   * @param latitude - 纬度
   * @returns 特征信息的 Promise 或未定义
   */
  pickFeatures(
    _x: number,
    _y: number,
    _level: number,
    _longitude: number,
    _latitude: number,
  ): Promise<ImageryLayerFeatureInfo[]> | undefined {
    // 实现方法
    return undefined;
  }

  /**
   * 从 URL 加载图像
   * @param imageryProvider - 影像提供者
   * @param url - 图像 URL
   * @returns 图像的 Promise 或未定义
   */
  static loadImage(
    _imageryProvider: ImageryProvider,
    _url: Resource | string,
  ): Promise<ImageryTypes | CompressedTextureBuffer> | undefined {
    // 实现方法
    return undefined;
  }

  private createTilingScheme(): TilingScheme {
    if (this._crs === '4326' || this._crs?.toUpperCase() === 'EPSG4326') {
      return new GeographicTilingScheme({
        numberOfLevelZeroTilesX: this._numberOfLevelZeroTilesX || 2,
        numberOfLevelZeroTilesY: this._numberOfLevelZeroTilesY || 1,
      });
    }
    return new WebMercatorTilingScheme({
      numberOfLevelZeroTilesX: this._numberOfLevelZeroTilesX || 2,
      numberOfLevelZeroTilesY: this._numberOfLevelZeroTilesY || 1,
    });
  }

  /**
   * 创建带代理的资源对象
   * @param options - 资源构造选项，包括URL和代理
   * @returns 创建的Resource对象
   */
  private createProxyResource() {}

  private createArcGisCacheImageryCustomTags(): {
    arc_x: (imageryProvider: ImageryProvider, x: number, _y: number, _level: number) => string;
    arc_y: (imageryProvider: ImageryProvider, _x: number, y: number, _level: number) => string;
    arc_z: (imageryProvider: ImageryProvider, _x: number, _y: number, level: number) => string;
    } {
    const padLeft = (numStr: string, n: number): string => {
      while (numStr.length < n) {
        numStr = `0${numStr}`;
      }
      return numStr;
    };
    return {
      arc_x: (imageryProvider: ImageryProvider, x: number, _y: number, _level: number) => padLeft(x.toString(16), 8),
      arc_y: (imageryProvider: ImageryProvider, _x: number, y: number, _level: number) => padLeft(y.toString(16), 8),
      arc_z: (imageryProvider: ImageryProvider, _x: number, _y: number, level: number) => padLeft(level.toString(), 2),
    };
  }
}
export default ImageryProviderFactory;
