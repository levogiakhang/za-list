import { NOT_FOUND } from "./value";

class ItemCache {
  constructor(defaultHeight) {
    this.defaultHeight = defaultHeight;

    // A map stores `index -> itemId`
    this.__indexMap__ = new Map();

    // A map stores `itemId -> {index, defaultHeight, height, position, isDebut}`
    this.__itemsMap__ = new Map();
  }

  clear() {
    this.__indexMap__.clear();
    this.__itemsMap__.clear();
  }

  get getDefaultHeight(): number {
    return this.defaultHeight;
  }

  getItemId(index: number): string {
    return this.__indexMap__.has(index) ? this.__indexMap__.get(index) : NOT_FOUND;
  }

  hasItem(itemId: string): boolean {
    return this.__itemsMap__.has(itemId);
  }

  getIndex(itemId: string): number {
    return this.__itemsMap__.has(itemId) ? this.__itemsMap__.get(itemId).index : NOT_FOUND
  }

  getHeight(itemId: string): number {
    return this.__itemsMap__.has(itemId) ? this.__itemsMap__.get(itemId).height : NOT_FOUND
  }

  getPosition(itemId: string): number {
    return this.__itemsMap__.has(itemId) ? this.__itemsMap__.get(itemId).position : NOT_FOUND
  }

  isRendered(itemId: string): boolean {
    return this.__itemsMap__.has(itemId) ? this.__itemsMap__.get(itemId).isRendered : NOT_FOUND
  }

  get getIndexMap() {
    return this.__indexMap__;
  }

  get getItemsMap() {
    return this.__itemsMap__;
  }

  updateItemHeight(itemId: string, newHeight, isRendered: boolean = true) {
    this.updateItemOnMap(
      itemId,
      this.getIndex(itemId),
      newHeight,
      this.getPosition(itemId),
      isRendered
    );
  }

  updateItemRender(itemId: string, isRendered: boolean = true) {
    this.updateItemOnMap(
      itemId,
      this.getIndex(itemId),
      this.getHeight(itemId),
      this.getPosition(itemId),
      isRendered
    );
  }

  deleteItem(itemIndex, itemId, data) {
    // Update index map
    this.updateIndexMap(itemIndex - 1, data);
    this.__indexMap__.delete(data.length);

    // Update items map.
    this.updateItemsMap(itemIndex - 1, data.length);
    this.__itemsMap__.delete(itemId);
  }

  updateItemOnMap(itemId: string, itemIndex: number, itemHeight: number, itemPosition: number, isRendered: boolean) {
    this.__itemsMap__.set(
      itemId,
      {
        index: itemIndex,
        height: itemHeight,
        position: itemPosition,
        isRendered: isRendered
      });
  }

  updateIndexItem(index: number, itemId: string) {
    this.__indexMap__.set(index, itemId);
  }

  updateItemsMap(startIndex: number, dataLength: number) {
    if (dataLength) {
      let itemId;
      if (startIndex < 0) startIndex = 0;
      for (let i = startIndex; i <= dataLength - 1; i++) {
        itemId = this.getItemId(i);
        this.updateItemOnMap(
          itemId,
          i,
          this.getHeight(itemId),
          this.getPosition(itemId),
          this.isRendered(itemId));
      }
    }
  }

  updateIndexMap(startIndex: number, data: Array) {
    if (!!data.length) {
      if (startIndex < 0) startIndex = 0;
      for (let i = startIndex; i < data.length; i++) {
        this.updateIndexItem(i, data[i].itemId);
      }
    }
  }
}

export default ItemCache;