import * as Cesium from 'cesium';

import { Map3D } from '@/utils/maps';
import { registerRef } from '@/components/middleware';
import ImageryProviderFactory from '@/utils/imagery-provider/imageryProviderFactory';
// export const viewer: Cesium.Viewer = null;

Map3D.create({ mapId: 'cesiumContainer' })
  .then(({ viewer }) => {
    createImageryProvider(viewer);
    registerRef('viewer', viewer);
  })
  .catch((error) => {
    console.error('Error initializing Map3D:', error);
  });
onMenu();
function onMenu() {
  const background = document.querySelector('[key="menu-background"]') as HTMLDivElement;
  const container = document.querySelector('[key="menu-container"]') as HTMLDivElement;

  const elements = [background, container];
  const openButton = document.querySelector('[key="menu-open"]') as HTMLButtonElement;
  const closeButton = document.querySelector('[key="menu-close"]') as HTMLButtonElement;

  const content = document.querySelector('[key="content-wrapper"]') as HTMLDivElement;
  const toggleElementsVisibility = (show: boolean) => {
    elements.forEach((element) => {
      element.classList.toggle('hidden', !show);
    });
  };

  closeButton.addEventListener('click', () => {
    toggleElementsVisibility(false);
    content.classList.toggle('hidden', true);
  });

  openButton.addEventListener('click', () => {
    toggleElementsVisibility(true);
    content.classList.toggle('hidden', false);
  });
}

function createImageryProvider(viewer: Cesium.Viewer) {
  const imageryProvider = new ImageryProviderFactory();
  viewer.scene.imageryLayers.addImageryProvider(imageryProvider);
}
