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
import removeClass from "../utils/removeClass";
import addClass from "../utils/addClass";

type Props = {
  className?: string,
  innerScrollClassName?: string,
  id?: ?string,
  style?: mixed,
  innerScrollStyle?: mixed,
  minWidth?: number,
  height?: number,
  minHeight?: number,
  viewModel: any,
  cellRenderer: any,
  isStartAtBottom?: boolean,
  hideScrollToBottomBtn?: boolean,
  isItemScrollToInBottom?: boolean,
  animationName?: string,
  additionAnim?: string,
  removalAnim?: string,
  timingResetAnimation?: number,
};

const LOAD_MORE_TOP_TRIGGER_POS = 50;
let LOAD_MORE_BOTTOM_TRIGGER_POS = 0;

class Masonry extends React.Component<Props> {
  static defaultProps = {
    minWidth: 200,
    height: 500,
    minHeight: 500,
    style: {marginTop: "10px", borderRadius: '5px'},
    id: 'Masonry',
    isStartAtBottom: false,
    hideScrollToBottomBtn: false,
    isItemScrollToInBottom: false,
    timingResetAnimation: 1000,
  };

  constructor(props) {
    super(props);
    this.viewModel = props.viewModel;

    /* Scroll to bottom when the first loading */
    this.isFirstLoadingDone = false;
    this.isLoadingTop = false;
    this.preventLoadTop = true;
    this.preventLoadBottom = true;
    this.firstItemInViewportBeforeLoadTop = {};

    this.isScrollBack = false;
    this.loadDone = false;
    this.initItemCount = 0;

    this.oldData = {
      oldLength: 0,
      firstItem: {},
      lastItem: {}
    };

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
    //this._updateMapOnAddData = this._updateMapOnAddData.bind(this);
    this.scrollToTop = this.scrollToTop.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);
    this._addStaticItemToChildren = this._addStaticItemToChildren.bind(this);
    this.initialize();
  }

  initialize() {
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
        this._addStaticItemToChildren(index, item);
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
    const {height} = this.props;
    this.masonry = this.parentRef.current.firstChild;
    window.addEventListener('resize', debounce(this._onResize, DEBOUNCING_TIMER));
    if (this.parentRef !== undefined) {
      this.btnScrollBottomPos.top = this.parentRef.current.offsetTop + height - 50;
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);
  }

  onChildrenChangeHeight(itemId: string, oldHeight: number, newHeight: number) {
    const itemCache = this.viewModel.getItemCache;

    if (itemCache.getHeight(itemId) !== newHeight) {
      if (!itemCache.isRendered(itemId) && itemCache.getIndex(itemId) < itemCache.getIndex(this.oldData.firstItem)) {
        this.isScrollBack = true;
      }

      if (!itemCache.isRendered(itemId) && this.isFirstLoadingDone) {
        const {additionAnim, timingResetAnimation} = this.props;
        this.appendStyle(this.getElementFromId(itemId), additionAnim);
        setTimeout(() => {
          this.removeStyle(this.getElementFromId(itemId), additionAnim);
        }, timingResetAnimation);
      }

      this._updateItemsOnChangedHeight(itemId, newHeight, true);
      this._updateEstimatedHeight(newHeight - oldHeight);

      if (this.initItemCount < this.viewModel.getDataList.length - 1) {
        this.initItemCount++;
      } else if (this.initItemCount === this.viewModel.getDataList.length - 1) {
        this.loadDone = true;
      }

      this.setState(this.state); // instead of this.forceUpdate();
    }
  }

  addChildrenOnDataChangedFromOtherViewModel(index, item) {
    this._updateEstimatedHeight(this.viewModel.getItemCache.defaultHeight);
    this._addStaticItemToChildren(index, item);
  }

  onAddItem(index, item) {
    const itemCache = this.viewModel.getItemCache;
    this.viewModel._insertItem(index, item);
    this._addStaticItemToChildren(index, item);
    this._updateEstimatedHeight(itemCache.defaultHeight);
  }

  onRemoveItem(itemId: string) {
    const itemCache = this.viewModel.getItemCache;
    const itemIndex = itemCache.getIndex(itemId);

    const {removalAnim, timingResetAnimation} = this.props;

    if (itemIndex !== NOT_FOUND) {
      const itemHeight = itemCache.getHeight(itemId);

      const el = document.getElementById(itemId);
      el.style.position = "absolute";
      el.style.top = itemCache.getPosition(itemId) + 'px';

      const parent = el.parentElement;

      const stuntman = document.createElement('DIV');
      stuntman.id = itemId + "_fake";
      stuntman.setAttribute("style", `height: ${itemHeight}px; width:100%; clear:both; position: relative`);

      parent.insertBefore(stuntman, el);

      this.appendStyle(el, removalAnim);
      const removeAnim = document.querySelector(`.${removalAnim}`);
      removeAnim.addEventListener('animationend', () => {
        // clear real el from data, itemCache
        this.viewModel._deleteItem(itemId);
        this._updateOldData();

        // remove from UI
        this.children.splice(itemIndex, 1);
        this._updateEstimatedHeight(-itemHeight);
        this.setState(this.state);
      });

      const zoomInAnimName = 'makeInvisible';
      stuntman.style.setProperty('--itemHeight', itemHeight + 'px');
      this.appendStyle(stuntman, zoomInAnimName);
      const zoomInAnim = document.querySelector(`.${zoomInAnimName}`);
      zoomInAnim.addEventListener('animationend', () => {
        // remove from UI
        parent.removeChild(stuntman);
      });
    }
  }

  scrollToSpecialItem(itemId: string) {
    const {
      height,
      isItemScrollToInBottom,
      animationName,
      timingResetAnimation
    } = this.props;

    const itemCache = this.viewModel.getItemCache;

    // Non-VL
    const itemPos = itemCache.getPosition(itemId);
    const itemHeight = itemCache.getHeight(itemId);
    this.preventLoadTop = true;
    this.preventLoadBottom = true;

    if (
      itemHeight > height ||
      itemPos + itemHeight < height ||
      !isItemScrollToInBottom
    ) {
      this._scrollToItem(itemId, 0);
      this.addAnimWhenScrollToSpecialItem(itemId, animationName, timingResetAnimation);
    } else {
      const scrollTop = itemPos + itemHeight - height;
      this._scrollToOffset(scrollTop);
      this.addAnimWhenScrollToSpecialItem(itemId, animationName, timingResetAnimation);
    }
  }

  addAnimWhenScrollToSpecialItem(itemId, animationNames, timingResetAnimation) {
    this.appendStyle(this.getElementFromId(itemId), animationNames);
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
    const arrAnim = hasWhiteSpace(animationNames) ?
      animationNames.split(' ') :
      animationNames;

    if (typeof arrAnim === 'string') {
      addClass(el, arrAnim);
    } else {
      for (let i = 0; i < arrAnim.length; i++) {
        addClass(el, arrAnim[i]);
      }
    }
  };

  removeStyle = (el, animationNames) => {
    const arrAnim = hasWhiteSpace(animationNames) ?
      animationNames.split(' ') :
      animationNames;

    if (typeof arrAnim === 'string') {
      removeClass(el, arrAnim);
    } else {
      for (let i = 0; i < arrAnim.length; i++) {
        removeClass(el, arrAnim[i]);
      }
    }
  };

  getElementFromId(itemId) {
    return this.masonry.firstChild.children.namedItem(itemId);
  }

  scrollToTop() {
    this.preventLoadTop = true;
    this._scrollToOffset(0);
  };

  scrollToBottom() {
    this.preventLoadBottom = true;
    this._scrollToOffset(this.estimateTotalHeight);
  };

  reRender() {
    this.setState(this.state);
  }

  render() {
    const {
      className,
      innerScrollClassName,
      id,
      minWidth,
      height,
      minHeight,
      style,
      innerScrollStyle,
      isScrolling,
    } = this.props;

    const itemCache = this.viewModel.getItemCache;
    const {scrollTop} = this.state;

    const curItem = this._getItemIdFromPosition(scrollTop);

    if (
      scrollTop < LOAD_MORE_TOP_TRIGGER_POS &&
      this.isFirstLoadingDone &&
      !this.isLoadingTop &&
      !this.preventLoadTop
    ) {
      this.viewModel.enableLoadMoreTop();
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
      !this.preventLoadBottom
    ) {
      this.viewModel.enableLoadMoreBottom();
      if (typeof this.viewModel.getLoadMoreBottomCallBack === 'function') {
        this.viewModel.getLoadMoreBottomCallBack();
      } else {
        console.warn("loadMoreBottomFunc callback is not a function")
      }
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
               width: 'auto',
               minWidth: minWidth,
               height: height,
               minHeight: minHeight,
               position: 'relative',
               willChange: 'auto',
               ...style
             }}>
          <div
            className={`${innerScrollClassName ? innerScrollClassName : 'innerScrollContainer'}`}
            style={{
              width: '100%',
              height: this.estimateTotalHeight,
              maxWidth: '100%',
              maxHeight: this.estimateTotalHeight,
              overflow: 'hidden',
              position: 'relative',
              pointerEvents: isScrolling ? 'none' : '', // property defines whether or not an element reacts to pointer events.
              ...innerScrollStyle
            }}>
            {this.children}
          </div>
        </div>
      </div>
    );
  }

  componentDidUpdate() {
    const data = this.viewModel.getDataList;
    const {height} = this.props;
    const {scrollTop} = this.state;

    if (scrollTop > LOAD_MORE_TOP_TRIGGER_POS) {
      this.preventLoadTop = false;
      this.isLoadingTop = false;
    }

    if (scrollTop < this.estimateTotalHeight - height - 20 && this.isFirstLoadingDone) {
      this.preventLoadBottom = false;
    }

    // Scroll to bottom at the first time.
    if (this.props.isStartAtBottom && !this.isFirstLoadingDone) {
      this._scrollToBottomAtFirst();
      this.preventLoadBottom = true;
    } else if (!this.props.isStartAtBottom && !this.isFirstLoadingDone) {
      this.preventLoadTop = true;
      this.isFirstLoadingDone = true;
    }

    // Notify if viewport is not full.
    if (this.isFirstLoadingDone && this.estimateTotalHeight < height) {
      this.viewModel.enableLoadMoreTop();
    }

    // Check scroll to old position when load more top.
    if (this.isScrollBack) {
      this._scrollToItem(
        this.firstItemInViewportBeforeLoadTop.itemId,
        this.firstItemInViewportBeforeLoadTop.disparity
      );
      this.isScrollBack = false;
    }

    if (this.oldData.oldLength !== data.length && !this.isLoadingTop) {
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
    if (this.masonry !== undefined && this.loadDone) {
      this.isFirstLoadingDone = true;
      this.masonry.firstChild.scrollIntoView(false);
    }
  }

  // //TODO: add data at?
  // _updateMapOnAddData() {
  //   const data = this.viewModel.getDataList;
  //   const itemCache = this.viewModel.getItemCache;
  //
  //   if (this.oldData.oldLength < data.length) {
  //     itemCache.updateIndexMap(0, data);
  //     itemCache.updateItemsMap(0, data);
  //     this._updateItemsPosition();
  //     this._scrollToItem(this.firstItemInViewport.itemId, this.firstItemInViewport.disparity)
  //   }
  // }

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
  _updateItemsOnChangedHeight(itemId: string, newHeight: number, isRendered: boolean = true) {
    this.viewModel.getItemCache.updateItemHeight(itemId, newHeight, isRendered);
    this.viewModel._updateItemsPositionFromSpecifiedItem(itemId);
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

  _scrollToItem(itemId: string, disparity = 0) {
    const itemCache = this.viewModel.getItemCache;
    if (itemCache.hasItem(itemId)) {
      this._scrollToOffset(itemCache.getPosition(itemId) + disparity);
    }
  }
}

export default Masonry;
