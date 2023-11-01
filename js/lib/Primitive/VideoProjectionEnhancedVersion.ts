import * as Cesium from 'cesium';

const ViewVideoFS = `uniform float mixNum;
uniform sampler2D colorTexture;
uniform sampler2D mapvShadow;
uniform sampler2D videoTexture;
uniform sampler2D depthTexture;
uniform sampler2D uvTexture;
uniform mat4 _shadowMap_matrix;
uniform vec4 shadowMap_lightPositionEC;
uniform vec4 shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness;
uniform vec4 shadowMap_texelSizeDepthBiasAndNormalShadingSmooth;
uniform vec4 disViewColor;
uniform bool clearBlack;
uniform bool boxShadow;
uniform bool uvBoxShadow;
varying vec2 v_textureCoordinates;
uniform vec2 uvArraySize;

uniform float contrastAmount;
uniform float saturationAmount;
uniform float brightnessAmount;
uniform float opacityAmount;
uniform float blurAmount;
uniform float sharpenAmount;
uniform float denoiseAmount;
uniform float colorAmount[3];

uniform bool regulatorEnable;

// 调整对比度函数
vec4 adjustContrast(vec4 color, float contrast) {
  return (color - 0.5) * contrast + 0.5;
}
// 调整饱和度函数
vec3 adjustSaturation(vec3 color, float saturation) {
  vec3 gray = vec3(dot(color, vec3(0.2126, 0.7152, 0.0722)));
  return mix(gray, color, saturation);
}
// 调整亮度函数
vec3 adjustBrightness(vec3 color, float brightness) {
  return color * brightness;
}
// 调整透明度函数
vec4 adjustOpacity(vec4 color, float opacity) {
  return vec4(color.rgb, color.a * opacity);
}
// 调整模糊函数
vec4 blur(sampler2D roi,vec4 color,vec2 size,vec2 uv,float v_mixNum, float blurAmount) {
  vec4 sum = vec4(0.0);
  vec2 texelSize = 1.0 / vec2(600, 300);

  // 定义一个模糊核（Blur Kernel）
  float kernel[9];

  kernel[0] = 1.0;
  kernel[1] = 1.0;
  kernel[2] = 1.0;
  kernel[3] = 1.0;
  kernel[4] = 1.0 + blurAmount;  // 使用模糊度参数调整中心像素的权重
  kernel[5] = 1.0;
  kernel[6] = 1.0;
  kernel[7] = 1.0;
  kernel[8] = 1.0;

  // 对周围的像素进行加权平均
  for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
          vec2 offset = vec2(i, j) * texelSize;

          vec4 videoColor = texture2D(roi, uv + offset);
          vec4 tempColor=mix(color,vec4(videoColor.xyz,1.),v_mixNum*videoColor.a);
          sum += tempColor * kernel[(i+1)*3 + (j+1)];
      }
  }

  // 归一化结果
  sum /= (8.0 + blurAmount);  // 使用模糊度参数调整归一化因子

  return sum;
}
// 锐化函数
vec4 sharpen(sampler2D roi,vec2 uv, float sharpenAmount) {
  vec4 center = texture2D(roi, uv);
  vec2 texelSize = 1.0 / vec2(640.0, 360.0);

  // 定义一个锐化核（Sharpen Kernel）
  float kernel[9];

 
  kernel[0] = -1.0 * sharpenAmount;  // 使用锐化度参数调整周围像素的权重
  kernel[1] = -1.0 * sharpenAmount;
  kernel[2] = -1.0 * sharpenAmount;
  kernel[3] = -1.0 * sharpenAmount;
  kernel[4] = 9.0 * sharpenAmount;  //  + 1.0 使用锐化度参数调整中心像素的权重
  kernel[5] = -1.0 * sharpenAmount;
  kernel[6] = -1.0 * sharpenAmount;
  kernel[7] = -1.0 * sharpenAmount;
  kernel[8] = -1.0 * sharpenAmount;

  vec4 sum = vec4(0.0);

  // 对周围的像素进行加权平均
  for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
          vec2 offset = vec2(i, j) * texelSize;
          vec4 videoColor = texture2D(roi, uv + offset);
          sum += videoColor * kernel[(i+1)*3 + (j+1)];
      }
  }

  // 将锐化结果与原始像素进行混合
  vec4 sharpenedColor = center + sum;

  return sharpenedColor;
}
// 噪点函数
vec4 denoise(sampler2D roi, vec2 uv,float noiseLevel) {
  vec2 pixelSize = vec2(1.0) / vec2(640.0, 360.0);

  // 5x5 高斯卷积核
  float kernel[25];
  kernel[0] = 1.0;  kernel[1] = 4.0;  kernel[2] = 7.0;  kernel[3] = 4.0;  kernel[4] = 1.0;
  kernel[5] = 4.0;  kernel[6] = 16.0; kernel[7] = 26.0; kernel[8] = 16.0; kernel[9] = 4.0;
  kernel[10] = 7.0; kernel[11] = 26.0; kernel[12] = 41.0; kernel[13] = 26.0; kernel[14] = 7.0;
  kernel[15] = 4.0; kernel[16] = 16.0; kernel[17] = 26.0; kernel[18] = 16.0; kernel[19] = 4.0;
  kernel[20] = 1.0; kernel[21] = 4.0;  kernel[22] = 7.0;  kernel[23] = 4.0;  kernel[24] = 1.0;

  // 调整降噪度参数 noiseLevel 值越小，降噪效果越弱
  float level = noiseLevel; // 降噪度参数，范围为 [0, 1]
  for (int i = 0; i < 25; i++) {
      kernel[i] *= level;
  }
  vec3 color = vec3(0.0);

  // 计算卷积核权重总和
  float weightSum = 0.0;
  for (int i = 0; i < 25; i++) {
      weightSum += kernel[i];
  }

  // 对每个像素进行卷积
  for (int x = -2; x <= 2; x++) {
      for (int y = -2; y <= 2; y++) {
        vec2 offset = vec2(float(x), float(y)) * pixelSize;
        vec4 videoColor = texture2D(roi, uv + offset);
        color += videoColor.rgb * kernel[(x + 2) * 5 + y + 2];
      }
  }

  // 将卷积结果除以权重总和，得到最终颜色
  return vec4(color / weightSum, 1.0);
}

// 调整色调函数
vec4 adjustColor(vec4 color, float redAmount, float greenAmount, float blueAmount) {
  // 调整红色通道
  color.r += redAmount;

  // 调整绿色通道
  color.g += greenAmount;

  // 调整蓝色通道
  color.b += blueAmount;

  return color;
}


vec4 toEye(in vec2 uv, in float depth) {
  vec2 xy = vec2((uv.x * 2.0 - 1.0), (uv.y * 2.0 - 1.0));
  vec4 posInCamera = czm_inverseProjection * vec4(xy, depth, 1.0);
  posInCamera = posInCamera / posInCamera.w;
  return posInCamera;
}
float getDepth(in vec4 depth) {
  float z_window = czm_unpackDepth(depth);
  z_window = czm_reverseLogDepth(z_window);
  float n_range = czm_depthRange.near;
  float f_range = czm_depthRange.far;
  return (2.0 * z_window - n_range - f_range) / (f_range - n_range);
}
float _czm_sampleShadowMap(sampler2D shadowMap, vec2 uv) {
  return texture2D(shadowMap, uv).r;
}
float _czm_shadowDepthCompare(sampler2D shadowMap, vec2 uv, float depth) {
  return step(depth, _czm_sampleShadowMap(shadowMap, uv));
}
float _czm_shadowVisibility(sampler2D shadowMap, czm_shadowParameters shadowParameters) {
  float depthBias = shadowParameters.depthBias;
  float depth = shadowParameters.depth;
  float nDotL = shadowParameters.nDotL;
  float normalShadingSmooth = shadowParameters.normalShadingSmooth;
  float darkness = shadowParameters.darkness;
  vec2 uv = shadowParameters.texCoords;
  depth -= depthBias;
  vec2 texelStepSize = shadowParameters.texelStepSize;
  float radius = 1.0;
  float dx0 = -texelStepSize.x * radius;
  float dy0 = -texelStepSize.y * radius;
  float dx1 = texelStepSize.x * radius;
  float dy1 = texelStepSize.y * radius;
  float visibility = (_czm_shadowDepthCompare(shadowMap, uv, depth) + _czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, 0.0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, 0.0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy1), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy1), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy1), depth)) * (1.0 / 9.0);
  return visibility;
}
vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point) {
  vec3 v01 = point - planeOrigin;
  float d = dot(planeNormal, v01);
  return (point - planeNormal * d);
}
float ptm(vec3 pt) {
  return sqrt(pt.x * pt.x + pt.y * pt.y + pt.z * pt.z);
}
vec2 getROIuv(sampler2D roi, int index) {
  
  vec2 uv =  vec2(float(index) / uvArraySize.x, 0.0);
  float numColors = uvArraySize.x;
  float colorIndex = floor(uv.x * numColors);
  uv.x = (colorIndex + 0.5) / numColors;
  vec4 uData = texture2D(uvTexture, uv);
  return vec2(uData.r, uData.g);

}
bool isInside(vec2 uv, sampler2D roi, vec4 rect){
  bool ifInside = false;
  float u = uv.x;
  float v = uv.y;
  const int WIDTH = 50;
  vec2 sP = getROIuv(roi, 0);
  for (int i = 0; i < WIDTH; i++)
  {
      int nextIndex = i + 1;
      nextIndex = nextIndex == WIDTH ? 0 : nextIndex;
      vec2 eP = getROIuv(roi, nextIndex);
      if((sP.x == u && sP.y == v) || (eP.x == u && eP.y == v)){
        return true;
      } else if((sP.y < v && eP.y >= v) || (sP.y >= v && eP.y < v)) {
        float x = sP.x + (v - sP.y) * (eP.x - sP.x) / (eP.y - sP.y);
        if(x == u){
          return true;
        } else if(x > u) {
          ifInside = !ifInside;
        }
      }
      sP = eP;
  }
 return ifInside;
}
// 计算点到线段的最短距离
// point: 需要计算的点的坐标
// lineStart: 线段起点的坐标
// lineEnd: 线段终点的坐标
// 返回值: 点到线段的最短距离
float pointLineDistance(vec2 point, vec2 lineStart, vec2 lineEnd) {
    // 计算线段的向量和长度
    vec2 line = lineEnd - lineStart;
    float lineLength = length(line);

    // 计算线段的单位向量
    vec2 normalizedLine = line / lineLength;

    // 计算从线段起点到点的向量，并投影到线段上
    vec2 startToPoint = point - lineStart;
    float projectedLength = dot(startToPoint, normalizedLine);

    // 保证投影长度在0和线段长度之间
    projectedLength = clamp(projectedLength, 0.0, lineLength);

    // 计算点在线段上的投影点
    vec2 closestPointOnLine = lineStart + normalizedLine * projectedLength;

    // 返回点到投影点（即线段上最近点）的距离
    return length(point - closestPointOnLine);
}
void main() {

   const float PI = 3.141592653589793;
   vec4 color = texture2D(colorTexture, v_textureCoordinates);
   vec4 currD = texture2D(depthTexture, v_textureCoordinates);
   if(currD.r >= 1.0) {
     gl_FragColor = color;
     return;
   }

   float depth = getDepth(currD);
   vec4 positionEC = toEye(v_textureCoordinates, depth);
   vec3 normalEC = vec3(1.0);
   czm_shadowParameters shadowParameters;
   shadowParameters.texelStepSize = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.xy;
   shadowParameters.depthBias = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.z;
   shadowParameters.normalShadingSmooth = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.w;
   shadowParameters.darkness = shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness.w;
   shadowParameters.depthBias *= max(depth * 0.01, 1.0);
   vec3 directionEC = normalize(positionEC.xyz - shadowMap_lightPositionEC.xyz);
   float nDotL = clamp(dot(normalEC, -directionEC), 0.0, 1.0);
   vec4 shadowPosition = _shadowMap_matrix * positionEC;
   shadowPosition /= shadowPosition.w;
   if(any(lessThan(shadowPosition.xyz, vec3(0.0))) || any(greaterThan(shadowPosition.xyz, vec3(1.0)))) {
     gl_FragColor = color;
     return;
   }

   shadowParameters.texCoords = shadowPosition.xy;
   shadowParameters.depth = shadowPosition.z;
   shadowParameters.nDotL = nDotL;
   float visibility = _czm_shadowVisibility(mapvShadow, shadowParameters);

   vec4 videoColor = texture2D(videoTexture, shadowPosition.xy);
   if(clearBlack) {
     if(videoColor.r + videoColor.g + videoColor.b < 0.01) {
       gl_FragColor = color;
       return;
     }
   }

   float v_mixNum=mixNum;
   vec2 v_st=shadowPosition.xy;
   if(boxShadow){
    if(videoColor.a>.5){
      float featherRadius=.1;// 羽化半径
      // 计算形状边界 模糊棱角的矩形
      vec2 rectCenter=vec2(.5,.5);
      vec2 rectSize=vec2(1.,1.);// 矩形大小
      vec2 rectHalfSize=rectSize*.5;
      vec2 rectMin=rectCenter-rectHalfSize*.6;
      vec2 rectMax=rectCenter+rectHalfSize*.5;
    
      // 计算距离到形状的边界
      vec2 closestPointInRect=clamp(v_st,rectMin,rectMax);
      float rectDistance=distance(v_st,closestPointInRect);
    
      // 计算羽化值
      float feather=smoothstep(rectDistance-featherRadius,rectDistance,.1);
      v_mixNum=feather;
    }
  }

   
   if(visibility==1.){
      if(uvArraySize.x>=3.){
        bool ifInside=isInside(shadowPosition.xy,uvTexture,vec4(0.,0.,1.,1.));
        if(!ifInside){
          //  discard;
          v_mixNum=0.;
        }

        if(uvBoxShadow && ifInside){
          const int WIDTH = 40;
  
          float minDistance = pointLineDistance(v_st, getROIuv(uvTexture, 0), getROIuv(uvTexture, 1));
          for (int i = 1; i < WIDTH; ++i) {
              minDistance = min(minDistance, pointLineDistance(v_st, getROIuv(uvTexture, i), getROIuv(uvTexture, (i + 1) - (i + 1) / WIDTH * WIDTH)));
          }
      
          float featheringRadius = 0.05; // 调整羽化半径以获得所需的羽化效果
          float alpha = smoothstep(0.0, featheringRadius, minDistance);
  
          v_mixNum = alpha;
        }
      }

      vec4 video=mix(color,vec4(videoColor.xyz,1.),v_mixNum*videoColor.a);
      if(regulatorEnable){
        if(blurAmount != 0.0){
          video = blur(videoTexture,color,shadowParameters.texelStepSize,shadowPosition.xy,v_mixNum,blurAmount);
        }
        if(sharpenAmount != 0.0){
          video = sharpen(videoTexture,shadowPosition.xy,sharpenAmount);
        }
        if(denoiseAmount != 0.0){
          video = denoise(videoTexture,shadowPosition.xy,denoiseAmount);
        }
        if(colorAmount[0] != 0.0 || colorAmount[1] != 0.0 || colorAmount[2] != 0.0){
          video = adjustColor(video,colorAmount[0],colorAmount[1],colorAmount[2]);
        }
        if(contrastAmount != 0.0){
          video = adjustContrast(video,contrastAmount);
        }
        if(saturationAmount != 0.0){
          video = vec4(adjustSaturation(video.rgb,saturationAmount),video.a);
        }
        if(opacityAmount != 0.0){
          float opacity =  adjustOpacity(video,opacityAmount).a;
          video = mix(color,vec4(videoColor.xyz,1.),v_mixNum*videoColor.a*opacity);
        }
        if(brightnessAmount != 0.0){
          video = vec4(adjustBrightness(video.rgb,brightnessAmount),video.a);
        }
      }
      gl_FragColor=video;

      
    }
    else
    {
     if(abs(shadowPosition.z-0.)<.01){
       return;
     }
     if(clearBlack){
       gl_FragColor=color;
       return;
     }
     gl_FragColor=vec4(mix(color.rgb,disViewColor.rgb,disViewColor.a),disViewColor.a);
   }
}`;

