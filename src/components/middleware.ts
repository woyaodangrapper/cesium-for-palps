type GlobalStore = {
  [key: string]: any;
};

type Callbacks = {
  [key: string]: Array<(newValue: any, oldValue: any) => void>;
};

const globalStore: GlobalStore = {};
const callbacks: Callbacks = {};

// 注册变量及其值
export function registerRef(name: string, value: any) {
  const oldValue = globalStore[name];
  globalStore[name] = value;

  // 如果存在回调，触发它们
  if (callbacks[name]) {
    callbacks[name].forEach((callback) => callback(value, oldValue));
  }
}

// 获取变量的值
export function getRef(name: string): any {
  return globalStore[name];
}

// 注册回调函数
export function onRefChange(name: string, callback: (newValue: any, oldValue: any) => void) {
  if (!callbacks[name]) {
    callbacks[name] = [];
  }
  callbacks[name].push(callback);
  return () => disconnect(name, callback);
}

// 断开回调函数
export function disconnect(name: string, callback?: (newValue: any, oldValue: any) => void) {
  if (!callbacks[name]) return;

  if (callback) {
    // 移除指定的回调函数
    callbacks[name] = callbacks[name].filter((cb) => cb !== callback);
  } else {
    // 如果未指定 callback，则移除所有回调
    delete callbacks[name];
  }
}
