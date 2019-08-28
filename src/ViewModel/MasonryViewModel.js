// @flow

import ItemCache from '../utils/ItemCache';
import { NOT_FOUND } from '../utils/value';
import isFunction from '../vendors/isFunction';

type EventTypes =
// Outside events listener
  'addItem' |
  'removeItem' |
  'onLoadTop' |
  'onLoadBottom' |
  'lookUpItemToScroll' |
  // View events listener
  'viewOnLoadMoreTop' |
  'viewOnLoadMore' |
  'viewReRender' |
  'viewZoomToItem' |
  'viewPendingScrollToSpecialItem' |
  'viewScrollToTopAtCurrentUI' |
  'viewScrollToBottomAtCurrentUI' |
  'viewScrollTo' |
  'viewOnRemoveItem' |
  'viewUpdateUIWhenScrollToItem' |
  'viewOnAddItem';

type Callback = (params: any) => any;

const ITEM_DEFAULT_HEIGHT = 200;


function createMasonryViewModel({data, defaultHeight}) {
  /* ========================================================================
   Inner variables declaration
   ======================================================================== */
  // Cache items for virtualized list
  const __itemCache__ = new ItemCache(_getCorrectDefaultHeight(defaultHeight));

  // Reflection `itemId` -> `item` - For purpose quick look-up
  const dataMap = new Map();

  // List itemId of before data. Be updated when data has updated.
  let oldItemsId = [];
  let numOfNewItems = 0;

  // Stores all be added events to dispatch a specialized callback
  let storageEvents = {};


  /* ========================================================================
   Initialize
   ======================================================================== */
  if (Array.isArray(data)) {
    data.forEach((item) => {
      dataMap.set(item.itemId, item);

      __itemCache__.updateItemOnMap(
        item.itemId,
        data.indexOf(item),
        __itemCache__.defaultHeight,
        0,
        false);
    });

    __itemCache__.updateIndexMap(0, data);
  }
  else {
    console.error(new TypeError('The data params must be an array', this));
  }


  /* ========================================================================
   [Public API] To be called by outside
   ======================================================================== */
  return Object.freeze({
    // Event listener
    addEventListener,
    removeEventListener,

    // Load more
    enableLoadMoreTop,
    enableLoadMoreBottom,
    onLoadMoreTop,
    onLoadMoreBottom,
    loadTop,
    loadBottom,

    // Scroll to
    scrollToSpecialItem,
    pendingScrollToSpecialItem,
    scrollToTopAtCurrentUI,
    scrollToBottomAtCurrentUI,
    scrollToTop,
    scrollToBottom,
    scrollTo,

    // CRUD
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    addTop,
    addBottom,

    // Interactive
    insertItem,
    insertItemWhenLoadMore,
    deleteItem,
    deleteItemsAt,

    // Update
    updateItemsPositionFromSpecifiedItem,
    updateData,

    // Get - Set
    getData,
    getDataMap,
    getOldItems,
    getCache,
    getNumOfNewItems,
    setNumOfNewItems,
  });


  /* ========================================================================
   Clear
   ======================================================================== */
  function _clearAll() {
    _clearItemCache();
    _clearData();
    _clearDataMap();
  }

  function _clearItemCache() {
    if (__itemCache__) {
      __itemCache__.clear();
    }
  }

  function _clearData() {
    if (data) {
      data = [];
    }
  }

  function _clearDataMap() {
    if (dataMap) {
      dataMap.clear();
    }
  }


  /* ========================================================================
   Events listener
   ======================================================================== */
  function addEventListener(eventName: EventTypes, callback: Callback) {
    storageEvents.hasOwnProperty(eventName) ?
      storageEvents[eventName].push(callback) :
      storageEvents = {
        ...storageEvents,
        [eventName]: [(callback)],
      };
  }

  function removeEventListener(eventName: EventTypes, callback: Callback) {
    if (storageEvents.hasOwnProperty(eventName) && Array.isArray(storageEvents[eventName])) {
      if (storageEvents[eventName].length === 1) {
        delete storageEvents[eventName];
      }
      else {
        storageEvents[eventName].forEach((eventCallback, index) => {
          if (eventCallback === callback) {
            storageEvents[eventName].splice(index, 1);
          }
        });
      }
    }
  }

  function enableLoadMoreTop() {
    if (Array.isArray(storageEvents['onLoadTop'])) {
      storageEvents['onLoadTop'].forEach((eventCallback) => {
        eventCallback();
      });
    }
  }

  function enableLoadMoreBottom() {
    if (Array.isArray(storageEvents['onLoadBottom'])) {
      storageEvents['onLoadBottom'].forEach((eventCallback) => {
        eventCallback();
      });
    }
  }


  /* ========================================================================
   TODO: Load more
   ======================================================================== */
  function onLoadMoreTop(onLoadMoreTopCallback: Function) {
    if (isFunction(onLoadMoreTopCallback)) {
      const firstItemId = data[0].itemId;
      if (isFunction(storageEvents['viewOnLoadMoreTop'][0])) {
        storageEvents['viewOnLoadMoreTop'][0]();
      }
      onLoadMoreTopCallback(firstItemId);
    }
  }

  function onLoadMoreBottom(onLoadMoreBottomCallback: Function) {
    if (isFunction(onLoadMoreBottomCallback)) {
      if (data.length > 0) {
        const lastItemId = data[data.length - 1].itemId;
        onLoadMoreBottomCallback(lastItemId);
      }
    }
  }

  function loadTop(item: Object) {
    if (item && !_hasAlreadyId(item.itemId)) {
      if (
        isFunction(storageEvents['viewOnLoadMore'][0]) &&
        isFunction(storageEvents['viewReRender'][0])
      ) {
        insertItemWhenLoadMore(0, item);
        storageEvents['viewOnLoadMore'][0](0, item);
        storageEvents['viewReRender'][0]();
      }
    }
  }

  function loadBottom(item: Object) {
    if (item && !_hasAlreadyId(item.itemId)) {
      if (
        isFunction(storageEvents['viewOnLoadMore'][0]) &&
        isFunction(storageEvents['viewReRender'][0])
      ) {
        insertItemWhenLoadMore(data.length, item);
        storageEvents['viewOnLoadMore'][0](data.length, item);
        storageEvents['viewReRender'][0]();
      }
    }
  }


  /* ========================================================================
   TODO: Scroll To
   ======================================================================== */
  function scrollToSpecialItem(itemId: string) {
    if (!_hasItem(itemId) ||
      __itemCache__.getIndex(itemId) === 0) {
      // Send a notification to outside.
      if (isFunction(storageEvents['lookUpItemToScroll'][0])) {
        storageEvents['lookUpItemToScroll'][0](itemId);
      }
    }
    else {
      if (isFunction(storageEvents['viewZoomToItem'][0])) {
        storageEvents['viewZoomToItem'][0](itemId);
      }
    }
  }

  function pendingScrollToSpecialItem(itemId: string, withAnim: boolean = true) {
    if (isFunction(storageEvents['viewPendingScrollToSpecialItem'][0])) {
      storageEvents['viewPendingScrollToSpecialItem'][0](numOfNewItems, itemId, withAnim);
    }
  }

  function scrollToTopAtCurrentUI() {
    if (isFunction(storageEvents['viewScrollToTopAtCurrentUI'][0])) {
      storageEvents['viewScrollToTopAtCurrentUI'][0]();
    }
  }

  function scrollToBottomAtCurrentUI() {
    if (isFunction(storageEvents['viewScrollToBottomAtCurrentUI'][0])) {
      storageEvents['viewScrollToBottomAtCurrentUI'][0]();
    }
  }

  function scrollToTop(firstItemId: string) {
    if (
      !_hasItem(firstItemId) &&
      isFunction(storageEvents['lookUpItemToScrollTop'][0])
    ) {
      // Send a notification to outside.
      storageEvents['lookUpItemToScrollTop'][0]();
    }
    else {
      if (isFunction(storageEvents['viewScrollToTopAtCurrentUI'][0])) {
        storageEvents['viewScrollToTopAtCurrentUI'][0]();
      }
    }
  }

  function scrollToBottom(lastItemId: string) {
    if (!_hasItem(lastItemId)) {
      // Send a notification to outside.
      if (isFunction(storageEvents['lookUpItemToScrollBottom'][0])) {
        storageEvents['lookUpItemToScrollBottom'][0]();
      }
    }
    else {
      if (isFunction(storageEvents['viewScrollToBottomAtCurrentUI'][0])) {
        storageEvents['viewScrollToBottomAtCurrentUI'][0]();
      }
    }
  }

  function scrollTo(index: number) {
    if (
      _isValidIndex(index) &&
      isFunction(storageEvents['viewScrollTo'][0])
    ) {
      storageEvents['viewScrollTo'][0](index);
    }
  }


  /* ========================================================================
   [Public API] - Interact with list
   ======================================================================== */
  function onAddItem(index: number, item: Object) {
    if (
      isFunction(storageEvents['viewOnAddItem'][0]) &&
      isFunction(storageEvents['viewReRender'][0]) &&
      item &&
      !_hasAlreadyId(item.itemId)
    ) {
      insertItem(index, item);
      storageEvents['viewOnAddItem'][0](index, item);
      storageEvents['viewReRender'][0]();
    }
  }

  function onAddItems(startIndex: number, items: Array) {

  }

  function onRemoveItem(itemId: string) {
    if (
      _hasAlreadyId(itemId) &&
      isFunction(storageEvents['viewOnRemoveItem'][0]) &&
      isFunction(storageEvents['viewReRender'][0])
    ) {
      const iIndex = __itemCache__.getIndex(itemId);
      const iHeight = __itemCache__.getHeight(itemId);
      const iPosition = __itemCache__.getPosition(itemId);
      deleteItem(itemId);

      storageEvents['viewOnRemoveItem'][0]({
        itemId,
        iIndex,
        iHeight,
        iPosition
      });
      storageEvents['viewReRender'][0]();
    }
  }

  function onUpdateItem(itemId: string, item: Object) {
    if (_hasAlreadyId(itemId)) {
      const itemIndex = __itemCache__.getIndex(itemId);
      if (itemIndex !== NOT_FOUND) {
        data[itemIndex] = item;
        if (isFunction(storageEvents['viewReRender'][0])) {
          storageEvents['viewReRender'][0]();
        }
      }
    }
  }

  function addTop(item: Object) {
    onAddItem(0, item);
  }

  function addBottom(item: Object) {
    onAddItem(data.length, item);
  }


  /* ========================================================================
   Interaction with list data & cache
   ======================================================================== */
  function insertItem(index: number, item: Object) {
    const newItemPos = parseInt(index) === 0 ?
      0 :
      __itemCache__.getPosition(data[index - 1].itemId) + __itemCache__.getHeight(data[index - 1].itemId);

    // Insert item on Data on list
    if (
      Array.isArray(data) &&
      _isValidIndex(index) &&
      item &&
      !_hasAlreadyId(item.itemId)
    ) {
      data.splice(index, 0, item);
      dataMap.set(item.itemId, item);
    }

    // Insert item on itemCache
    __itemCache__.updateIndexMap(index - 1, data);
    __itemCache__.updateItemOnMap(
      item.itemId,
      data.indexOf(item),
      __itemCache__.getDefaultHeight,
      newItemPos,
      false);
    __itemCache__.updateItemsMap(index - 1, data.length);

    // Get before & after itemId of newest added item.
    const {beforeItem, afterItem} = _getItemBeforeAndAfterByIndex(index);

    // notify to outside to add new item.
    if (isFunction(storageEvents['addItem'][0])) {
      storageEvents['addItem'][0](item, beforeItem, afterItem);
    }
  }

  function insertItemWhenLoadMore(index: number, item: Object) {
    const newItemPos = parseInt(index) === 0 ?
      0 :
      __itemCache__.getPosition(data[index - 1].itemId) + __itemCache__.getHeight(data[index - 1].itemId);

    // Insert item on Data on list
    if (
      Array.isArray(data) &&
      _isValidIndex(index) &&
      item &&
      !_hasAlreadyId(item.itemId)
    ) {
      data.splice(index, 0, item);
      dataMap.set(item.itemId, item);
    }

    // Insert item on itemCache
    __itemCache__.updateIndexMap(index - 1, data);
    __itemCache__.updateItemOnMap(
      item.itemId,
      data.indexOf(item),
      __itemCache__.getDefaultHeight,
      newItemPos,
      false);
    __itemCache__.updateItemsMap(index - 1, data.length);
  }

  function deleteItem(itemId: string, deleteCount: number = 1) {
    const itemIndex = __itemCache__.getIndex(itemId);

    // Get before & after itemId of `be deleted item`.
    const {beforeItem, afterItem} = _getItemBeforeAndAfterByIndex(itemIndex);

    // Set height of `be deleted item` equals 0
    __itemCache__.updateItemHeight(itemId, 0);

    // Update under items' position
    updateItemsPositionFromSpecifiedItem(itemId);

    // Delete item on dataOnList - dataMap
    if (
      Array.isArray(data) &&
      _isValidIndex(itemIndex)
    ) {
      for (let i = itemIndex; i < itemIndex + deleteCount; i++) {
        dataMap.delete(data[i].itemId);
      }
      data.splice(itemIndex, deleteCount);
    }

    // Delete item in itemCache
    __itemCache__.deleteItem(itemIndex, itemId, data);

    // notify to outside to remove item.
    if (isFunction(storageEvents['removeItem'][0])) {
      storageEvents['removeItem'][0](itemId, beforeItem, afterItem);
    }
  }

  function deleteItemsAt(index: number, deleteCount: number = 1) {
    let startIndex = _getValidStartIndex(index);
    if (startIndex === data.length) {
      startIndex = data.length - 1;
    }
    const storeStartIndex = startIndex;

    let willDeleteItems = [];

    // Get before & after itemId of `be deleted item`.
    const {beforeItem, afterItem} = _getItemBeforeAndAfterByIndex(startIndex);

    // Delete items on dataOnList - dataMap
    if (
      Array.isArray(data) &&
      _isValidIndex(startIndex)
    ) {
      for (let i = 0; i < deleteCount; i++) {
        if (startIndex < data.length && data[startIndex]) {
          const itemId = data[startIndex].itemId;
          if (itemId && _hasItem(itemId)) {
            willDeleteItems.push(itemId);
            dataMap.delete(data[startIndex].itemId);
            __itemCache__.getIndexMap.delete(startIndex);
          }
        }
        startIndex++;
      }

      data.splice(storeStartIndex, deleteCount);

      __itemCache__.updateIndexMap(storeStartIndex, data);

      for (let i = 0; i < willDeleteItems.length; i++) {
        __itemCache__.getIndexMap.delete(data.length + i);
        __itemCache__.getItemsMap.delete(willDeleteItems[i]);
      }

      let aboveItemId = undefined;
      if (storeStartIndex - 1 < 0) {
        aboveItemId = __itemCache__.getItemId(0);
      }
      else {
        aboveItemId = __itemCache__.getItemId(storeStartIndex - 1);
      }

      __itemCache__.updateItemsMap(storeStartIndex - 1,data.length);
      updateItemsPositionFromSpecifiedItem(aboveItemId);
    }

    // notify to outside to remove item.
    if (
      storageEvents['removeItems'] &&
      isFunction(storageEvents['removeItems'][0])) {
      storageEvents['removeItems'][0](willDeleteItems, beforeItem, afterItem);
    }
  }


  /* ========================================================================
   Update data & cache
   ======================================================================== */
  /**
   *  Calculate items' position from specified item to end the dataOnList list => reduces number of calculation
   */
  function updateItemsPositionFromSpecifiedItem(itemId: string) {
    if (!!data.length) {
      let currentItemId = itemId;
      const currentIndex = __itemCache__.getIndex(itemId);

      if (currentIndex !== NOT_FOUND) {
        for (let i = currentIndex; i < data.length; i++) {
          if (i === data.length - 1) {
            break;
          }

          const currentItemPosition = __itemCache__.getPosition(currentItemId);
          const currentItemHeight = __itemCache__.getHeight(currentItemId);
          const followingItemId = __itemCache__.getItemId(i + 1);

          if (currentItemPosition === NOT_FOUND) {
            console.log(`Could not get position of: ${currentItemId}`);
          }
          else if (currentItemHeight === NOT_FOUND) {
            console.log(`Could not get height of: ${currentItemId}`);
          }
          else if (followingItemId !== NOT_FOUND) {
            __itemCache__.updateItemOnMap(
              followingItemId,
              __itemCache__.getIndex(followingItemId),
              __itemCache__.getHeight(followingItemId),
              currentItemPosition + currentItemHeight,
              __itemCache__.isRendered(followingItemId),
            );
            currentItemId = followingItemId;
          }
        }
      }
    }
  }

  function _updateCache() {
    if (Array.isArray(data)) {
      data.forEach((item) => {
        dataMap.set(item.itemId, item);

        if (__itemCache__.hasItem(item.itemId)) {
          __itemCache__.updateItemOnMap(
            item.itemId,
            data.indexOf(item),
            __itemCache__.getHeight(item.itemId),
            0,
            true);
        }
        else {
          __itemCache__.updateItemOnMap(
            item.itemId,
            data.indexOf(item),
            __itemCache__.defaultHeight,
            0,
            false);
        }

        if (!oldItemsId.includes(item.itemId)) {
          numOfNewItems++;
        }
      });
      __itemCache__.getIndexMap.clear();
      __itemCache__.updateIndexMap(0, data);

      // Remove redundant items in cache;
      for (let i = 0; i <= oldItemsId.length - 1; i++) {
        if (!dataMap.has(oldItemsId[i])) {
          __itemCache__.getItemsMap.delete(oldItemsId[i]);
        }
      }

      updateItemsPositionFromSpecifiedItem(data[0].itemId);
    }
  }

  function updateData(newData: Array) {
    _updateOldDataIds();
    _clearData();
    _clearDataMap();
    data = newData;
    numOfNewItems = 0;
    _updateCache();

    if (isFunction(storageEvents['viewUpdateUIWhenScrollToItem'][0])) {
      storageEvents['viewUpdateUIWhenScrollToItem'][0]();
      //this.masonry.current.updateUIWhenScrollToItem();
    }
  }

  function _updateOldDataIds() {
    oldItemsId = [];
    for (let key of dataMap.keys()) {
      oldItemsId.push(key);
    }
  }


  /* ========================================================================
   Checkers
   ======================================================================== */
  function _hasAlreadyId(id: string): boolean {
    return dataMap.has(id);
  }

  function _isValidIndex(index: number, dataLength: number = data.length): boolean {
    const rsIndex = parseInt(index);
    return (
      typeof rsIndex === 'number' &&
      !isNaN(rsIndex) &&
      rsIndex <= dataLength &&
      rsIndex >= 0
    );
  }

  function _hasItem(itemId: string): boolean {
    return dataMap.has(itemId);
  }


  /* ========================================================================
   Supporters
   ======================================================================== */
  function _getCorrectDefaultHeight(defaultHeight: number) {
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

  function _getItemBeforeAndAfterByIndex(itemIndex: number) {
    let bItemId = __itemCache__.getItemId(itemIndex - 1);
    let aItemId = __itemCache__.getItemId(itemIndex + 1);

    let beforeItem = bItemId !== NOT_FOUND ?
      dataMap.get(bItemId) :
      null;
    let afterItem = aItemId !== NOT_FOUND ?
      dataMap.get(aItemId) :
      null;

    return {
      beforeItem,
      afterItem,
    };
  }


  /* ========================================================================
   Get - Set
   ======================================================================== */
  function getData() {
    return Object.freeze([...data]);
  }

  function getDataMap() {
    return dataMap;
  }

  function getOldItems() {
    return oldItemsId;
  }

  function getCache() {
    return Object.freeze(__itemCache__);
  }

  function getNumOfNewItems() {
    return Object.freeze(numOfNewItems);
  }

  function setNumOfNewItems(newValue: number) {
    numOfNewItems = newValue;
  }
}

export default createMasonryViewModel;