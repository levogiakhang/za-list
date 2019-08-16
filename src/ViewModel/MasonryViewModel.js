import {
  NOT_FOUND,
} from '../utils/value';
import isFunction from '../vendors/isFunction';

type EventTypes =
  'addItem' |
  'removeItem' |
  'loadTop' |
  'loadBottom' |
  'lookUpItemToScroll';
type Callback = (params: any) => any;

class MasonryViewModel {
  constructor({dataOnList, node, itemCache}) {
    this.dataOnList = dataOnList;
    this.masonry = node;
    this.itemCache = itemCache;

    // Reflection `itemId` -> `item` - For purpose quick look-up
    this.dataMap = new Map();

    this.oldItemIds = [];

    this.numUnrenderedItems = 0;

    // stores storageEvent handler
    this.storageEvent = {};

    this.scrollToSpecialItem = this.scrollToSpecialItem.bind(this);
    this.scrollToTop = this.scrollToTop.bind(this);
    this.scrollToBottomAtCurrentUI = this.scrollToBottomAtCurrentUI.bind(this);
    this.onRemoveItem = this.onRemoveItem.bind(this);
    this.onAddItem = this.onAddItem.bind(this);
    this.onUpdateItem = this.onUpdateItem.bind(this);
    this.resetNumUnrenderedItems = this.resetNumUnrenderedItems.bind(this);

    this.initialize();
  }


  /* ========================================================================
   Init & Clear
   ======================================================================== */
  initialize() {
    if (Array.isArray(this.dataOnList)) {
      this.dataOnList.forEach((item) => {
        this.oldItemIds.push(item.itemId);
        this.dataMap.set(item.itemId, item);
        this.itemCache.updateItemOnMap(
          item.itemId,
          this.dataOnList.indexOf(item),
          this.itemCache.defaultHeight,
          0,
          false);
      });
      this.itemCache.updateIndexMap(0, this.dataOnList);
    }
    else {
      console.error('The initialized dataOnList is NOT an array');
    }
  }

  clearAll() {
    this.clearItemCache();
    this.clearData();
  }

  clearItemCache() {
    if (this.itemCache) {
      this.itemCache.clear();
    }
  }

  clearData() {
    if (this.dataOnList) {
      this.dataOnList = [];
    }
    if(this.dataMap) {
      this.dataMap.clear();
    }
  }