var Video3DType = {
  Color: 1,
  Image: 2,
  Video: 3,
  Text: 4,
};

let ratateDirection = {
  LEFT: 'Z',
  RIGHT: '-Z',
  TOP: 'Y',
  BOTTOM: '-Y',
  ALONG: 'X',
  INVERSE: '-X',
};

let textStyles = {
  font: '50px 楷体',
  fill: true,
  fillColor: new Cesium.Color(1.0, 1.0, 0.0, 1.0),
  stroke: true,
  strokeWidth: 2,
  strokeColor: new Cesium.Color(1.0, 1.0, 1.0, 0.8),
  backgroundColor: new Cesium.Color(1.0, 1.0, 1.0, 0.1),
  textBaseline: 'top',
  padding: 40,
};

var Video3DType = {
  Color: 1,
  Image: 2,
  Video: 3,
  Text: 4,
};
//视频融合（投射3D，贴物体表面）
//原理：在可视域的基础上，着色器里传入纹理，再计算UV进行贴图
export class VideoProjectionEnhancedVersion {
  //========== 构造方法 ==========
  constructor(viewer, options) {
    if (!viewer) return;

    if (!options) options = {};
    this.viewer = viewer;
    this._cameraPosition = options.cameraPosition; //相机位置
    this._boxShadow = options.boxShadow || false; //是否开启边缘羽化
    this._uvBoxShadow = options.uvBoxShadow || false; //是否开启边缘羽化
    this._position = options.position; //视点位置
    this.type = options.type; //投影类型
    this.alpha = options.alpha || 1.0; //透明度
    this.color = options.color; //投影的颜色
    this._uvArray = options.uvArray || []; //投影的颜色

    // 视频调节器配参
    this.regulator._contrast = options.contrast || 0.0;
    this.regulator._saturation = options.saturation || 0.0;
    this.regulator._brightness = options.brightness || 0.0;
    this.regulator._opacity = options.opacity || 0.0;
    this.regulator._blur = options.blur || 0.0;
    this.regulator._sharpen = options.sharpen || 0.0;
    this.regulator._denoise = options.denoise || 0.0;
    this.regulator._colorAmount = options.colorAmount || [0.0, 0.0, 0.0];

    this._debugFrustum = Cesium.defaultValue(options.debugFrustum, true); //显示视椎体
    this._aspectRatio = options.aspectRatio || this._getWinWidHei(); //宽高比
    var fov = options.fov && Cesium.Math.toRadians(options.fov);
    this._camerafov = fov || this.viewer.scene.camera.frustum.fov; //相机水平张角
    this.videoTexture = this.texture =
      options.texture ||
      new Cesium.Texture({
        //默认材质
        context: this.viewer.scene.context,
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([255, 255, 255, 255]),
        },
        flipY: false,
      });

