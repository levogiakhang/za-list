// @flow

import React from 'react';
import './scss/Masonry.scss';
import './anim/index.scss';
import {
  NOT_FOUND,
  OUT_OF_RANGE,
  DEBOUNCING_TIMER
} from "../utils/value";
import CellMeasurer from '../CellMeasurer/CellMeasurer.js';
import isFunction from "../vendors/isFunction";
import debounce from "../vendors/debounce.js";
import hasWhiteSpace from "../utils/hasWhiteSpace";

type Props = {
  className?: string,
  id?: ?string,
  style?: mixed,
  width?: number,
  minWidth?: number,
  height?: number,
  minHeight?: number,
  numOfOverscan?: number,
  viewModel: any,
  cellRenderer: any,
  isStartAtBottom?: boolean,
  isVirtualized?: boolean,
  hideScrollToBottomBtn?: boolean,
  isItemScrollToInBottom?: boolean,
  animationName?: string,
  timingResetAnimation?: number,
};

const LOAD_MORE_TOP_TRIGGER_POS = 20;
let LOAD_MORE_BOTTOM_TRIGGER_POS = 0;

class Masonry extends React.Component<Props> {
  static defaultProps = {
    width: 500,
    minWidth: 500,
    height: 500,
    minHeight: 500,
    style: {marginTop: "10px", borderRadius: '5px'},
    id: 'Masonry',
    numOfOverscan: 3,
    isStartAtBottom: false,
    hideScrollToBottomBtn: false,
    isItemScrollToInBottom: false,
    timingResetAnimation: 1000,
  };