  /* ========================================================================
   Events listener
   ======================================================================== */
  addEventListener(eventName: EventTypes, callback: Callback) {
    this.storageEvent.hasOwnProperty(eventName) ?
      this.storageEvent[eventName].push(callback) :
      this.storageEvent = {
        ...this.storageEvent,
        [eventName]: [(callback)],
      };
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


  /* ========================================================================
   Load more
   ======================================================================== */
  onLoadMoreTop = (fn) => {
    if (
      this.masonry &&
      this.masonry.current &&
      isFunction(fn)) {
      this.masonry.current.onLoadMoreTop();
      fn();
    }
  };

  onLoadMoreBottom = (fn) => {
    if (
      this.masonry &&
      this.masonry.current &&
      isFunction(fn)) {
      fn();
    }
  };


  /* ========================================================================
   [Public API] - Scroll To
   ======================================================================== */
  scrollToSpecialItem(itemId) {
    if (this.masonry &&
      this.masonry.current) {
      if (!this.hasItem(itemId)) {
        // Send a notification to outside.
        this.storageEvent['lookUpItemToScroll'][0](itemId);
      }
      else {
        this.masonry.current.scrollToSpecialItem(itemId);
      }
    }
  }

  pendingScrollToSpecialItem(numOfItems: number, itemId: string) {
    if (this.masonry &&
      this.masonry.current) {
      this.masonry.current.pendingScrollToSpecialItem(numOfItems, itemId);
    }
  }

  scrollToTopAtCurrentUI() {
    if (this.masonry &&
      this.masonry.current) {
      this.masonry.current.scrollToTopAtCurrentUI();
    }
  }

  scrollToBottomAtCurrentUI() {
    if (this.masonry &&
      this.masonry.current) {
      this.masonry.current.scrollToBottomAtCurrentUI();
    }
  }


  /* ========================================================================
   [Public API] - Interact with list
   ======================================================================== */
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
      const itemIndex = this.itemCache.getIndex(itemId);
      if (itemIndex !== NOT_FOUND) {
        this.dataOnList[itemIndex] = item;
        this.masonry.current.reRender();
      }
    }
  }

  addTop(item) {
    this.onAddItem(0, item);
  }

  addBottom(item) {
    this.onAddItem(this.dataOnList.length, item);
  }


  /* ========================================================================
   Interaction with list data & cache
   ======================================================================== */
  _insertItem(index: number, item) {
    const newItemPos = parseInt(index) === 0 ?
      0 :
      this.itemCache.getPosition(this.dataOnList[index - 1].itemId) + this.itemCache.getHeight(this.dataOnList[index - 1].itemId);

    // Insert item on Data on list
    if (
      Array.isArray(this.dataOnList) &&
      this.isValidIndex(index) &&
      !this.isIdAlready(item.itemId)
    ) {
      this.dataOnList.splice(index, 0, item);
      this.dataMap.set(item.itemId, item);
      this.oldItemIds.splice(index, 0, item.itemId);
    }

    // Insert item on itemCache
    this.itemCache.updateIndexMap(index - 1, this.dataOnList);
    this.itemCache.updateItemOnMap(
      item.itemId,
      this.dataOnList.indexOf(item),
      this.itemCache.defaultHeight,
      newItemPos,
      false);
    this.itemCache.updateItemsMap(index - 1, this.dataOnList.length);

    // Get before & after itemId of newest added item.
    const {beforeItemId, afterItemId} = this.getItemIdBeforeAndAfterByIndex(index);

    // notify to outside to add new item.
    this.storageEvent['addItem'][0](item, beforeItemId, afterItemId);
  }

  _deleteItem(itemId: string, deleteCount: number = 1) {
    const itemIndex = this.itemCache.getIndex(itemId);

    // Get before & after itemId of `be deleted item`.
    const {beforeItemId, afterItemId} = this.getItemIdBeforeAndAfterByIndex(itemIndex);

    // Set height of `be deleted item` equals 0
    this.itemCache.updateItemHeight(itemId, 0);

    // Update under items' position
    this._updateItemsPositionFromSpecifiedItem(itemId);

    // Delete item on dataOnList - dataMap
    if (
      Array.isArray(this.dataOnList) &&
      this.isValidIndex(itemIndex)
    ) {
      for (let i = itemIndex; i < itemIndex + deleteCount; i++) {
        this.dataMap.delete(this.dataOnList[i].itemId);
      }
      this.dataOnList.splice(itemIndex, deleteCount);
      this.oldItemIds.splice(itemIndex, deleteCount);
    }

    // Delete item in itemCache
    this.itemCache.deleteItem(itemIndex, itemId, this.dataOnList);

    // notify to outside to remove item.
    this.storageEvent['removeItem'][0](itemId, beforeItemId, afterItemId);
  }


  /* ========================================================================
   Update data & cache
   ======================================================================== */
  /**
   *  Calculate items' position from specified item to end the dataOnList list => reduces number of calculation
   */
  _updateItemsPositionFromSpecifiedItem(itemId: string) {
    if (!!this.dataOnList.length) {
      let currentItemId = itemId;
      const currentIndex = this.itemCache.getIndex(itemId);
      if (currentIndex !== NOT_FOUND) {
        // TODO: High cost
        for (let i = currentIndex; i < this.dataOnList.length; i++) {
          const currentItemPosition = this.itemCache.getPosition(currentItemId);
          let currentItemHeight = this.itemCache.getHeight(currentItemId);
          const followingItemId = this.itemCache.getItemId(i + 1);
          if (followingItemId !== NOT_FOUND) {
            this.itemCache.updateItemOnMap(
              followingItemId,
              this.itemCache.getIndex(followingItemId),
              this.itemCache.getHeight(followingItemId),
              currentItemPosition + currentItemHeight,
              this.itemCache.isRendered(followingItemId),
            );
            currentItemId = followingItemId;
          }
        }
      }
    }
  }

  updateCache() {
    if (Array.isArray(this.dataOnList)) {
      const newItemIds = [];

      this.dataOnList.forEach((item) => {
        newItemIds.push(item.itemId);
        this.dataMap.set(item.itemId, item);
        if (this.itemCache.hasItem(item.itemId)) {
          this.itemCache.updateItemOnMap(
            item.itemId,
            this.dataOnList.indexOf(item),
            this.itemCache.getHeight(item.itemId),
            0,
            true);
        }
        else {
          this.numUnrenderedItems++;
          this.itemCache.updateItemOnMap(
            item.itemId,
            this.dataOnList.indexOf(item),
            this.itemCache.defaultHeight,
            0,
            false);
        }
      });
      this.itemCache.getIndexMap.clear();
      this.itemCache.updateIndexMap(0, this.dataOnList);

      // Remove redundant items in cache;
      for (let i = 0; i <= this.oldItemIds.length - 1; i++) {
        if (!newItemIds.includes(this.oldItemIds[i])) {
          this.itemCache.getItemsMap.delete(this.oldItemIds[i]);
        }
      }

      this._updateItemsPositionFromSpecifiedItem(newItemIds[0]);
      this.oldItemIds = JSON.parse(JSON.stringify(newItemIds));
    }
    else {
      console.error('The initialized dataOnList is NOT an array');
    }
  }

  updateData(data) {
    this.clearData();
    this.dataOnList = data;
    this.updateCache();

    if (this.masonry &&
      this.masonry.current) {
      this.masonry.current.initialize();
      this.masonry.current.reRender();
    }
  }


  /* ========================================================================
   Add | Remove Style
   ======================================================================== */
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


  /* ========================================================================
   Checkers
   ======================================================================== */
  isIdAlready(id: string): boolean {
    return this.dataMap.has(id);
  };

  isValidIndex(index: number, dataLength: number = this.dataOnList.length): boolean {
    const rsIndex = parseInt(index);
    return (
      typeof rsIndex === 'number' &&
      rsIndex <= dataLength &&
      rsIndex >= 0
    );
  }

  hasItem(itemId: string): boolean {
    return this.dataMap.has(itemId);
  }


  /* ========================================================================
   Supporters
   ======================================================================== */
  getItemIdBeforeAndAfterByIndex(itemIndex: string) {
    let beforeItemId = this.itemCache.getItemId(itemIndex - 1);
    let afterItemId = this.itemCache.getItemId(itemIndex + 1);

    if (beforeItemId === NOT_FOUND) {
      beforeItemId = null;
    }
    if (afterItemId === NOT_FOUND) {
      afterItemId = null;
    }

    return {
      beforeItemId,
      afterItemId,
    };
  }

  resetNumUnrenderedItems() {
    this.numUnrenderedItems = 0;
  }

  /* ========================================================================
   Get - Set
   ======================================================================== */

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

  get getNumUnrenderedItems() {
    return this.numUnrenderedItems;
  }

  get getDataOnList() {
    return this.dataOnList;
  }

  get getMasonry() {
    return this.masonry;
  }

  get getItemCache() {
    return this.itemCache;
  }

  setMasonry(masonry) {
    this.masonry = masonry;
  }

  // endregion
}

export default MasonryViewModel;