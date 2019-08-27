import {
  NOT_FOUND,
} from '../utils/value';
import isFunction from '../vendors/isFunction';
import ItemCache from '../utils/ItemCache';

type EventTypes =
  'addItem' |
  'removeItem' |
  'loadTop' |
  'loadBottom' |
  'lookUpItemToScroll';
type Callback = (params: any) => any;

const ITEM_DEFAULT_HEIGHT = 200;

class OldMasonryViewModel {
  constructor({dataOnList, node, defaultHeight}) {
    this.dataOnList = dataOnList;
    this.masonry = node;

    this.itemCache = new ItemCache(OldMasonryViewModel.getCorrectDefaultHeight(defaultHeight));

    // Reflection `itemId` -> `item` - For purpose quick look-up
    this.dataMap = new Map();

    this.oldItemIds = [];

    this.numItemsNeedRender = 0;

    // stores storageEvent handler
    this.storageEvent = {};

    this.scrollToSpecialItem = this.scrollToSpecialItem.bind(this);
    this.scrollToTopAtCurrentUI = this.scrollToTopAtCurrentUI.bind(this);
    this.scrollToBottomAtCurrentUI = this.scrollToBottomAtCurrentUI.bind(this);
    this.scrollToTop = this.scrollToTop.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);
    this.onRemoveItem = this.onRemoveItem.bind(this);
    this.onAddItem = this.onAddItem.bind(this);
    this.onUpdateItem = this.onUpdateItem.bind(this);
    this.loadTop = this.loadTop.bind(this);
    this.loadBottom = this.loadBottom.bind(this);
    this.scrollTo = this.scrollTo.bind(this);

    this.initialize();
  }


  /* ========================================================================
   Init & Clear
   ======================================================================== */
  initialize() {
    if (Array.isArray(this.dataOnList)) {
      this.dataOnList.forEach((item) => {
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
    if (this.dataMap) {
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
      const firstItemId = this.dataOnList[0].itemId;
      this.masonry.current.onLoadMoreTop();
      fn(firstItemId);
    }
  };

  onLoadMoreBottom = (fn) => {
    if (
      this.masonry &&
      this.masonry.current &&
      isFunction(fn)) {
      if (this.dataOnList.length > 0) {
        const lastItemId = this.dataOnList[this.dataOnList.length - 1].itemId;
        fn(lastItemId);
      }
    }
  };

  loadTop(item) {
    if (
      this.masonry &&
      this.masonry.current &&
      item &&
      !this.isIdAlready(item.itemId)
    ) {
      this.masonry.current.onLoadMore(0, item);
      this.masonry.current.reRender();
    }
  }

  loadBottom(item) {
    if (
      this.masonry &&
      this.masonry.current &&
      item &&
      !this.isIdAlready(item.itemId)
    ) {
      this.masonry.current.onLoadMore(this.dataOnList.length, item);
      this.masonry.current.reRender();
    }
  }


  /* ========================================================================
   [Public API] - Scroll To
   ======================================================================== */
  scrollToSpecialItem(itemId) {
    if (this.masonry &&
      this.masonry.current) {
      if (!this.hasItem(itemId) ||
        this.itemCache.getIndex(itemId) === 0) {
        // Send a notification to outside.
        this.storageEvent['lookUpItemToScroll'][0](itemId);
      }
      else {
        this.masonry.current.zoomToItem(itemId);
      }
    }
  }

  pendingScrollToSpecialItem(itemId: string, withAnim: boolean = true) {
    if (this.masonry &&
      this.masonry.current) {
      this.masonry.current.pendingScrollToSpecialItem(this.numItemsNeedRender, itemId, withAnim);
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

  scrollToTop(firstItemId) {
    if (!this.hasItem(firstItemId)) {
      // Send a notification to outside.
      this.storageEvent['lookUpItemToScrollTop'][0]();
    }
    else {
      if (this.masonry &&
        this.masonry.current) {
        this.masonry.current.scrollToTopAtCurrentUI();
      }
    }
  }

  scrollToBottom(lastItemId) {
    if (!this.hasItem(lastItemId)) {
      // Send a notification to outside.
      this.storageEvent['lookUpItemToScrollBottom'][0]();
    }
    else {
      if (this.masonry &&
        this.masonry.current) {
        this.masonry.current.scrollToBottomAtCurrentUI();
      }
    }
  }

  scrollTo(index: number) {
    if (
      this.isValidIndex(index) &&
      this.masonry &&
      this.masonry.current
    ) {
      this.masonry.current.scrollTo(index);
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
      item &&
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
      item &&
      !this.isIdAlready(item.itemId)
    ) {
      this.dataOnList.splice(index, 0, item);
      this.dataMap.set(item.itemId, item);
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

  insertItemWhenLoadMore(index: number, item: Object) {
    const newItemPos = parseInt(index) === 0 ?
      0 :
      this.itemCache.getPosition(this.dataOnList[index - 1].itemId) + this.itemCache.getHeight(this.dataOnList[index - 1].itemId);

    // Insert item on Data on list
    if (
      Array.isArray(this.dataOnList) &&
      this.isValidIndex(index) &&
      item &&
      !this.isIdAlready(item.itemId)
    ) {
      this.dataOnList.splice(index, 0, item);
      this.dataMap.set(item.itemId, item);
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
      this.dataOnList.forEach((item) => {
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
          this.itemCache.updateItemOnMap(
            item.itemId,
            this.dataOnList.indexOf(item),
            this.itemCache.defaultHeight,
            0,
            false);
        }

        if (!this.oldItemIds.includes(item.itemId)) {
          this.numItemsNeedRender++;
        }
      });
      this.itemCache.getIndexMap.clear();
      this.itemCache.updateIndexMap(0, this.dataOnList);

      // Remove redundant items in cache;
      for (let i = 0; i <= this.oldItemIds.length - 1; i++) {
        if (!this.dataMap.has(this.oldItemIds[i])) {
          this.itemCache.getItemsMap.delete(this.oldItemIds[i]);
        }
      }

      this._updateItemsPositionFromSpecifiedItem(this.dataOnList[0].itemId);
    }
    else {
      console.error('The initialized dataOnList is NOT an array');
    }
  }

  updateData(data) {
    this._updateOldDataIds();
    this.clearData();
    this.dataOnList = data;
    this.numItemsNeedRender = 0;
    this.updateCache();

    if (this.masonry &&
      this.masonry.current) {
      this.masonry.current.updateUIWhenScrollToItem();
    }
  }

  _updateOldDataIds = () => {
    this.oldItemIds = [];
    for (let key of this.dataMap.keys()) {
      this.oldItemIds.push(key);
    }
  };

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

  static getCorrectDefaultHeight(defaultHeight) {
    let _defaultHeight = undefined;

    if (typeof defaultHeight === 'number') {
      _defaultHeight = defaultHeight;
    }
    else if (typeof defaultHeight === 'string') {
      _defaultHeight = parseInt(defaultHeight);
      if (isNaN(_defaultHeight)) {
        _defaultHeight = ITEM_DEFAULT_HEIGHT;
      }
    }
    else {
      _defaultHeight = ITEM_DEFAULT_HEIGHT;
    }

    return _defaultHeight;
  }

  /* ========================================================================
   Get - Set
   ======================================================================== */

  // region GET-SET
  get getOldDataIds() {
    return this.oldItemIds;
  }

  get getRefId() {
    if (
      this.masonry &&
      this.masonry.current &&
      this.masonry.current.props) {
      return this.masonry.current.props.id;
    }
    return null;
  }

  get getNumItemsNeedRender() {
    return this.numItemsNeedRender;
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

export default OldMasonryViewModel;