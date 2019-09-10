// @flow

import ItemCache from '../utils/ItemCache';
import { NOT_FOUND } from '../utils/value';
import isFunction from '../vendors/isFunction';

type EventTypes =
/* ========================================================================
 Outer events listener
 ======================================================================== */
// Load
  'loadTopStart' |
  'loadBottomStart' |
  'onLoadTop' |
  'onLoadBottom' |
  'loadTopEnd' |
  'loadBottomEnd' |

  // Add
  'addItemsStart' |
  'onAddItemsSucceed' |
  'onAddItemsFail' |

  // Remove
  'removeItemsStart' |
  'onRemoveItemsByIdSucceed' |
  'onRemoveItemsByIdFail' |
  'onRemoveItemsAtSucceed' |
  'onRemoveItemsAtFail' |

  // Scroll
  'onLookForItemToScroll' |
  'onLookForItemToScrollTop' |
  'onLookForItemToScrollBottom' |

  /* ========================================================================
   Inner UI events listener
   ======================================================================== */
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
  'viewOnAddItem' |
  'viewOnAddItems';

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

  /* Store this itemId when number delete count equals data length
   leads to error when get first & last data to load more.  */
  let remainderItem = undefined;

  // Stores all be added events to dispatch a specialized callback
  let storageEvents = {};


  /* ========================================================================
   Initialize
   ======================================================================== */
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      if (item && item.itemId) {
        dataMap.set(item.itemId, item);

        __itemCache__.updateItemOnMap(
          item.itemId,
          data.indexOf(item),
          __itemCache__.defaultHeight,
          index * __itemCache__.getDefaultHeight,
          false);
      }
    });

    __itemCache__.updateIndexMap(0, data);
  }
  else {
    data = [];
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
    enableLoadTop,
    enableLoadBottom,
    onLoadTop,
    onLoadBottom,
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
    onAddItems,
    onRemoveItemsById,
    onRemoveItemsAt,
    onUpdateItem,
    addTop,
    addBottom,

    // Update
    updateItemsPositionFromSpecifiedItem,
    updateData,
    reRenderUI,

    // Get - Set
    getData,
    getDataUnfreeze,
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

  function enableLoadTop() {
    if (Array.isArray(storageEvents['loadTopStart'])) {
      storageEvents['loadTopStart'].forEach((eventCallback) => {
        eventCallback();
      });
    }
  }

  function enableLoadBottom() {
    if (Array.isArray(storageEvents['loadBottomStart'])) {
      storageEvents['loadBottomStart'].forEach((eventCallback) => {
        eventCallback();
      });
    }
  }


  /* ========================================================================
   TODO: Load more
   ======================================================================== */
  function onLoadTop(onLoadMoreTopCallback: Function) {
    if (
      isFunction(onLoadMoreTopCallback) &&
      data &&
      data[0] &&
      data[0].itemId
    ) {
      const firstItemId = data.length !== 0 ?
        data[0].itemId :
        remainderItem;

      if (
        storageEvents['viewOnLoadMoreTop'] &&
        isFunction(storageEvents['viewOnLoadMoreTop'][0])
      ) {
        storageEvents['viewOnLoadMoreTop'][0]();
      }

      if (storageEvents['onLoadTop'] && isFunction(storageEvents['onLoadTop'][0])) {
        storageEvents['onLoadTop'][0]();
      }

      onLoadMoreTopCallback(firstItemId);
    }
  }

  function onLoadBottom(onLoadBottomCallback: Function) {
    if (
      isFunction(onLoadBottomCallback) &&
      data &&
      data[0] &&
      data[0].itemId
    ) {
      const lastItemId = data.length > 0 ?
        data[data.length - 1].itemId :
        remainderItem;

      if (storageEvents['onLoadBottom'] && isFunction(storageEvents['onLoadBottom'][0])) {
        storageEvents['onLoadBottom'][0]();
      }

      onLoadBottomCallback(lastItemId);
    }
  }

  function loadTop(items: Array) {
    if (items) {
      if (!Array.isArray(items)) {
        items = _convertToArray(items);
      }

      const insertResult = _insertItems(0, items);
      if (insertResult.hasInsertSucceed) {
        if (
          storageEvents['viewOnLoadMore'] &&
          isFunction(storageEvents['viewOnLoadMore'][0])
        ) {
          storageEvents['viewOnLoadMore'][0](0, items);
          reRenderUI();
        }

        // Notify to outside when load top end.
        if (
          storageEvents['loadTopEnd'] &&
          isFunction(storageEvents['loadTopEnd'][0])
        ) {
          storageEvents['loadTopEnd'][0]();
        }
      }
    }
  }

  function loadBottom(items: Array) {
    if (items && data) {
      if (!Array.isArray(items)) {
        items = _convertToArray(items);
      }

      const insertResult = _insertItems(data.length, items);
      if (insertResult.hasInsertSucceed) {
        if (
          storageEvents['viewOnLoadMore'] &&
          isFunction(storageEvents['viewOnLoadMore'][0])
        ) {
          storageEvents['viewOnLoadMore'][0](data.length, items);
          reRenderUI();
        }

        // Notify to outside when load bottom end.
        if (
          storageEvents['loadBottomEnd'] &&
          isFunction(storageEvents['loadBottomEnd'][0])
        ) {
          storageEvents['loadBottomEnd'][0]();
        }
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
      if (
        storageEvents['onLookForItemToScroll'] &&
        isFunction(storageEvents['onLookForItemToScroll'][0])
      ) {
        storageEvents['onLookForItemToScroll'][0](itemId);
      }
    }
    else {
      if (
        storageEvents['viewZoomToItem'] &&
        isFunction(storageEvents['viewZoomToItem'][0])
      ) {
        storageEvents['viewZoomToItem'][0](itemId);
      }
    }
  }

  function pendingScrollToSpecialItem(itemId: string, withAnim: boolean = true) {
    if (
      storageEvents['viewPendingScrollToSpecialItem'] &&
      isFunction(storageEvents['viewPendingScrollToSpecialItem'][0]) &&
      itemId
    ) {
      storageEvents['viewPendingScrollToSpecialItem'][0](numOfNewItems, itemId, withAnim);
    }
  }

  function scrollToTopAtCurrentUI() {
    if (
      storageEvents['viewScrollToTopAtCurrentUI'] &&
      isFunction(storageEvents['viewScrollToTopAtCurrentUI'][0])
    ) {
      storageEvents['viewScrollToTopAtCurrentUI'][0]();
    }
  }

  function scrollToBottomAtCurrentUI() {
    if (
      storageEvents['viewScrollToBottomAtCurrentUI'] &&
      isFunction(storageEvents['viewScrollToBottomAtCurrentUI'][0])
    ) {
      storageEvents['viewScrollToBottomAtCurrentUI'][0]();
    }
  }

  function scrollToTop(firstItemId: string) {
    if (
      !_hasItem(firstItemId) &&
      storageEvents['onLookForItemToScrollTop'] &&
      isFunction(storageEvents['onLookForItemToScrollTop'][0])
    ) {
      // Send a notification to outside.
      storageEvents['onLookForItemToScrollTop'][0]();
    }
    else {
      if (
        storageEvents['viewScrollToTopAtCurrentUI'] &&
        isFunction(storageEvents['viewScrollToTopAtCurrentUI'][0])
      ) {
        storageEvents['viewScrollToTopAtCurrentUI'][0]();
      }
    }
  }

  function scrollToBottom(lastItemId: string) {
    if (!_hasItem(lastItemId)) {
      // Send a notification to outside.
      if (
        storageEvents['onLookForItemToScrollBottom'] &&
        isFunction(storageEvents['onLookForItemToScrollBottom'][0])
      ) {
        storageEvents['onLookForItemToScrollBottom'][0]();
      }
    }
    else {
      if (
        storageEvents['viewScrollToBottomAtCurrentUI'] &&
        isFunction(storageEvents['viewScrollToBottomAtCurrentUI'][0])
      ) {
        storageEvents['viewScrollToBottomAtCurrentUI'][0]();
      }
    }
  }

  function scrollTo(index: number) {
    if (
      _isValidIndex(index) &&
      storageEvents['viewScrollTo'] &&
      isFunction(storageEvents['viewScrollTo'][0])
    ) {
      storageEvents['viewScrollTo'][0](index);
    }
  }


  /* ========================================================================
   [Public API] - Interact with list
   ======================================================================== */
  function onAddItems(startIndex: number, items: Array) {
    if (items) {
      const start = _getValidStartIndex(startIndex);
      if (!Array.isArray(items)) {
        items = _convertToArray(items);
      }

      const oldMap = new Map(__itemCache__.getItemsMap);
      const insertResult = _insertItems(start, items);

      if (insertResult.hasInsertSucceed) {
        if (
          storageEvents['viewOnAddItems'] &&
          isFunction(storageEvents['viewOnAddItems'][0])) {
          storageEvents['viewOnAddItems'][0](start, items, oldMap);
          reRenderUI();
        }

        // Notify to outside when add item(s) succeed.
        if (
          storageEvents['onAddItemsSucceed'] &&
          isFunction(storageEvents['onAddItemsSucceed'][0])
        ) {
          storageEvents['onAddItemsSucceed'][0]({
            startIndex: start,
            items: items,
            beforeItem: insertResult.successValues.beforeItem,
            afterItem: insertResult.successValues.afterItem,
          });
        }
      }
      else {
        // Notify to outside when add item(s) failure.
        if (
          storageEvents['onAddItemsFail'] &&
          isFunction(storageEvents['onAddItemsFail'][0])
        ) {
          const msgError = `Try to add item(s) ${items} failed!`;
          storageEvents['onAddItemsFail'][0](msgError);
        }
      }
    }
  }

  function onRemoveItemsById(itemId: string, deleteCount: number = 1) {
    if (_hasAlreadyId(itemId)) {
      const iIndex = __itemCache__.getIndex(itemId);
      const iHeight = __itemCache__.getHeight(itemId);
      const iPosition = __itemCache__.getPosition(itemId);
      const result = _deleteItemsById(itemId, deleteCount);

      if (result.hasDeleteSucceed) {
        if (storageEvents['viewOnRemoveItem'] && isFunction(storageEvents['viewOnRemoveItem'][0])) {
          storageEvents['viewOnRemoveItem'][0]({
            itemId,
            iIndex,
            iHeight,
            iPosition,
          });
          reRenderUI();
        }

        // Notify to outside to remove item.
        if (
          storageEvents['onRemoveItemsByIdSucceed'] &&
          isFunction(storageEvents['onRemoveItemsByIdSucceed'][0])
        ) {
          storageEvents['onRemoveItemsByIdSucceed'][0]({
            fromItemId: itemId,
            deleteCount,
            deletedItems: result.successValues.willDeleteItems,
            beforeItem: result.successValues.beforeItem,
            afterItem: result.successValues.afterItem,
          });
        }
      }
      else {
        if (
          storageEvents['onRemoveItemsByIdFail'] &&
          isFunction(storageEvents['onRemoveItemsByIdFail'][0])
        ) {
          const msgError = 'Can not find itemId';
          storageEvents['onRemoveItemsByIdFail'][0](msgError);
        }
      }
    }
  }

  function onRemoveItemsAt(index: number, deleteCount: number = 1) {
    const itemId = __itemCache__.getItemId(index);
    if (_hasAlreadyId(itemId)) {
      const iIndex = _getValidStartIndex(index);
      const iHeight = __itemCache__.getHeight(itemId);
      const iPosition = __itemCache__.getPosition(itemId);
      const result = _deleteItemsAt(iIndex, deleteCount);

      if (result.hasDeleteSucceed) {
        if (storageEvents['viewOnRemoveItem'] && isFunction(storageEvents['viewOnRemoveItem'][0])) {
          storageEvents['viewOnRemoveItem'][0]({
            itemId,
            iIndex,
            iHeight,
            iPosition,
          });
          reRenderUI();
        }

        // Notify to outside to remove item.
        if (
          storageEvents['onRemoveItemsAtSucceed'] &&
          isFunction(storageEvents['onRemoveItemsAtSucceed'][0])
        ) {
          storageEvents['onRemoveItemsAtSucceed'][0]({
            fromIndex: index,
            deleteCount,
            deletedItems: result.successValues.willDeleteItems,
            beforeItem: result.successValues.beforeItem,
            afterItem: result.successValues.afterItem,
          });
        }
      }
      else {
        if (
          storageEvents['onRemoveItemsAtFail'] &&
          isFunction(storageEvents['onRemoveItemsAtFail'][0])
        ) {
          const msgError = 'Can not find itemId';
          storageEvents['onRemoveItemsAtFail'][0](msgError);
        }
      }
    }
  }

  function onUpdateItem(itemId: string, item: Object) {
    if (_hasAlreadyId(itemId)) {
      const itemIndex = __itemCache__.getIndex(itemId);
      if (itemIndex !== NOT_FOUND) {
        data[itemIndex] = item;
        reRenderUI();
      }
    }
  }

  function addTop(items: Array) {
    onAddItems(0, items);
  }

  function addBottom(items: Array) {
    onAddItems(data.length, items);
  }


  /* ========================================================================
   Interaction with list data & cache
   ======================================================================== */
  function _insertItems(startIndex: number, items: Array) {
    let validIndex = _getValidStartIndex(startIndex);
    let positionStartOfNewItems = 0;
    let hasInsertSucceed = undefined;
    let beforeItem, afterItem = undefined;

    if (validIndex !== undefined) {
      const beforeItemId = __itemCache__.getItemId(validIndex - 1 < 0 ?
        0 :
        validIndex - 1);
      const beforeItemPos = __itemCache__.getPosition(beforeItemId);
      const beforeItemHeight = __itemCache__.getHeight(beforeItemId);
      if (beforeItemPos !== NOT_FOUND && beforeItemHeight !== NOT_FOUND) {
        positionStartOfNewItems = validIndex === 0 ?
          0 :
          beforeItemPos + beforeItemHeight;
      }

      if (!items) {
        hasInsertSucceed = false;
      }
      else {
        if (!Array.isArray(items)) {
          items = _convertToArray(items);
        }

        if (Array.isArray(data) && Array.isArray(items)) {
          const temp = _getItemBeforeAndAfterByIndex(validIndex);
          beforeItem = temp.beforeItem;
          afterItem = temp.afterItem;

          data.splice(validIndex, 0, items);
          data = data.flat();

          // Insert item on itemCache
          __itemCache__.updateIndexMap(validIndex - 1, data);

          items.forEach((item) => {
            if (
              item &&
              item.itemId &&
              !_hasAlreadyId(item.itemId)
            ) {
              dataMap.set(item.itemId, item);
              __itemCache__.updateItemOnMap(
                item.itemId,
                data.indexOf(item),
                __itemCache__.getDefaultHeight,
                positionStartOfNewItems,
                false);
            }
          });

          __itemCache__.updateItemsMap(validIndex - 1, data.length);
          updateItemsPositionFromSpecifiedItem(validIndex === 0 ?
            data[0].itemId :
            beforeItemId);
          hasInsertSucceed = true;
        }
      }
    }
    else {
      hasInsertSucceed = false;
    }

    return {
      hasInsertSucceed,
      successValues: {
        beforeItem,
        afterItem,
      },
    };
  }

  function _deleteItemsById(itemId: string, deleteCount: number = 1) {
    const itemIndex = __itemCache__.getIndex(itemId);
    let willDeleteItems = undefined;
    let beforeItem, afterItem = undefined;
    let hasDeleteSucceed = undefined;

    if (itemIndex !== NOT_FOUND) {
      // Get before & after itemId of `be deleted item`.
      const temp = _getItemBeforeAndAfterByIndex(itemIndex);
      beforeItem = temp.beforeItem;
      afterItem = temp.afterItem;

      // All itemId of deleted items
      willDeleteItems = _deleteItems(itemIndex, deleteCount);
      hasDeleteSucceed = true;
    }
    else {
      hasDeleteSucceed = false;
    }

    return {
      hasDeleteSucceed,
      successValues: {
        willDeleteItems,
        beforeItem,
        afterItem,
      },
    };
  }

  function _deleteItemsAt(index: number, deleteCount: number = 1) {
    let startIndex = _getValidStartIndex(index);
    if (data && startIndex === data.length) {
      startIndex = data.length - 1;
    }
    let willDeleteItems = undefined;
    let beforeItem, afterItem = undefined;
    let hasDeleteSucceed = undefined;

    if (startIndex !== undefined) {
      // Get before & after itemId of `be deleted item`.
      const temp = _getItemBeforeAndAfterByIndex(startIndex);
      beforeItem = temp.beforeItem;
      afterItem = temp.afterItem;

      // All itemId of deleted items
      willDeleteItems = _deleteItems(startIndex, deleteCount);
      hasDeleteSucceed = true;
    }
    else {
      hasDeleteSucceed = false;
    }

    return {
      hasDeleteSucceed,
      successValues: {
        willDeleteItems,
        beforeItem,
        afterItem,
      },
    };
  }

  function _deleteItems(index: number, deleteCount: number = 1) {
    let startIndex = _getValidStartIndex(index);
    if (data && startIndex === data.length) {
      startIndex = data.length - 1;
    }
    const storeStartIndex = startIndex;

    let willDeleteItems = [];

    // Delete items on dataOnList - dataMap
    if (
      Array.isArray(data) &&
      _isValidIndex(startIndex) &&
      Number.isInteger(deleteCount)
    ) {
      for (let i = 0; i < deleteCount; i++) {
        if (startIndex < data.length && data[startIndex] && data[startIndex].itemId) {
          const itemId = data[startIndex].itemId;
          if (itemId && _hasItem(itemId)) {
            willDeleteItems.push(itemId);
            dataMap.delete(data[startIndex].itemId);
            __itemCache__.getIndexMap.delete(startIndex);
          }
        }
        startIndex++;
      }

      if (data && data.length === deleteCount && data[data.length - 1].itemId) {
        remainderItem = data[data.length - 1].itemId;
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

      __itemCache__.updateItemsMap(storeStartIndex - 1, data.length);
      updateItemsPositionFromSpecifiedItem(aboveItemId);
    }

    return willDeleteItems;
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
        if (item && item.itemId) {
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

      if (data && data[0] && data[0].itemId) {
        updateItemsPositionFromSpecifiedItem(data[0].itemId);
      }
    }
  }

  function updateData(newData: Array) {
    if(!Array.isArray(newData)) {
        console.error('New data is NOT array');
        return;
    }

    _updateOldDataIds();
    _clearData();
    _clearDataMap();
    data = newData;
    numOfNewItems = 0;
    _updateCache();

    if (
      storageEvents['viewUpdateUIWhenScrollToItem'] &&
      isFunction(storageEvents['viewUpdateUIWhenScrollToItem'][0])
    ) {
      storageEvents['viewUpdateUIWhenScrollToItem'][0]();
    }
  }

  function _updateOldDataIds() {
    oldItemsId = [];
    for (let key of dataMap.keys()) {
      oldItemsId.push(key);
    }
  }

  function reRenderUI() {
    if (storageEvents['viewReRender']) {
      if (isFunction(storageEvents['viewReRender'][0])) {
        storageEvents['viewReRender'][0]();
      }
      else {
        console.error('UI reRender callback is not a function');
      }
    }
    else {
      console.error('UI reRender callback is undefined');
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

  /* Get startIndex as params and return valid index
   If startIndex is NaN or less than 0, return 0.
   If startIndex is greater than dataLength return dataLength.
   Else return itself.
   */
  function _getValidStartIndex(startIndex: number) {
    const validStartIndex = parseInt(startIndex);
    let start = undefined;

    if (isNaN(validStartIndex)) {
      console.error('Invalid startIndex');
      start = 0;
    }
    else if (validStartIndex < 0) {
      start = 0;
    }
    else if (validStartIndex > data.length) {
      start = data.length;
    }
    else {
      start = validStartIndex;
    }

    return start;
  }

  function _convertToArray(item: Object): Array {
    return [(item)];
  }


  /* ========================================================================
   Get - Set
   ======================================================================== */
  function getData() {
    return Object.freeze([...data]);
  }

  function getDataUnfreeze() {
    return data;
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
    return numOfNewItems;
  }

  function setNumOfNewItems(newValue: number) {
    numOfNewItems = newValue;
  }
}

export default createMasonryViewModel;