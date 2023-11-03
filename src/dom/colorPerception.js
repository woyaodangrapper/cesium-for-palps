/**
 * @description: 颜色感知 此库及其消耗资源，不建议循环
 */
Map3D.prototype.perception = {
  color: {
    mapId: null,
    apiList: ['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'],
    init: function (mapId) {
      if (!mapId) throw new Error("mapId 不能为空");
      this.mapId = mapId;
      this._create3DLibrary();

    },
    /**
   * 加载html2canvas截图库
   */
    _create3DLibrary() {
      // cssExpr 用于判断资源是否是css
      var cssExpr = new RegExp("\\.css");
      if (navigator.onLine) {
        console.log("设备已连接到互联网,开始加载html2canvas截图库");
        this.apiList.forEach(url => {
          const element = cssExpr.test(url)
            ? Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${url}` })
            : Object.assign(document.createElement('script'), { src: `${url}`, ['defer']: true });
          document.head.appendChild(element);
        });
      } else {
        throw new Error("设备未连接到互联网,无法加载html2canvas截图库")
      }


    },
    // 根据灰度值获取挡位
    getBrightnessLevel: function (brightness) {
      if (brightness >= 0.0 && brightness < 0.436767) {
        return 1;
      } else if (brightness >= 0.436767 && brightness < 0.870222) {
        return 2;
      } else if (brightness >= 0.870222 && brightness < 1.303678) {
        return 3;
      } else if (brightness >= 1.303678 && brightness <= 1.73) {
        return 4;
      } else if (brightness >= 1.74) {
        return 5;
      }
    },
    /**
     * @description: 获取屏幕亮度
     * @return {number} 亮度值
     * @example: get2DRectangularBrightness('map')
     */
    get2DRectangularBrightness: async function ({ x, y, w, h }) {
      try {
        const screenshotCanvas = await html2canvas(document.getElementById(this.mapId), {
          scale: 0.1,
          logging: true,
          scrollX: -window.scrollX + x,
          scrollY: -window.scrollY + y,
          width: w,
          height: h,
        });
        // 将 canvas 大小设置为当前页面大小

        const ctx = screenshotCanvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, w, h);

        const brightnesses = [];
        const frameSkip = 10;

        for (let i = 0; i < imageData.data.length; i += 4 * frameSkip) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const pixel = [r, g, b];
          brightnesses.push(getPixelBrightness(pixel));
        }

        function getPixelBrightness(pixel) {
          const r = pixel[0];
          const g = pixel[1];
          const b = pixel[2];
          return 0.299 * r + 0.587 * g + 0.114 * b;
        }

        const sumBrightness = brightnesses.reduce((a, b) => a + b);
        const averageBrightness = sumBrightness / brightnesses.length;
        return averageBrightness;
      } catch (error) {
        throw error;
      }

      // demo
      // const startTime = performance.now();
      // rectangleBrightnessDetection(0, 0, width, height)
      //   .then(brightness => {
      //     const endTime = performance.now();
      //     const elapsedTime = endTime - startTime;

      //     var brightnessLevel = getBrightnessLevel(brightness);
      //     console.log(`代码执行耗时：${elapsedTime} 毫秒，brightness 结果为 ${brightness} 亮度挡位： ${brightnessLevel}`);

      //     return brightnessLevel;
      //   })
      //   .catch(error => {
      //     console.error(error);
      //   });

    },
    /**
     *  @description: 获取屏幕截图
     * @param {*} isDownload  是否下载
     */
    async get2DRectangularScreenshot(isDownload = false) {
      const screenshotCanvas = await html2canvas(document.getElementById(this.mapId), {
        scale: 1,
        logging: true,
        scrollX: -window.scrollX + x,
        scrollY: -window.scrollY + y,
        width: w,
        height: h,
      });

      if (isDownload) {
        const a = document.createElement("a");
        a.href = screenshotCanvas.toDataURL();
        a.download = "cesium-screenshot.png";
        a.click();
      }
    },
    destroy() {
      this.mapId = null;
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
    }

  }
};
