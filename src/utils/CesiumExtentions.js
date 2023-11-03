/**
 * 定位时戳到中午十二点
 */
Cesium.prototype.$locationTimeNoon = function () {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 月份从0开始，所以需要加1
  const day = currentDate.getDate();

  const _time = `${year}-${month}-${day}T04:00:00.00Z`;
  viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(_time));
};
