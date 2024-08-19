import * as Cesium from 'cesium';
import { onRefChange } from './middleware';

class MapIndicatorComponent extends HTMLElement {
  static get observedAttributes() {
    return ['camera-z', 'mouse-terrain-z', 'mouse-terrain-y', 'mouse-terrain-x', 'dms'];
  }

  private screenSpaceEventHandler: Cesium.ScreenSpaceEventHandler;

  private screenSpaceEventHelper: Cesium.EventHelper;

  private viewer: Cesium.Viewer;

  private observers: Function[] = [];

  private elements: {
    percentage: {
      loader: HTMLSpanElement;
      value: HTMLSpanElement;
    };
    cameraZ: HTMLDivElement;
    mouseTerrainZ: HTMLDivElement;
    mouseTerrainY: HTMLDivElement;
    mouseTerrainX: HTMLDivElement;
    DMS: HTMLDivElement;
  };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.setupObserver();
  }

  private createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      div {
        float: right;
        min-width: 80px;
        margin-right: 20px;
      }

      .percentage-text {
        margin-left: 8px;
        text-align: right;
        width: 32px;
        font-size: 13px;
      }

      .percentage-ontrol {
        float: left;
        display: flex;
        flex-direction: row;
        align-items: center;
      }

      .percentage-loader {
        display: flex;
        flex-direction: row;
        align-items: center;
        float: left;
        min-width: 0;
        margin-left: 45px;
        width: 16px;
        height: 14px;
        position: relative;
      }

      .percentage-loader::after,
      .percentage-loader::before {
        content: "";
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid #8ab4f8;
        position: absolute;
        left: 0;
      }

      .percentage-loader::after {
        animation-delay: 1s;
      }

      .percentage-loader-animation {
        float: left;
        min-width: 0;
        margin-left: 45px;
        width: 16px;
        height: 16px;
        position: relative;
      }

      .percentage-loader-animation::after,
      .percentage-loader-animation::before {
        content: "";
        opacity: 0;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid #fff;
        position: absolute;
        top: 0;
        left: 0;
        animation: scale-fade 2s linear infinite;
      }

      .percentage-loader-animation::after {
        animation-delay: 1s;
      }

      @keyframes scale-fade {
        0% {
          transform: scale(0);
          opacity: 1;
        }
        100% {
          transform: scale(1);
          opacity: 0;
        }
      }

      div:nth-child(n + 5) {
        opacity: 0.5;
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  private createElements() {
    // Create the percentage control
    const percentageControl = document.createElement('div');
    percentageControl.className = 'percentage-ontrol';

    const percentageLoader = document.createElement('span');
    percentageLoader.className = 'percentage-loader';

    const percentageText = document.createElement('span');
    percentageText.className = 'percentage-text';
    percentageText.textContent = '100%';

    percentageControl.appendChild(percentageLoader);
    percentageControl.appendChild(percentageText);

    // Create the other info divs
    const cameraZ = document.createElement('div');
    cameraZ.className = 'camera_z';
    cameraZ.textContent = '相机:5675459.33米';

    const mouseTerrainZ = document.createElement('div');
    mouseTerrainZ.className = 'mouse-terrain_z';
    mouseTerrainZ.textContent = '高程:0米';

    const mouseTerrainY = document.createElement('div');
    mouseTerrainY.className = 'mouse-terrain_y';
    mouseTerrainY.textContent = '纬:38.325962';

    const mouseTerrainX = document.createElement('div');
    mouseTerrainX.className = 'mouse-terrain_x';
    mouseTerrainX.textContent = '经:-39.650316';

    const DMS = document.createElement('div');
    DMS.className = 'dms';
    DMS.textContent = '-40°20\'58.86"N 38°19\'33.46"E';

    // Append all the elements to the main container
    this.shadowRoot.appendChild(percentageControl);
    this.shadowRoot.appendChild(cameraZ);
    this.shadowRoot.appendChild(mouseTerrainZ);
    this.shadowRoot.appendChild(mouseTerrainY);
    this.shadowRoot.appendChild(mouseTerrainX);
    this.shadowRoot.appendChild(DMS);

    this.elements = {
      percentage: {
        loader: percentageLoader,
        value: percentageText,
      },
      cameraZ,
      mouseTerrainZ,
      mouseTerrainY,
      mouseTerrainX,
      DMS,
    };
  }

  createNotifyProperty() {
    // 获取viewer对象
    const { viewer } = this;
    const { camera } = viewer;
    const { scene } = viewer;

    const {
      percentage, cameraZ, mouseTerrainZ, mouseTerrainY, mouseTerrainX, DMS,
    } = this.elements;
    // 监控地图坐标
    this.screenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    // 监控地图加载
    this.screenSpaceEventHelper = new Cesium.EventHelper();

    this.screenSpaceEventHandler.setInputAction((movement) => {
      const { x, y } = movement.endPosition ? movement.endPosition : movement.position;
      const ray = viewer.scene.camera.getPickRay(new Cesium.Cartesian2(x, y));
      const cartesian = viewer.scene.globe.pick(ray, scene);
      if (!cartesian) return;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const { longitude, latitude, height } = {
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        height: Number(cartographic.height.toFixed(1)),
      };
      mouseTerrainX.textContent = `经:${longitude.toFixed(6)}`;
      mouseTerrainY.textContent = `纬:${latitude.toFixed(6)}`;
      mouseTerrainZ.textContent = `高程:${height > 0 ? height : 0}米`;
      DMS.textContent = `${this.toDegrees(longitude.toFixed(6))}N ${this.toDegrees(latitude.toFixed(6))}E`;
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    this.screenSpaceEventHandler.setInputAction(() => {
      const cameraCartographic = camera.positionCartographic;
      cameraZ.textContent = `相机:${cameraCartographic.height.toFixed(2)}米`;
    }, Cesium.ScreenSpaceEventType.WHEEL);

    {
      let count = 0;
      let wrongNumber = 0;

      this.screenSpaceEventHelper.add(scene.globe.tileLoadProgressEvent, (e: number) => {
        function getPercent(num: number, total: number) {
          if (Number.isNaN(num) || Number.isNaN(total)) {
            return 0;
          }
          return total <= 0 ? 0 : Math.round((num / total) * 10000) / 100.0;
        }

        percentage.loader.classList.add('percentage-loader-animation');
        if (e > count) {
          count = e;
        }

        if (++wrongNumber > 2) {
          wrongNumber = 0;
          percentage.value.innerText = `${(100 - getPercent(e, count)).toFixed(0)}%`;
        }

        if (e === 0) {
          count = 0;
          percentage.value.innerText = `${(100 - getPercent(e, count)).toFixed(0)}%`;
          percentage.loader.classList.remove('percentage-loader-animation');
        }
      });
    }
  }

  private toDegrees(val: string) {
    if (typeof val === 'undefined' || val === '') {
      return '';
    }
    const value = Number(val);
    const degrees = Math.floor(value);
    const minutes = Math.floor((value - degrees) * 60);
    const seconds = ((value - degrees - minutes / 60) * 3600).toFixed(2);

    return `${degrees}°${minutes}'${seconds}"`;
  }

  setupObserver() {
    const refAttributes = Array.from(this.getAttributeNames()).filter((attr) => attr.startsWith('ref-'));

    refAttributes.forEach((refName: string) => {
      const refValue = this.getAttribute(refName);
      if (refName === 'ref-viewer') {
        this.observers.push(
          onRefChange(refValue, (newValue, oldValue) => {
            this.viewer = newValue;
            if (oldValue === undefined) {
              this.createStyles();
              this.createElements();
              this.createNotifyProperty();
            }
          }),
        );
      }
    });
  }

  connectedCallback() {
    // 设置样式
    // 创建样式表
    const style = document.createElement('style');
    style.textContent = `
      :host {
        position: absolute;
        z-index: 9;
        width: 100%;
        padding: 6px 10px;
        font-size: 13px;
        color: rgb(233, 233, 233);
        text-shadow: 2px 2px 2px #000;
        background-color: rgba(14, 14, 14, 0.64);
        right: 0px;
        bottom: 0px;
        background: rgba(255, 255, 255, 0);
      }
    `;

    // 将样式表添加到 shadow DOM
    this.shadowRoot.appendChild(style);
  }

  disconnectedCallback() {
    this.observers.forEach((disconnect) => disconnect());

    // 移除样式元素
    const styleElement = document.querySelector('style[type="text/css"]');
    if (styleElement) {
      styleElement.remove();
    }

    // 移除父级div元素
    const geoInfoControl = document.getElementById('geo-info-control');
    if (geoInfoControl) {
      geoInfoControl.parentNode.removeChild(geoInfoControl);
    }

    // 停止事件监听
    if (this.screenSpaceEventHandler) {
      this.screenSpaceEventHandler.destroy();
      delete this.screenSpaceEventHandler;
    }

    // 停止事件监听
    if (this.screenSpaceEventHelper) {
      this.screenSpaceEventHelper.removeAll();
      delete this.screenSpaceEventHelper;
    }
  }
}

customElements.define('map-indicator', MapIndicatorComponent);