    this._uvTexture = new Cesium.Texture({
      //默认材质
      context: this.viewer.scene.context,
      source: {
        width: 1,
        height: 1,
        arrayBufferView: new Uint8Array([255, 255, 255, 255]),
      },
      flipY: false,
    });

    this._videoPlay = Cesium.defaultValue(options.videoPlay, true); //暂停播放
    this.defaultShow = Cesium.defaultValue(options.show, true); //显示和隐藏
    this.clearBlack = Cesium.defaultValue(options.clearBlack, false); //消除鱼眼视频的黑色
    this._rotateDeg = 1;
    this._dirObj = Cesium.defaultValue(options.dirObj, undefined);
    this.text = Cesium.defaultValue(options.text, undefined);
    this.textStyles = Cesium.defaultValue(options.textStyles, textStyles);
    this._disViewColor = Cesium.defaultValue(options.disViewColor, new Cesium.Color(0, 0, 0, 0.5));

    if (!this.cameraPosition || !this.cameraPosition) {
      console.log('初始化失败：请确认相机位置与视点位置正确！');
      return;
    }

    //传入了DOM
    if (options.dom) {
      this.dom = options.dom;
      if (this.dom instanceof HTMLElement) {
        this.dom = options.dom;
      }
      if (options.dom instanceof Object && options.dom.length) {
        this.dom = options.dom[0];
      }
    }
    //传入了URL
    this.url = options.url; //url

