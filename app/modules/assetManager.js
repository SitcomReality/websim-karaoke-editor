// app/modules/assetManager.js

const audioAssets = [];
const imageAssets = [];

export function init() {}

export async function addAsset(file, type) {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2,7)}_${file.name}`;
    const url = URL.createObjectURL(file);
    const obj = { id, url, type, name: file.name };

    if (type === 'audio') audioAssets.push(obj);
    if (type === 'image') imageAssets.push(obj);
    return obj;
}

export function findAssetById(id) {
    return audioAssets.concat(imageAssets).find(a => a.id === id);
}

export function loadSessionAssets() {
    // Would populate the sidebar lists in future expansion
}