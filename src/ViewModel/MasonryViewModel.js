import { NOT_FOUND, OUT_OF_RANGE } from "../utils/value";
import isFunction from "../vendors/isFunction";

type EventTypes = 'loadTop' | 'loadBottom';
type Callback = (params: any) => any;

class MasonryViewModel {
  constructor({dataViewModel, node, itemCache}) {
    this.dataViewModel = dataViewModel;
    this.masonry = node;
    this.itemCache = itemCache;

    // stores storageEvent handler
    this.storageEvent = {};

    this.scrollToSpecialItem = this.scrollToSpecialItem.bind(this);
    this.scrollToTop = this.scrollToTop.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);
    this.onRemoveItem = this.onRemoveItem.bind(this);
    this.onAddItem = this.onAddItem.bind(this);
    this.onUpdateItem = this.onUpdateItem.bind(this);
  }

  clear() {
    if (this.itemCache) {
      this.itemCache.clear();
    }
  }

  addEventListener(eventName: EventTypes, callback: Callback) {
    this.storageEvent.hasOwnProperty(eventName) ?
      this.storageEvent[eventName].push(callback) :
      this.storageEvent = {
        ...this.storageEvent,
        [eventName]: [(callback)]
      };
  }

  onDataChanged = (index: number, item: Object, senderId?: string) => {
    if (senderId && senderId !== this.getRefId) {
      if (this.masonry &&
        this.masonry.current &&
        isFunction(this.masonry.current.reRender) &&
        isFunction(this.masonry.current.addChildrenOnDataChangedFromOtherViewModel)) {
        this.updateCacheFromOtherViewModel(index, item);
        this.masonry.current.addChildrenOnDataChangedFromOtherViewModel(index, item);
        this.masonry.current.reRender();
      }
    }
  };

  updateCacheFromOtherViewModel(index, item) {
    const data = this.dataViewModel.getDataList;
    const newItemPos = parseInt(index) === 0 ?
      0 :
      this.itemCache.getPosition(data[index - 1].itemId) + this.itemCache.getHeight(data[index - 1].itemId);

    this.itemCache.updateIndexMap(index - 1, data);
    this.itemCache.updateItemOnMap(
      item.itemId,
      data.indexOf(item),
      this.itemCache.defaultHeight,
      newItemPos,
      false);
    this.itemCache.updateItemsMap(index - 1, data.length);
  }

  onLoadMoreTop = (fn) => {
    if (
      this.masonry &&
      this.masonry.current &&
      typeof fn === 'function') {
      this.masonry.current.onLoadMoreTop();
      fn();
    }
  };

  onLoadMoreBottom = (fn) => {
    if (
      this.masonry &&
      this.masonry.current &&
      typeof fn === 'function') {
      fn();
    }
  };

  scrollToSpecialItem(itemId) {
    if (this.masonry &&
      this.masonry.current) {
      if (!this.itemCache.hasItem(itemId)) {
        // Send a notification to outside.
        console.log('Dont have this item');
      } else {
        this.masonry.current.scrollToSpecialItem(itemId);
      }
    }
  }

  scrollToTop() {
    if (this.masonry &&
      this.masonry.current) {
      this.masonry.current.scrollToTop();
    }
  }

  scrollToBottom() {
    if (this.masonry &&
      this.masonry.current) {
      this.masonry.current.scrollToBottom();
    }
  }

  onRemoveItem(itemId) {
    if (
      this.masonry &&
      this.masonry.current
    ) {
      this.masonry.current.onRemoveItem(itemId);
      this.masonry.current.reRender();
    }
  }

  onAddItem(index, item) {
    if (
      this.masonry &&
      this.masonry.current &&
      !this.isIdAlready(item.itemId)
    ) {
      this.masonry.current.onAddItem(index, item);
      this.masonry.current.reRender();
    }
  }

  onUpdateItem(itemId, item) {
    if (this.masonry &&
      this.masonry.current &&
      this.isIdAlready(itemId)) {
      const itemIndex = this.masonry.current.itemCache.getIndex(itemId);
      if (itemIndex !== NOT_FOUND) {
        this.getDataList[itemIndex] = item;
        this.masonry.current.reRender();
      }
    }
  }

  isIdAlready(id: string): boolean {
    this.dataViewModel._isIdAlready(id);
  };

  addTop(item) {
    this.onAddItem(0, item);
  }

  addBottom(item) {
    this.onAddItem(this.getDataList.length, item);
  }

  _insertItem(index: number, item) {
    const data = this.dataViewModel.getDataList;
    const newItemPos = parseInt(index) === 0 ?
      0 :
      this.itemCache.getPosition(data[index - 1].itemId) + this.itemCache.getHeight(data[index - 1].itemId);

    this.dataViewModel.insertItem(index, item, this.getRefId);

    this.itemCache.updateIndexMap(index - 1, data);
    this.itemCache.updateItemOnMap(
      item.itemId,
      data.indexOf(item),
      this.itemCache.defaultHeight,
      newItemPos,
      false);
    this.itemCache.updateItemsMap(index - 1, data.length);
  }

  _deleteItem(itemId: string, deleteCount: number = 1) {
    const itemIndex = this.itemCache.getIndex(itemId);
    this.itemCache.updateItemHeight(itemId, 0);
    this._updateItemsPositionFromSpecifiedItem(itemId);
    this.dataViewModel.deleteItem(itemIndex, deleteCount);
    this.itemCache.deleteItem(itemIndex, itemId, this.dataViewModel.getDataList);
  }

  /**
   *  Calculate items' position from specified item to end the data list => reduces number of calculation
   */
  _updateItemsPositionFromSpecifiedItem(itemId: string) {
    const data = this.getDataList;
    const itemCache = this.getItemCache;

    if (!!data.length) {
      let currentItemId = itemId;
      const currentIndex = itemCache.getIndex(itemId);
      if (currentIndex !== NOT_FOUND) {
        // TODO: High cost
        for (let i = currentIndex; i < data.length; i++) {
          const currentItemPosition = itemCache.getPosition(currentItemId);
          let currentItemHeight = itemCache.getHeight(currentItemId);
          const followingItemId = this._getItemIdFromIndex(i + 1);
          if (followingItemId !== OUT_OF_RANGE) {
            itemCache.updateItemOnMap(
              followingItemId,
              itemCache.getIndex(followingItemId),
              itemCache.getHeight(followingItemId),
              currentItemPosition + currentItemHeight,
              itemCache.isRendered(followingItemId)
            );
            currentItemId = followingItemId;
          }
        }
      }
    }
  }

  /**
   *  Get itemId from index.
   *
   *  @param {number} index - Index of item.
   *
   *  @return {string} - itemId.
   *  @return {number} - OUT_OF_RANGE: if index out of range of data.
   */
  _getItemIdFromIndex(index: number): string {
    const data = this.getDataList;
    if (!!data.length) {
      if (index >= data.length || index < 0) return OUT_OF_RANGE;
      return this.getItemCache.getItemId(index);
    }
  }

  updateData(data) {
    if (this.masonry &&
      this.masonry.current) {
      this.clear();
      this.setData(data);
      this.masonry.current.initialize();
      this.masonry.current.reRender();
    }
  }

  appendStyle(el, animationNames) {
    if (this.masonry &&
      this.masonry.current) {
      this.masonry.current.appendStyle(el, animationNames);
    }
  }

  removeStyle(el, animationNames) {
    if (this.masonry &&
      this.masonry.current) {
      this.masonry.current.removeStyle(el, animationNames);
    }
  }

  enableLoadMoreTop() {
    if (Array.isArray(this.storageEvent['loadTop'])) {
      this.storageEvent['loadTop'].forEach((eventCallback) => {
        eventCallback();
      });
    }
  }

  enableLoadMoreBottom() {
    if (Array.isArray(this.storageEvent['loadBottom'])) {
      this.storageEvent['loadBottom'].forEach((eventCallback) => {
        eventCallback();
      });
    }
  }

  // region GET-SET
  get getRefId() {
    if (
      this.masonry &&
      this.masonry.current &&
      this.masonry.current.props) {
      return this.masonry.current.props.id;
    }
    return null;
  }

  get getDataList() {
    return this.dataViewModel.getDataList;
  }

  get getMasonry() {
    return this.masonry;
  }

  get getItemCache() {
    return this.itemCache;
  }

  setData(data) {
    this.dataViewModel = [];
    this.dataViewModel = data;
  }

  setMasonry(masonry) {
    this.masonry = masonry;
  }

  // endregion
}

export default MasonryViewModel;