    switch (this.type) {
      default:
      case Video3DType.Video:
        this.activeVideo(this.url);
        break;
      case Video3DType.Image:
        this.activePicture(this.url);
        this.deActiveVideo();
        break;
      case Video3DType.Color:
        this.activeColor(this.color);
        this.deActiveVideo();
        break;
      case Video3DType.Text:
        this.activeText(this.text, this.textStyles);
        this.deActiveVideo();
        break;
      case Video3DType.Uv:
        this.activeUv(this._uvArray);
        this.activeVideo(this.url);
        break;
    }

    this._createShadowMap();
    this._getOrientation();
    this._addCameraFrustum();
    this._addPostProcess();
    this.viewer.scene.primitives.add(this);
  }
  /**
   * 调节器
   */
  regulator = {
    enable: false,
    get contrast() {
      return this._contrast;
    },
    get saturation() {
      return this._saturation;
    },
    get brightness() {
      return this._brightness;
    },
    get opacity() {
      return this._opacity;
    },
    get blur() {
      return this._blur;
    },
    get sharpen() {
      return this._sharpen;
    },
    get denoise() {
      return this._denoise;
    },
    get colorAmount() {
      return this._colorAmount;
    },

    set contrast(value) {
      this._contrast = Number(value);
    },
    set saturation(value) {
      this._saturation = Number(value);
    },
    set brightness(value) {
      this._brightness = Number(value);
    },
    set opacity(value) {
      this._opacity = Number(value);
    },
    set blur(value) {
      this._blur = Number(value);
    },
    set sharpen(value) {
      this._sharpen = Number(value);
    },
    set denoise(value) {
      this._denoise = Number(value);
    },
    set colorAmount(value) {
      this._colorAmount = new Array(value[0], value[1], value[2]);
    },

    convert(i) {
      if (i != 0) return Number(((i - 1) / 99).toFixed(2));
      return 0.0;
    },

    convertArr(arr) {
      var newArr = [];
      arr.forEach((item, index) => {
        newArr.push(convert(item));
      });
      return newArr;
    },
  };
  //========== 对外属性 ==========
  //混合系数0-1
  get alpha() {
    return this._alpha;
  }
  set alpha(val) {
    this._alpha = val;
  }

  //相机宽高比例
  get aspectRatio() {
    return this._aspectRatio;
  }
  set aspectRatio(val) {
    this._aspectRatio = val;
    this._changeVideoWidHei();
  }
  //视椎体显隐
  get debugFrustum() {
    return this._debugFrustum;
  }
  set debugFrustum(val) {
    this._debugFrustum = val;
    this.cameraFrustum.show = val;
  }
  //相机水平张角
  get fov() {
    return this._camerafov;
  }
  set fov(val) {
    this._camerafov = Cesium.Math.toRadians(val);
    this._changeCameraFov();
  }
  //相机位置
  get cameraPosition() {
    return this._cameraPosition;
  }
  set cameraPosition(pos) {
    if (!pos) return;
    this._cameraPosition = pos;
    this._changeCameraPos();
  }
  //视点位置
  get position() {
    return this._position;
  }
  set position(pos) {
    if (!pos) return;
    this._position = pos;
    this._changeViewPos();
  }
  //切换视频 播放/暂停
  get videoPlay() {
    return this._videoPlay;
  }
  set videoPlay(val) {
    this._videoPlay = Boolean(val);
    if (this.videoElement) {
      if (this.videoPlay) this.videoElement.play();
      else this.videoElement.pause();
    }
  }
  get boxShadow() {
    return this._boxShadow;
  }
  set boxShadow(val) {
    this._boxShadow = Boolean(val);
  }

  get uvBoxShadow() {
    return this._uvBoxShadow;
  }
  set uvBoxShadow(val) {
    this._uvBoxShadow = Boolean(val);
  }

  get uvTexture() {
    return this._uvTexture;
  }
  set uvTexture(val) {
    this._uvTexture = val;
  }
  /** 所有相机的参数  */
  get params() {
    var viewJson = {};
    viewJson.type = this.type;
    if (this.type == Video3DType.Color) viewJson.color = this.color;
    else viewJson.url = this.url;

    viewJson.position = this.position;
    viewJson.cameraPosition = this.cameraPosition;
    viewJson.fov = Cesium.Math.toDegrees(this.fov);
    viewJson.aspectRatio = this.aspectRatio;
    viewJson.alpha = this.alpha;
    viewJson.debugFrustum = this.debugFrustum;
    viewJson.dirObj = this._dirObj;
    return viewJson;
  }

  //显示和隐藏
  get show() {
    return this.defaultShow;
  }
  set show(val) {
    this.defaultShow = Boolean(val);
    this._switchShow();
  }
  get camera() {
    return this.viewShadowMap._lightCamera;
  }
  //========== 方法 ==========

  get disViewColor() {
    return this._disViewColor;
  }
  set disViewColor(color) {
    if (!color) return;
    this._disViewColor = color;
    if (!color.a && color.a != 0) {
      this._disViewColor.a = 1.0;
    }
  }

  get uvArray() {
    return this._uvArray;
  }
  set uvArray(val) {
    this._uvArray = val;
    this.activeUv(val);
  }
  //旋转相机
  rotateCamera(axis, deg) {
    var rotateDegree = Cesium.defaultValue(deg, this._rotateDeg);
    switch (axis) {
      case ratateDirection.LEFT:
        break;
      case ratateDirection.RIGHT:
        rotateDegree *= -1;
        break;
      case ratateDirection.TOP:
        break;
      case ratateDirection.BOTTOM:
        rotateDegree *= -1;
        break;
      case ratateDirection.ALONG:
        break;
      case ratateDirection.INVERSE:
        rotateDegree *= -1;
        break;
    }
    var newDir = this._computedNewViewDir(axis, rotateDegree);

    this.viewer.scene.postProcessStages.remove(this.postProcess);
    this.viewer.scene.primitives.remove(this.cameraFrustum);
    this.viewShadowMap.destroy();
    this.cameraFrustum.destroy();
    this._resetCameraDir(newDir);
    this._getOrientation();
    this._addCameraFrustum();
    this._addPostProcess();
  }
  _resetCameraDir(dirObj) {
    if (!dirObj || !dirObj.up || !dirObj.right || !dirObj.direction) return;
    this._dirObj = dirObj;
    this._createShadowMap();
  }
  //计算新视点
  _computedNewViewDir(axis, deg) {
    deg = Cesium.Math.toRadians(deg);
    var camera = this.viewShadowMap._lightCamera;
    var oldDir = Cesium.clone(camera.direction);
    var oldRight = Cesium.clone(camera.right);
    var oldTop = Cesium.clone(camera.up);
    var mat3 = new Cesium.Matrix3();

    switch (axis) {
      case ratateDirection.LEFT:
        Cesium.Matrix3.fromRotationZ(deg, mat3);
        break;
      case ratateDirection.RIGHT:
        Cesium.Matrix3.fromRotationZ(deg, mat3);
        break;
      case ratateDirection.TOP:
        Cesium.Matrix3.fromRotationY(deg, mat3);
        break;
      case ratateDirection.BOTTOM:
        Cesium.Matrix3.fromRotationY(deg, mat3);
        break;
      case ratateDirection.ALONG:
        Cesium.Matrix3.fromRotationX(deg, mat3);
        break;
      case ratateDirection.INVERSE:
        Cesium.Matrix3.fromRotationX(deg, mat3);
        break;
    }
    var localToWorld_Matrix = Cesium.Transforms.eastNorthUpToFixedFrame(camera.position);
    // var hpr = new Cesium.HeadingPitchRoll(viewer.camera.heading,viewer.camera.pitch,viewer.camera.roll);
    // localToWorld_Matrix = Cesium.Transforms.headingPitchRollToFixedFrame(viewer.camera.position,hpr,Cesium.Ellipsoid.WGS84,Cesium.Transforms.eastNorthUpToFixedFrame);
    var worldToLocal_Matrix = Cesium.Matrix4.inverse(localToWorld_Matrix, new Cesium.Matrix4());

    var localDir = Cesium.Matrix4.multiplyByPointAsVector(worldToLocal_Matrix, oldDir, new Cesium.Cartesian3());
    var localNewDir = Cesium.Matrix3.multiplyByVector(mat3, localDir, new Cesium.Cartesian3());
    var newDir = Cesium.Matrix4.multiplyByPointAsVector(localToWorld_Matrix, localNewDir, new Cesium.Cartesian3());

    var localRight = Cesium.Matrix4.multiplyByPointAsVector(worldToLocal_Matrix, oldRight, new Cesium.Cartesian3());
    var localNewRight = Cesium.Matrix3.multiplyByVector(mat3, localRight, new Cesium.Cartesian3());
    var newRight = Cesium.Matrix4.multiplyByPointAsVector(localToWorld_Matrix, localNewRight, new Cesium.Cartesian3());

    var localTop = Cesium.Matrix4.multiplyByPointAsVector(worldToLocal_Matrix, oldTop, new Cesium.Cartesian3());
    var localNewTop = Cesium.Matrix3.multiplyByVector(mat3, localTop, new Cesium.Cartesian3());
    var newTop = Cesium.Matrix4.multiplyByPointAsVector(localToWorld_Matrix, localNewTop, new Cesium.Cartesian3());
    return {
      direction: newDir,
      right: newRight,
      up: newTop,
    };
  }

  getPercentagePoint(cartesian) {
    if (!cartesian) return;
    var vm = this.viewShadowMap._lightCamera._viewMatrix;
    var pm = this.viewShadowMap._lightCamera.frustum.projectionMatrix;
    var c4 = new Cesium.Cartesian4(cartesian.x, cartesian.y, cartesian.z, 1.0);
    var pvm = Cesium.Matrix4.multiply(pm, vm, new Cesium.Matrix4());
    var epos1 = Cesium.Matrix4.multiplyByVector(pvm, c4, new Cesium.Cartesian4());
    var epos2 = new Cesium.Cartesian2(epos1.x / epos1.w, epos1.y / epos1.w);
    var epos3 = new Cesium.Cartesian2(epos2.x / 2 + 0.5, epos2.y / 2 + 0.5);
    return epos3;
  }

  /**
   * 改变相机的水平张角
   */
  _changeCameraFov() {
    this.viewer.scene.postProcessStages.remove(this.postProcess);
    this.viewer.scene.primitives.remove(this.cameraFrustum);
    this._createShadowMap();
    this._getOrientation();
    this._addCameraFrustum();
    this._addPostProcess();
  }

  /**
   * 改变相机视野的宽高比例（垂直张角）
   */
  _changeVideoWidHei() {
    this.viewer.scene.postProcessStages.remove(this.postProcess);
    this.viewer.scene.primitives.remove(this.cameraFrustum);
    this._createShadowMap();
    this._getOrientation();
    this._addCameraFrustum();
    this._addPostProcess();
  }

  /**
   * 改变相机的位置
   */
  _changeCameraPos() {
    this.viewer.scene.postProcessStages.remove(this.postProcess);
    this.viewer.scene.primitives.remove(this.cameraFrustum);
    this.viewShadowMap.destroy();
    this.cameraFrustum.destroy();
    this._createShadowMap(true);
    this._getOrientation();
    this._addCameraFrustum();
    this._addPostProcess();
  }

  /**
   * 改变相机视点的位置
   */
  _changeViewPos() {
    this.viewer.scene.postProcessStages.remove(this.postProcess);
    this.viewer.scene.primitives.remove(this.cameraFrustum);
    this.viewShadowMap.destroy();
    this.cameraFrustum.destroy();
    this._createShadowMap(true);
    this._getOrientation();
    this._addCameraFrustum();
    this._addPostProcess();
  }

  _switchShow() {
    if (this.show) {
      !this.postProcess && this._addPostProcess();
    } else {
      this.viewer.scene.postProcessStages.remove(this.postProcess);
      delete this.postProcess;
      this.postProcess = null;
    }
    // this.cameraFrustum.show = this.show;
  }

  /**
   * 激活或重置视频URL
   * @param videoSrc
   * @returns
   */
  activeVideo(videoSrc) {
    //在可视域添加视频
    var videoElement;
    if (this.dom) {
      videoElement = this.dom;
    } else {
      videoElement = this._createVideoEle(videoSrc);
    }

    // debugger
    var that = this;
    if (videoElement) {
      this.type = Video3DType.Video;
      this.videoElement = videoElement;
      videoElement.addEventListener('canplaythrough', function () {
        that.viewer.clock.onTick.addEventListener(that.activeVideoListener, that);
      });
    }
  }
  activeVideoListener() {
    try {
      if (this._videoPlay && this.videoElement.paused) this.videoElement?.play();
    } catch (e) {}

    this.videoTexture && this.videoTexture.destroy();
    this.videoTexture = new Cesium.Texture({
      context: this.viewer.scene.context,
      source: this.videoElement,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE,
    });
  }

  //删除视频播放监听
  deActiveVideo() {
    this.viewer.clock.onTick.removeEventListener(this.activeVideoListener, this);
    delete this.activeVideoListener;
  }

  /**
   * 激活或重置图片URL
   * @param videoSrc
   * @returns
   */
  activePicture(picSrc) {
    //在可视域添加图片
    this.videoTexture = this.texture;

    var that = this;
    var image = new Image();
    image.onload = function () {
      that.type = Video3DType.Image;
      that.videoTexture = new Cesium.Texture({
        context: that.viewer.scene.context,
        source: image,
      });
    };
    image.onerror = function () {
      console.log('图片加载失败：' + picSrc);
    };
    image.src = picSrc;
  }

  /**
   * 激活或重置颜色
   * @param color
   * @returns
   */
  activeColor(color) {
    //在可视域添加纯色
    var that = this;
    this.type = Video3DType.Color;
    var r, g, b, a;
    if (color) {
      r = color.red * 255;
      g = color.green * 255;
      b = color.blue * 255;
      a = color.alpha * 255;
    } else {
      r = Math.random() * 255;
      g = Math.random() * 255;
      b = Math.random() * 255;
      a = Math.random() * 255;
    }
    that.videoTexture = new Cesium.Texture({
      context: that.viewer.scene.context,
      source: {
        width: 1,
        height: 1,
        arrayBufferView: new Uint8Array([r, g, b, a]),
      },
      flipY: false,
    });
  }

  /**
   * 激活或重置文本
   * @param text
   * @param styles
   * @returns
   */
  // Name	               Type	          Default	                     Description
  // font	               String	      '10px sans-serif'	             optional The CSS font to use.
  // textBaseline	       String	      'bottom'	                     optional The baseline of the text.
  // fill	               Boolean	      true	                         optional Whether to fill the text.
  // stroke	           Boolean	      false	                         optional Whether to stroke the text.
  // fillColor	       Color	      Color.WHITE	                 optional The fill color.
  // strokeColor	       Color	      Color.BLACK	                 optional The stroke color.
  // strokeWidth	       Number	      1	                             optional The stroke width.
  // backgroundColor	   Color	      Color.TRANSPARENT	             optional The background color of the canvas.
  // padding	           Number	      0	                             optional The pixel size of the padding to add around the text.
  activeText(text, styles) {
    //在可视域添加纯色
    var that = this;
    this.type = Video3DType.Text;
    if (!text) return;
    styles = styles || {};
    styles.textBaseline = 'top';
    this.textCanvas = Cesium.writeTextToCanvas(text, styles);
    that.videoTexture = new Cesium.Texture({
      context: that.viewer.scene.context,
      source: this.textCanvas,
      flipY: true,
    });
  }

  /**
   * 激活或重置剪切
   * @param text
   * @param styles
   * @returns
   */
  activeUv(uvArray) {
    //对可视域进行剪切
    this.type = Video3DType.Uv;
    // 将数据写入纹理
    var pixelArray = new Float32Array(uvArray.length * 4);
    for (var i = 0; i < uvArray.length; i++) {
      pixelArray[i * 4] = uvArray[i][0];
      pixelArray[i * 4 + 1] = uvArray[i][1];
    }

    this.uvTexture = new Cesium.Texture({
      context: this.viewer.scene.context,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      flipY: false,
      source: {
        width: uvArray.length,
        height: 1,
        arrayBufferView: pixelArray,
      },
    });
  }

  /**
   * 呈现投影相机的第一视角
   */
  locate() {
    var camera_pos = Cesium.clone(this.cameraPosition);
    var lookat_pos = Cesium.clone(this.position);
    this.viewer.camera.position = camera_pos;
    if (this._dirObj) {
      this.viewer.camera.direction = Cesium.clone(this._dirObj.direction);
      this.viewer.camera.right = Cesium.clone(this._dirObj.right);
      this.viewer.camera.up = Cesium.clone(this._dirObj.up);
      return;
    }
    this.viewer.camera.direction = Cesium.Cartesian3.subtract(lookat_pos, camera_pos, new Cesium.Cartesian3(0, 0, 0));
    this.viewer.camera.up = Cesium.Cartesian3.normalize(camera_pos, new Cesium.Cartesian3(0, 0, 0));
  }

  //获取四元数
  _getOrientation() {
    var cpos = this.cameraPosition;
    var position = this.position;
    var direction = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(position, cpos, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );
    var up = Cesium.Cartesian3.normalize(cpos, new Cesium.Cartesian3());
    var camera = new Cesium.Camera(this.viewer.scene);
    camera.position = cpos;
    camera.direction = direction;
    camera.up = up;
    direction = camera.directionWC;
    up = camera.upWC;
    var right = camera.rightWC;
    var scratchRight = new Cesium.Cartesian3();
    var scratchRotation = new Cesium.Matrix3();
    var scratchOrientation = new Cesium.Quaternion();

    // var right = Cesium.Cartesian3.cross(direction,up,new Cesium.Cartesian3());
    right = Cesium.Cartesian3.negate(right, scratchRight);
    var rotation = scratchRotation;
    Cesium.Matrix3.setColumn(rotation, 0, right, rotation);
    Cesium.Matrix3.setColumn(rotation, 1, up, rotation);
    Cesium.Matrix3.setColumn(rotation, 2, direction, rotation);
    //计算视锥姿态
    var orientation = Cesium.Quaternion.fromRotationMatrix(rotation, scratchOrientation);
    this.orientation = orientation;
    return orientation;
  }
  //创建video元素
  _createVideoEle(src) {
    //创建可视域video DOM  元素
    if (!src) return;
    // this.videoId = 'visualDomId';
    var source_map4 = document.createElement('SOURCE');
    source_map4.type = 'video/mp4';
    source_map4.src = src;
    var source_mov = document.createElement('SOURCE');
    source_mov.type = 'video/quicktime';
    source_mov.src = src;
    var videoEle = document.createElement('video');

    videoEle.setAttribute('autoplay', true);
    videoEle.setAttribute('loop', true);
    videoEle.setAttribute('crossorigin', true);
    videoEle.appendChild(source_map4);
    videoEle.appendChild(source_mov);
    videoEle.style.display = 'none';
    document.body.appendChild(videoEle);
    return videoEle;
  }

  //获取canvas宽高
  _getWinWidHei() {
    var scene = this.viewer.scene;
    return scene.canvas.clientWidth / scene.canvas.clientHeight;
  }

  //创建ShadowMap
  _createShadowMap(reset) {
    var camera_pos = this.cameraPosition;
    var lookat_pos = this.position;
    var scene = this.viewer.scene;
    var camera1 = new Cesium.Camera(scene);
    camera1.position = camera_pos;
    if (this._dirObj && !reset) {
      camera1.direction = this._dirObj.direction;
      camera1.right = this._dirObj.right;
      camera1.up = this._dirObj.up;
    } else {
      camera1.direction = Cesium.Cartesian3.subtract(lookat_pos, camera_pos, new Cesium.Cartesian3(0, 0, 0));
      camera1.up = Cesium.Cartesian3.normalize(camera_pos, new Cesium.Cartesian3(0, 0, 0));
      // this._dirObj = {
      //     direction:camera1.direction,
      //     right:camera1.right,
      //     up:camera1.up
      // }
    }

    var far = Cesium.Cartesian3.distance(lookat_pos, camera_pos);
    this.viewDis = far;
    camera1.frustum = new Cesium.PerspectiveFrustum({
      fov: this.fov,
      aspectRatio: this.aspectRatio,
      near: 0.1,
      far: far * 2,
    });

    var isSpotLight = true;
    this.viewShadowMap = new Cesium.ShadowMap({
      lightCamera: camera1,
      enable: false,
      isPointLight: !isSpotLight,
      isSpotLight: isSpotLight,
      cascadesEnabled: false,
      context: scene.context,
      pointLightRadius: far,
    });
  }

  //添加视椎体
  _addCameraFrustum() {
    var that = this;
    this.cameraFrustum = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.FrustumOutlineGeometry({
          origin: that.cameraPosition,
          orientation: that.orientation,
          frustum: this.viewShadowMap._lightCamera.frustum,
          _drawNearPlane: true,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(0.0, 0.5, 0.5)),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({
        translucent: false,
        flat: true,
      }),
      asynchronous: false,
      show: this.debugFrustum && this.show,
    });
    this.viewer.scene.primitives.add(this.cameraFrustum);
  }

  //添加后处理
  _addPostProcess() {
    var that = this;
    var bias = that.viewShadowMap._isPointLight ? that.viewShadowMap._pointBias : that.viewShadowMap._primitiveBias;
    if (!this.show) return;

    this.postProcess = new Cesium.PostProcessStage({
      fragmentShader: ViewVideoFS,
      uniforms: {
        mixNum: function () {
          return that.alpha;
        },
        mapvShadow: function () {
          return that.viewShadowMap._shadowMapTexture;
        },
        videoTexture: function () {
          return that.videoTexture;
        },
        _shadowMap_matrix: function () {
          return that.viewShadowMap._shadowMapMatrix;
        },
        shadowMap_lightPositionEC: function () {
          return that.viewShadowMap._lightPositionEC;
        },
        shadowMap_texelSizeDepthBiasAndNormalShadingSmooth: function () {
          var texelStepSize = new Cesium.Cartesian2();
          texelStepSize.x = 1.0 / that.viewShadowMap._textureSize.x;
          texelStepSize.y = 1.0 / that.viewShadowMap._textureSize.y;
          return Cesium.Cartesian4.fromElements(
            texelStepSize.x,
            texelStepSize.y,
            bias.depthBias,
            bias.normalShadingSmooth,
            this.combinedUniforms1,
          );
        },
        shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness: function () {
          return Cesium.Cartesian4.fromElements(
            bias.normalOffsetScale,
            that.viewShadowMap._distance,
            that.viewShadowMap.maximumDistance,
            that.viewShadowMap._darkness,
            this.combinedUniforms2,
          );
        },
        disViewColor: function () {
          return that._disViewColor;
        },
        clearBlack: function () {
          return that.clearBlack;
        },
        boxShadow: function () {
          return that._boxShadow;
        },
        uvTexture: function () {
          return that.uvTexture;
        },
        uvArraySize: function () {
          return new Cesium.Cartesian2(that._uvArray.length, 1);
        },
        uvBoxShadow: function () {
          return that._uvBoxShadow;
        },
        regulatorEnable: function () {
          return that.regulator.enable;
        },
        contrastAmount: function () {
          return that.regulator.contrast;
        },
        saturationAmount: function () {
          return that.regulator.saturation;
        },
        brightnessAmount: function () {
          return that.regulator.brightness;
        },
        opacityAmount: function () {
          return that.regulator.opacity;
        },
        blurAmount: function () {
          return that.regulator.blur;
        },
        sharpenAmount: function () {
          return that.regulator.sharpen;
        },
        denoiseAmount: function () {
          return that.regulator.denoise;
        },
        colorAmount: function () {
          return that.regulator.colorAmount;
        },
      },
    });
    this.viewer.scene.postProcessStages.add(this.postProcess);
  }

  update(frameState) {
    this.viewShadowMap && frameState.shadowMaps.push(this.viewShadowMap);
  }

  destroy() {
    this.viewer.scene.postProcessStages.remove(this.postProcess);
    this.videoTexture && this.videoTexture.destroy();
    this.viewer.scene.primitives.remove(this.cameraFrustum);

    this.videoElement && this.videoElement.parentNode.removeChild(this.videoElement);
    delete this.videoElement;

    this.viewer.clock.onTick.removeEventListener(this.activeVideoListener, this);

    delete this.activeVideoListener;
    delete this.postProcess;
    delete this.viewShadowMap;
    delete this.color;
    delete this.viewDis;
    delete this.cameraPosition;
    delete this.position;
    delete this.alpha;
    delete this._camerafov;
    delete this._cameraPosition;
    delete this.videoTexture;
    delete this.cameraFrustum;
    delete this.dom;

    delete this._debugFrustum;
    delete this._position;
    delete this._aspectRatio;
    delete this.orientation;
    delete this.texture;
    // delete this.videoId;
    delete this.type;
    delete this.videoTexture;
    delete this.url;
    this.viewer.scene.primitives.remove(this);
    delete this.viewer;
  }
}
Video3D.Type = Video3DType;