  constructor(props) {
    super(props);
    this.viewModel = props.viewModel;

    /* Scroll to bottom when the first loading */
    // Count number of render called.
    this.firstLoadingCount = 0;
    // Trigger is the first loading.
    this.isFirstLoadingDone = false;
    this.isLoadingTop = false;
    this.isLoadingBottom = false;
    this.preventLoadTop = true;
    this.preventLoadBottom = true;
    this.firstItemInViewportBeforeLoadTop = {};

    this.isDebut = false;
    this.flat = undefined;
    this.posNeedToScr = 0;
    this.firstItemInViewportBeforeDebut = {};

    // for add more above
    this.firstItemInViewport = {};
    this.oldData = {
      oldLength: 0,
      firstItem: {},
      lastItem: {}
    };

    this.oldLastItemBeforeDebut = undefined;
    this.isDataChange = false;

    this.isStableAfterScrollToSpecialItem = false;
    this.itemAddedAnim = {
      itemId: undefined,
      anim: undefined,
    };

    this.estimateTotalHeight = 0;
    this.oldEstimateTotalHeight = 0;

    this.itemsInBatch = undefined;
    this.oldItemsInBatch = undefined;
    this.children = [];

    this.resizeMap = {};
    this.isResize = false;

    // Represents this element.
    this.masonry = undefined;
    this.parentRef = React.createRef();
    this.btnScrollBottomPos = {
      top: 0,
      right: 20,
    };

    this.state = {
      scrollTop: 0,
    };

    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
    this.onChildrenChangeHeight = this.onChildrenChangeHeight.bind(this);
    this.onRemoveItem = this.onRemoveItem.bind(this);
    this.scrollToSpecialItem = this.scrollToSpecialItem.bind(this);
    this._updateMapOnAddData = this._updateMapOnAddData.bind(this);
    this.scrollToTop = this.scrollToTop.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);
    this._addStaticItemToChildren = this._addStaticItemToChildren.bind(this);
    this.initialize();
  }

  initialize() {
    const {isVirtualized} = this.props;
    const data = this.viewModel.getDataList;
    const itemCache = this.viewModel.getItemCache;

    this._updateOldData();
    if (Array.isArray(data)) {
      // eslint-disable-next-line array-callback-return
      data.map((item, index) => {
        itemCache.updateItemOnMap(
          item.itemId,
          data.indexOf(item),
          itemCache.defaultHeight,
          0,
          false);
        if (!isVirtualized) {
          this._addStaticItemToChildren(index, item);
        }
      });
      itemCache.updateIndexMap(0, data);
    } else {
      console.error("Data list is not an array");
    }

    //this.itemsInBatch = [...dataViewModel];
    this.estimateTotalHeight = this._getEstimatedTotalHeight();
    this.oldEstimateTotalHeight = this.estimateTotalHeight;
  }

  componentDidMount() {
    const data = this.viewModel.getDataList;
    const {height} = this.props;
    this.masonry = this.parentRef.current.firstChild;
    window.addEventListener('resize', debounce(this._onResize, DEBOUNCING_TIMER));
    if (this.parentRef !== undefined) {
      this.btnScrollBottomPos.top = this.parentRef.current.offsetTop + height - 50;
    }
    this._updateItemsPosition();
    console.log(data);
    console.log(this.viewModel.getItemCache.getItemsMap);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);
  }

  onChildrenChangeHeight(itemId: string, oldHeight: number, newHeight: number) {
    const itemCache = this.viewModel.getItemCache;

    if (itemCache.getHeight(itemId) !== newHeight) {
      const curItem = this.firstItemInViewport.itemId;
      const dis = this.firstItemInViewport.disparity;
      if (this.isFirstLoadingDone && !itemCache.isRendered(itemId)) {
        this.firstItemInViewportBeforeDebut = {curItem, dis};
        this.flat = itemCache.getIndex(this.oldLastItemBeforeDebut) >= itemCache.getIndex(itemId);
        this.isDebut = true;
      }
      itemCache.updateItemHeight(
        itemId,
        itemCache.getIndex(itemId),
        newHeight,
        itemCache.getPosition(itemId),
        true);
      this._updateItemsOnChangedHeight(itemId, newHeight);
      this._updateEstimatedHeight(newHeight - oldHeight);
      this.setState(this.state); // instead of this.forceUpdate();
    }
  }

  updateCacheFromOtherViewModel(index, item) {
    this._updateEstimatedHeight(this.viewModel.getItemCache.defaultHeight);

    if (!this.props.isVirtualized) {
      this._addStaticItemToChildren(index, item)
    }
  }

  onAddItem(index, item) {
    const itemCache = this.viewModel.getItemCache;
    const {isVirtualized} = this.props;

    this.viewModel.insertItem(index, item);

    if (!isVirtualized) {
      this._addStaticItemToChildren(index, item)
    }

    this._updateEstimatedHeight(itemCache.defaultHeight);
  }

  onRemoveItem(itemId: string) {
    const itemCache = this.viewModel.getItemCache;
    const itemIndex = itemCache.getIndex(itemId);

    if (itemIndex !== NOT_FOUND) {
      const itemHeight = itemCache.getHeight(itemId);

      // remove an item means this item has new height equals 0
      this._updateItemsOnChangedHeight(itemId, 0);

      // Remove item on dataViewModel list, rendered maps and position maps
      this.viewModel.deleteItem(itemId);

      this._updateEstimatedHeight(-itemHeight);
      this._updateOldData();

      this.children.splice(itemIndex, 1);
    }
  }

  scrollToSpecialItem(itemId: string) {
    const {
      height,
      isVirtualized,
      isItemScrollToInBottom,
      animationName,
      timingResetAnimation
    } = this.props;

    const itemCache = this.viewModel.getItemCache;

    if (isVirtualized) {
      if (itemCache.isRendered(itemId)) {
        this._scrollToItem(itemId, 0);
      } else {
        // waiting for rendering already
        this._scrollToItem(itemId, 0);
      }
    } else {
      // Non-VL
      const itemPos = itemCache.getPosition(itemId);
      const itemHeight = itemCache.getHeight(itemId);
      this.preventLoadTop = true;
      this.preventLoadBottom = true;

      this.invokeAnim(itemId, animationName, timingResetAnimation);

      if (
        itemHeight > height ||
        itemPos + itemHeight < height ||
        !isItemScrollToInBottom
      ) {
        this._scrollToItem(itemId, 0);
      } else {
        const scrollTop = itemPos + itemHeight - height;
        this._scrollToOffset(scrollTop);
      }
    }
  }

  invokeAnim(itemId, animationNames, timingResetAnimation) {
    const el = this.masonry.firstChild.children.namedItem(itemId);
    this.appendStyle(el, animationNames);
    setTimeout(
      () => {
        this.isStableAfterScrollToSpecialItem = true;
        this.itemAddedAnim = {
          itemId: itemId,
          anim: animationNames,
        };
      }, timingResetAnimation
    );
  }

  appendStyle = (el, animationNames) => {
    if (
      el &&
      el.classList &&
      typeof el.classList.contains === "function" &&
      !el.classList.contains(`${animationNames}`) &&
      typeof el.setAttribute === "function") {
      el.setAttribute("class", `${animationNames}`);
    }
  };

  removeStyle = (el, animationNames) => {
    const arrAnim = hasWhiteSpace(animationNames) ?
      animationNames.split(' ') :
      animationNames;

    if (
      el &&
      el.classList &&
      typeof el.classList.contains === "function" &&
      typeof el.classList.remove === "function") {
      for (let i = 0; i < arrAnim.length; i++) {
        if (el.classList.contains(arrAnim[i])) {
          el.classList.remove(arrAnim[i]);
        }
      }
    }
  };

  scrollToTop() {
    this.preventLoadTop = true;
    this._scrollToItem(this.oldData.firstItem);
  };

  scrollToBottom() {
    this.preventLoadBottom = true;
    this._scrollToItem(this.oldData.lastItem);
  };

  reRender() {
    this.setState(this.state);
  }

  render() {
    const {
      className,
      id,
      width,
      minWidth,
      height,
      minHeight,
      style,
      isScrolling,
      isStartAtBottom,
      cellRenderer,
      isVirtualized
    } = this.props;

    const data = this.viewModel.getDataList;
    const itemCache = this.viewModel.getItemCache;
    const {scrollTop} = this.state;
    const removeCallback = this.viewModel.onRemoveItem;

    const curItem = this._getItemIdFromPosition(scrollTop);
    this.firstItemInViewport = {
      itemId: curItem,
      disparity: scrollTop - itemCache.getPosition(curItem)
    };

    if (isVirtualized) {
      // trigger load more top
      if (
        scrollTop < LOAD_MORE_TOP_TRIGGER_POS &&
        this.isFirstLoadingDone &&
        !this.isLoadingTop &&
        !this.preventLoadTop
      ) {
        this.viewModel.shouldLoadMoreTop();
        if (typeof this.viewModel.getLoadMoreTopCallBack === 'function') {
          this.isLoadingTop = true;
          this.firstItemInViewportBeforeLoadTop = {
            itemId: curItem,
            disparity: scrollTop - this.itemCache.getPosition(curItem)
          };
          this.viewModel.getLoadMoreTopCallBack();
        } else {
          console.warn("loadMoreTopFunc callback is not a function")
        }
      }

      // trigger load more bottom
      LOAD_MORE_BOTTOM_TRIGGER_POS = this.estimateTotalHeight - height - 2;
      if (
        scrollTop >= LOAD_MORE_BOTTOM_TRIGGER_POS &&
        this.isFirstLoadingDone &&
        !this.isLoadingBottom &&
        !this.preventLoadBottom
      ) {
        this.viewModel.shouldLoadMoreBottom();
        if (typeof this.viewModel.getLoadMoreBottomCallBack === 'function') {
          this.isLoadingBottom = true;
          this.viewModel.getLoadMoreBottomCallBack();
        } else {
          console.warn("loadMoreBottomFunc callback is not a function")
        }
      }

      this._updateMapOnAddData();

      // number of items in viewport + overscan top + overscan bottom.
      this.itemsInBatch = this._getItemsInBatch(scrollTop);

      if (isStartAtBottom && !this.isFirstLoadingDone) {
        this._scrollToBottomAtFirst(this.itemsInBatch.length);
      } else if (!isStartAtBottom && !this.isFirstLoadingDone) {
        this.preventLoadTop = true;
        this.isFirstLoadingDone = true;
      }

      // array item is rendered in the batch.
      this.children = [];
      for (let i = 0; i <= this.itemsInBatch.length - 1; i++) {
        const index = this.itemCache.getIndex(this.itemsInBatch[i]);
        if (!!data[index]) {
          const item = data[index];
          this.children.push(
            <CellMeasurer id={item.itemId}
                          key={item.itemId}
                          defaultHeight={this.viewModel.getItemCache.getDefaultHeight}
                          isVirtualized={isVirtualized}
                          onChangedHeight={this.onChildrenChangeHeight}
                          position={{top: 0, left: 0}}>
              {
                isFunction(cellRenderer) ?
                  cellRenderer({
                    item,
                    index,
                    removeCallback
                  }) :
                  null
              }
            </CellMeasurer>
          );
        }
      }

      return (
        <div className={'masonry-parent'}
             ref={this.parentRef}>
          <div className={className}
               id={id}
               onScroll={this._onScroll}
               style={{
                 backgroundColor: 'cornflowerblue',
                 boxSizing: 'border-box',
                 overflowX: 'hidden',
                 overflowY: this.estimateTotalHeight < height ? 'hidden' : 'auto',
                 width: width,
                 minWidth: minWidth,
                 height: height,
                 minHeight: minHeight,
                 position: 'relative',
                 willChange: 'auto',
                 ...style
               }}>
            <div className="innerScrollContainer"
                 style={{
                   width: '100%',
                   height: this.estimateTotalHeight,
                   maxWidth: '100%',
                   maxHeight: this.estimateTotalHeight,
                   overflow: 'hidden',
                   position: 'relative',
                   pointerEvents: isScrolling ? 'none' : '', // property defines whether or not an element reacts to pointer events.
                 }}>
              {this.children}
            </div>
          </div>
        </div>
      );
    } else {
      if (
        scrollTop < LOAD_MORE_TOP_TRIGGER_POS &&
        this.isFirstLoadingDone &&
        !this.isLoadingTop &&
        !this.preventLoadTop
      ) {
        this.viewModel.shouldLoadMoreTop();
        if (typeof this.viewModel.getLoadMoreTopCallBack === 'function') {
          this.isLoadingTop = true;
          this.firstItemInViewportBeforeLoadTop = {
            itemId: curItem,
            disparity: scrollTop - itemCache.getPosition(curItem)
          };
          this.viewModel.getLoadMoreTopCallBack();
        } else {
          console.warn("loadMoreTopFunc callback is not a function")
        }
      }

      // trigger load more bottom
      LOAD_MORE_BOTTOM_TRIGGER_POS = this.estimateTotalHeight - height - 2;
      if (
        scrollTop >= LOAD_MORE_BOTTOM_TRIGGER_POS &&
        this.isFirstLoadingDone &&
        !this.isLoadingBottom &&
        !this.preventLoadBottom
      ) {
        this.viewModel.shouldLoadMoreBottom();
        if (typeof this.viewModel.getLoadMoreBottomCallBack === 'function') {
          this.isLoadingBottom = true;
          this.viewModel.getLoadMoreBottomCallBack();
        } else {
          console.warn("loadMoreBottomFunc callback is not a function")
        }
      }

      if (isStartAtBottom && !this.isFirstLoadingDone) {
        this._scrollToBottomAtFirst();
      } else if (!isStartAtBottom && !this.isFirstLoadingDone) {
        this.preventLoadTop = true;
        this.isFirstLoadingDone = true;
      }
      if (this.isDataChange) {
        console.log('data changed');
      }

      if (!this.isEqual(this.itemsInBatch, this.oldItemsInBatch)) {
        //this.oldItemsInBatch = [...this.itemsInBatch];

      }

      return (
        <div className={'masonry-parent'}
             ref={this.parentRef}>
          <div className={className}
               id={id}
               onScroll={this._onScroll}
               style={{
                 backgroundColor: 'cornflowerblue',
                 boxSizing: 'border-box',
                 overflowX: 'hidden',
                 overflowY: this.estimateTotalHeight < height ? 'hidden' : 'auto',
                 width: width,
                 minWidth: minWidth,
                 height: height,
                 minHeight: minHeight,
                 position: 'relative',
                 willChange: 'auto',
                 ...style
               }}>
            <div className="innerScrollContainer"
                 style={{
                   width: '100%',
                   height: this.estimateTotalHeight,
                   maxWidth: '100%',
                   maxHeight: this.estimateTotalHeight,
                   overflow: 'hidden',
                   position: 'relative',
                   pointerEvents: isScrolling ? 'none' : '', // property defines whether or not an element reacts to pointer events.
                 }}>
              {this.children}
            </div>
          </div>
        </div>
      );
    }
  }

  componentDidUpdate() {
    const data = this.viewModel.getDataList;
    const {height} = this.props;
    const {scrollTop} = this.state;

    if (scrollTop > LOAD_MORE_TOP_TRIGGER_POS) {
      this.preventLoadTop = false;
      if (this.isLoadingTop) {
        this.isLoadingTop = false;
      }
    }

    if (scrollTop >= LOAD_MORE_BOTTOM_TRIGGER_POS && this.isLoadingBottom) {
      this.isLoadingBottom = false;
    }

    if (scrollTop < this.estimateTotalHeight - height - 200 && this.isFirstLoadingDone) {
      this.preventLoadBottom = false;
    }

    if (this.isDebut && !this.isLoadingTop) {
      this.posNeedToScr =
        this.viewModel.getItemCache.getPosition(this.firstItemInViewportBeforeDebut.curItem) +
        this.firstItemInViewportBeforeDebut.dis;
      this.isDebut = false;
      this._scrollToOffset(this.posNeedToScr);
    }

    // check add or remove item above
    // remove
    if (this.oldData.oldLength !== data.length) {
      if (this.oldData.oldLength < data.length && this.isLoadingTop && !this.isDebut) {
        this._scrollToItem(
          this.firstItemInViewportBeforeLoadTop.itemId,
          this.firstItemInViewportBeforeLoadTop.disparity
        );
      }
      this._updateOldData();
    }
  }

  isEqual(arr, other) {
    // Get the arr type
    let type = Object.prototype.toString.call(arr);

    // If the two objects are not the same type, return false
    if (type !== Object.prototype.toString.call(other)) return false;

    // If items are not an object or array, return false
    if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;

    // Compare the length of the length of the two items
    let arrLength = type === '[object Array]' ? arr.length : Object.keys(arr).length;
    let otherLength = type === '[object Array]' ? other.length : Object.keys(other).length;
    if (arrLength !== otherLength) return false;

    // Compare two items
    let compare = function (item1, item2) {
      // Get the object type
      let itemType = Object.prototype.toString.call(item1);

      // If an object or array, compare recursively
      if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
        if (item1 !== item2) return false;
      }

      // Otherwise, do a simple comparison
      else {

        // If the two items are not the same type, return false
        if (itemType !== Object.prototype.toString.call(item2)) return false;

        // Else if it's a function, convert to a string and compare
        // Otherwise, just compare
        if (itemType === '[object Function]') {
          if (item1.toString() !== item2.toString()) return false;
        } else {
          if (item1 !== item2) return false;
        }

      }
    };

    // Compare properties
    if (type === '[object Array]') {
      for (let i = 0; i < arrLength; i++) {
        if (compare(arr[i], other[i]) === false) return false;
      }
    } else {
      for (let key in arr) {
        if (arr.hasOwnProperty(key)) {
          if (compare(arr[key], other[key]) === false) return false;
        }
      }
    }

    // If nothing failed, return true
    return true;
  };

  /*
   * Scroll to bottom when the first loading
   */
  _scrollToBottomAtFirst(numOfItemsInBatch = 0) {
    const data = this.viewModel.getDataList;
    const {isVirtualized} = this.props;
    if (isVirtualized) {
      if (
        !!this.masonry &&
        !this.isFirstLoadingDone &&
        !!data.length
      ) {
        this.firstLoadingCount++;
        const lastItemId = this._getItemIdFromIndex(data.length - 1);
        this._scrollToItem(lastItemId, this.viewModel.getItemCache.getHeight(lastItemId));
        if (this.firstLoadingCount >= numOfItemsInBatch + 10) {
          console.log('reverse done');
          this.isFirstLoadingDone = true;
        }
      }
    } else {
      if (
        this.masonry !== undefined &&
        !this.isFirstLoadingDone
      ) {
        this.masonry.firstChild.scrollIntoView(false);
        this.isFirstLoadingDone = true;
      }
    }
  }

  //TODO: add data at?
  _updateMapOnAddData() {
    const data = this.viewModel.getDataList;
    const itemCache = this.viewModel.getItemCache;

    if (this.oldData.oldLength < data.length) {
      itemCache.updateIndexMap(0, data);
      itemCache.updateItemsMap(0, data);
      this._updateItemsPosition();
      this._scrollToItem(this.firstItemInViewport.itemId, this.firstItemInViewport.disparity)
    }
  }

  _addStaticItemToChildren(index, item) {
    const {isVirtualized, cellRenderer} = this.props;
    const defaultHeight = this.viewModel.getItemCache.getDefaultHeight;

    // const index = this.itemCache.getIndex;
    const removeCallback = this.viewModel.onRemoveItem;
    this.children.splice(index, 0,
      <CellMeasurer id={item.itemId}
                    key={item.itemId}
                    defaultHeight={defaultHeight}
                    isVirtualized={isVirtualized}
                    onChangedHeight={this.onChildrenChangeHeight}
                    position={{top: 0, left: 0}}>
        {
          isFunction(cellRenderer) ?
            cellRenderer({
              item,
              index,
              removeCallback
            }) :
            null
        }
      </CellMeasurer>
    );
  }

  _onScroll() {
    const {height} = this.props;

    if (this.flat) {
      this.masonry.scrollTop = this.posNeedToScr;
      this.flat = false;
    }

    if (this.isStableAfterScrollToSpecialItem) {
      const el = this.masonry.firstChild.children.namedItem(this.itemAddedAnim.itemId);
      this.removeStyle(el, this.itemAddedAnim.anim);
      this.isStableAfterScrollToSpecialItem = false;
    }

    const eventScrollTop = this.masonry.scrollTop;
    const scrollTop = Math.min(
      Math.max(0, this.estimateTotalHeight - height),
      eventScrollTop
    );

    if (Math.round(eventScrollTop) !== Math.round(scrollTop)) return;

    if (this.state.scrollTop !== scrollTop) {
      this.setState({scrollTop});
    }
  };

  _onResize() {
    console.log('resize');
    this.isResize = false;
  }

  _scrollToOffset(top) {
    this.masonry.scrollTo(0, top);
  }

  /*
   *  Get total height in estimation.
   */
  _getEstimatedTotalHeight(): number {
    const data = this.viewModel.getDataList;
    let totalHeight = 0;

    if (!!data.length) {
      totalHeight = this.viewModel.getItemCache.getDefaultHeight * data.length;
    }
    return totalHeight;
  }

  _updateEstimatedHeight(difference: number) {
    this.estimateTotalHeight = this.oldEstimateTotalHeight + difference;
    this.oldEstimateTotalHeight = this.estimateTotalHeight;
  }

  _updateOldData() {
    const data = this.viewModel.getDataList;
    if (!!data.length) {
      this.oldData.oldLength = data.length;
      if (!!data[0]) {
        this.oldData.firstItem = data[0].itemId;
      }
      if (!!data[data.length - 1]) {
        this.oldData.lastItem = data[data.length - 1].itemId;
      }
    }
  }

  /**
   *  Update all items' position
   */
  _updateItemsPosition() {
    const data = this.viewModel.getDataList;
    const itemCache = this.viewModel.getItemCache;

    if (Array.isArray(data)) {
      let currentPosition = 0;
      data.forEach((item) => {
        itemCache.updateItemOnMap(
          item.itemId,
          data.indexOf(item),
          itemCache.getHeight(item.itemId),
          currentPosition,
          itemCache.isRendered(item.itemId));
        currentPosition += itemCache.getHeight(item.itemId);
      });
    }
  }

  /**
   *  Update other items' position below the item that changed height.
   */
  _updateItemsOnChangedHeight(itemId: string, newHeight: number) {
    const itemCache = this.viewModel.getItemCache;

    itemCache.updateItemOnMap(
      itemId,
      itemCache.getIndex(itemId),
      newHeight,
      itemCache.getPosition(itemId),
      itemCache.isRendered(itemId)
    );
    this._updateItemsPositionFromSpecifiedItem(itemId);
  }

  /**
   *  Calculate items' position from specified item to end the data list => reduces number of calculation
   */
  _updateItemsPositionFromSpecifiedItem(itemId: string) {
    const data = this.viewModel.getDataList;
    const itemCache = this.viewModel.getItemCache;

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
   *  Get itemId of a item in _positionMaps by position.
   *
   *  @param {number} positionTop - Where wanna get item in this.
   *
   *  @return {string} - itemId.
   *  @return {number} - OUT_OF_RANGE ('out of range'): if position param is greater than total height.
   */
  _getItemIdFromPosition(positionTop: number): string {
    const data = this.viewModel.getDataList;
    const itemCache = this.viewModel.getItemCache;
    if (!!data.length) {
      if (positionTop >= this.estimateTotalHeight) return itemCache.getItemId(data.length - 1);

      for (let key of itemCache.getItemsMap.keys()) {
        if (positionTop >= itemCache.getPosition(key) &&
          positionTop < itemCache.getPosition(key) + itemCache.getHeight(key)) {
          return key;
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
    const data = this.viewModel.getDataList;
    if (!!data.length) {
      if (index >= data.length || index < 0) return OUT_OF_RANGE;
      return this.viewModel.getItemCache.getItemId(index);
    }
  }

  /**
   *  Return an array that stores itemId of items rendering in batch.
   *
   *  @param {number} scrollTop - Offset top of Masonry.
   *
   *  @return {Array<string>} - Can be empty.
   */
  _getItemsInBatch(scrollTop: number): Array<string> {
    const data = this.viewModel.getDataList;
    const {height, numOfOverscan} = this.props;
    let results: Array<string> = [];

    if (!!data.length) {
      const currentIndex = this.viewModel.getItemCache.getIndex(this._getItemIdFromPosition(scrollTop));
      const numOfItemInViewport = this._getItemsInViewport(scrollTop, height).length;
      const startIndex = Math.max(0, currentIndex - numOfOverscan);
      const endIndex = Math.min(currentIndex + numOfItemInViewport + numOfOverscan, data.length);

      for (let i = startIndex; i < endIndex; i++) {
        results.push(data[i].itemId);
      }
    }
    return results;
  }

  /**
   *  Return an array stores all items rendering in viewport.
   *
   *  @param {number} scrollTop - This masonry position.
   *  @param {number} viewportHeight
   *
   *  @return {Array<string>} - Stores all items' id in viewport. Can be empty.
   */
  _getItemsInViewport(scrollTop: number, viewportHeight: number): Array<string> {
    const data = this.viewModel.getDataList;
    const itemCache = this.viewModel.getItemCache;
    const results = [];

    if (!!data.length) {
      const itemIdStart = this._getItemIdFromPosition(scrollTop);
      if (itemIdStart !== NOT_FOUND) {
        results.push(itemIdStart);

        // disparity > 0 when scrollTop position is between `the item's position` and `item's position + its height`.
        const disparity = scrollTop - itemCache.getPosition(itemIdStart);
        let remainingViewHeight = viewportHeight - itemCache.getHeight(itemIdStart) + disparity;

        let i = 1;
        let itemIndex = itemCache.getIndex(itemIdStart);
        if (itemIndex + i >= data.length) {
          itemIndex = data.length - 2;
        }

        let nextItemId = this._getItemIdFromIndex(itemIndex + i);
        let nextItemHeight = itemCache.getHeight(nextItemId);

        while (remainingViewHeight > nextItemHeight && nextItemHeight !== 0) {
          remainingViewHeight -= nextItemHeight;
          results.push(nextItemId);
          i++;
          nextItemId = this._getItemIdFromIndex(itemIndex + i);
          if (nextItemId !== OUT_OF_RANGE) {
            nextItemHeight = itemCache.getHeight(nextItemId);
          }
        }
        if (remainingViewHeight > 0) {
          results.push(nextItemId);
        }
      }
    }

    return results;
  }

  _scrollToItem(itemId: string, disparity = 0) {
    const itemCache = this.viewModel.getItemCache;
    if (itemCache.hasItem(itemId)) {
      this._scrollToOffset(itemCache.getPosition(itemId) + disparity);
    }
  }
}

export default Masonry;
