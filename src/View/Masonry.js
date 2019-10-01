// @flow

import React from 'react';
import './scss/Masonry.scss';
import './anim/index.scss';
import {
  NOT_FOUND,
  DEBOUNCING_TIMER,
} from '../utils/value';
import CellMeasurer from '../CellMeasurer/CellMeasurer.js';
import isFunction from '../vendors/isFunction';
import debounce from '../vendors/debounce.js';
import { Scrollbars } from 'react-custom-scrollbars';
import * as Lodash from 'lodash/core';
import createMasonryViewModel from '../ViewModel/MasonryViewModel';
import isNum from '../utils/isNum.js';
import {
  AnimExecution,
  AnimName,
} from './AnimationExecution';
import GLog from '../utils/GLog';

type RenderDirection = 'TopDown' | 'BottomUp';

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
  scrollToAnim?: string,
  additionAnim?: string,
  removalAnim?: string,
  timingResetAnimation?: number,
  renderDirection?: RenderDirection,
  isVirtualized?: boolean,
  numOfOverscan?: number,
  forChatBoxView?: boolean,
};

const LOAD_MORE_TOP_TRIGGER_POS = 50;
let LOAD_MORE_BOTTOM_TRIGGER_POS = 0;
const NEED_TO_SCROLL_TOP_POS = 300;
const NEED_TO_SCROLL_BOTTOM_POS = 600;
const TIMING_ADDITION_ANIM_VIRTUALIZED = 100;
const TIMING_REMOVAL_ANIM_VIRTUALIZED = 250;
const TIMING_RAISE_ANIM_VIRTUALIZED = 230;

class Masonry extends React.Component<Props> {
  static defaultProps = {
    minWidth: 500,
    height: 500,
    minHeight: 500,
    style: {
      marginTop: '10px',
      borderRadius: '5px',
    },
    id: 'Masonry',
    isStartAtBottom: false,
    hideScrollToBottomBtn: false,
    isItemScrollToInBottom: false,
    timingResetAnimation: 1000,
    renderDirection: 'TopDown',
    forChatBoxView: true,
  };

  constructor(props) {
    super(props);
    this.viewModel = undefined;
    if (props && props.viewModel) {
      this.viewModel = props.viewModel;
    }
    else {
      this.viewModel = createMasonryViewModel({
        data: [],
      });
    }

    this.scrTopTimeOutId = undefined;
    this.scrUpTimeOutId = undefined;
    this.scrDownTimeOutId = undefined;

    /* Scroll to bottom when the first loading */
    this.isFirstLoadingDone = false;
    this.isLoadingTop = false;
    this.isLoadNewItemsDone = false; // Prevent load more on zoom to item when item is not rendered
    this.preventLoadTop = true;
    this.preventLoadBottom = true;
    this.firstItemInViewportBefore = {};
    this.curItemInViewPort = undefined;

    this.justLoadTop = false; // Prevent call scroll to current item (in last render curItem equals first item) when having new item. This conflict with scroll back when load top.
    this.isLoadMore = false;
    this.loadMoreTopCount = 0; // resolves remove incorrect item when removal animation end.
    this.needScrollTopWithAnim = false; // turn on this flag when remove an item in case after remove, list's height is greater than total items' height
    this.isAddMore = false;
    this.preventUpdateFirstItemInViewportWhenAdd = false; // [Virtualized] when add items, store first item to scroll back
    this.isAddFirst = false;
    this.needScrollTop = false;
    this.isAddLast = false;
    this.needScrollBottom = false;
    this.newLastItemsTotalHeight = 0;
    this.needScrollBack = false;
    this.initLoadDone = false;
    this.initItemCount = 0;
    this.needScrollBackWhenHavingNewItem = false;

    this.isRemoveItem = false;
    this.needScrollBackWhenRemoveItem = false;

    // For removal anim in Virtualized
    this.needHoldItemToExcuteRemovalAnim = false;
    this.removedElements = [
      {
        item: undefined,
        index: 0,
      },
    ];

    // Raise Item
    this.needHoldItemToExcuteRaiseAnim = false;
    this.needToExcuteRaiseAnimOutside = false;
    this.beRaisedItemId = undefined;
    this.needScrollBackWhenRaiseItem = false;
    this.itemScrollBackWhenRaiseOutside = {};

    this.isActiveAnimWhenScrollToItem = undefined;
    this.isScrollToSpecialItem = false;
    this.needScrollToSpecialItem = false;
    this.scrollToSpecialItemCount = 0;
    this.numOfNewLoading = 0;
    this.itemIdToScroll = '';

    this.oldData = {
      oldLength: 0,
      firstItem: {},
      lastItem: {},
    };

    this.isStableAfterScrollToSpecialItem = false;
    this.itemAddedScrollToAnim = {
      itemId: undefined,
      anim: undefined,
    };

    this.estimateTotalHeight = 0;
    this.oldEstimateTotalHeight = 0;

    this.oldMap = new Map();
    this.children = [];
    this.needReRenderChildrenChangedHeight = true; // Reload children when item change height.
    this.oldItemsInBatch = undefined;
    this.itemsInBatch = undefined;

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
      intervalId: 0,
      isScrolling: false,
    };

    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
    this.onChildrenChangeHeight = this.onChildrenChangeHeight.bind(this);
    this.scrollToSpecialItem = this.scrollToSpecialItem.bind(this);
    this._addStaticItemToChildren = this._addStaticItemToChildren.bind(this);
    this.onLoadMoreTop = this.onLoadMoreTop.bind(this);
    this.onLoadMore = this.onLoadMore.bind(this);
    this.reRender = this.reRender.bind(this);
    this.zoomToItem = this.zoomToItem.bind(this);
    this.pendingScrollToSpecialItem = this.pendingScrollToSpecialItem.bind(this);
    this.scrollToTopAtCurrentUI = this.scrollToTopAtCurrentUI.bind(this);
    this.scrollToBottomAtCurrentUI = this.scrollToBottomAtCurrentUI.bind(this);
    this.scrollTo = this.scrollTo.bind(this);
    this.onRemoveItem = this.onRemoveItem.bind(this);
    this.onRemoveItems = this.onRemoveItems.bind(this);
    this.updateUIWhenScrollToItem = this.updateUIWhenScrollToItem.bind(this);
    this.onAddItems = this.onAddItems.bind(this);
    this.onRaiseItem = this.onRaiseItem.bind(this);

    this._removeStyleOfSpecialItem = this._removeStyleOfSpecialItem.bind(this);
    this._removeScrollBackItemTrigger = this._removeScrollBackItemTrigger.bind(this);
    this._clearIntervalId = this._clearIntervalId.bind(this);

    //region ScrollBar
    this._scrollBar = undefined;
    this.scrollTop = this.scrollTop.bind(this);
    this.scrollLeft = this.scrollLeft.bind(this);
    this.scrollToTop = this.scrollToTop.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);
    this.scrollToLeft = this.scrollToLeft.bind(this);
    this.scrollToRight = this.scrollToRight.bind(this);
    this.getScrollLeft = this.getScrollLeft.bind(this);
    this.getScrollTop = this.getScrollTop.bind(this);
    this.getScrollWidth = this.getScrollWidth.bind(this);
    this.getScrollHeight = this.getScrollHeight.bind(this);
    this.getClientWidth = this.getClientWidth.bind(this);
    this.getClientHeight = this.getClientHeight.bind(this);
    this.getValues = this.getValues.bind(this);
    //endregion

    this.initialize();
  }

  initialize() {
    const data = this.viewModel.getDataUnfreeze();
    const {isVirtualized} = this.props;
    this.children = [];
    this._updateOldData();

    if (Array.isArray(data)) {
      if (!isVirtualized) {
        // eslint-disable-next-line array-callback-return
        data.map((item, index) => {
          this._addStaticItemToChildren(index, item);
        });
      }
    }
    else {
      console.error('Data list is not an array');
    }

    //this.itemsInBatch = [...dataOnList];
    this.estimateTotalHeight = this._getEstimatedTotalHeight();
    this.oldEstimateTotalHeight = this.estimateTotalHeight;
  }

  componentDidMount() {
    const {height} = this.props;
    if (
      this.parentRef &&
      this.parentRef.current &&
      this.parentRef.current.firstChild
    ) {
      this.masonry = this.parentRef.current.firstChild;
    }

    window.addEventListener('resize', debounce(this._onResize, DEBOUNCING_TIMER));
    window.addEventListener('mousedown', this._removeStyleOfSpecialItem);

    this.viewModel.addEventListener('viewOnLoadMoreTop', this.onLoadMoreTop);
    this.viewModel.addEventListener('viewOnLoadMore', this.onLoadMore);
    this.viewModel.addEventListener('viewReRender', this.reRender);
    this.viewModel.addEventListener('viewZoomToItem', this.zoomToItem);
    this.viewModel.addEventListener('viewPendingScrollToSpecialItem', this.pendingScrollToSpecialItem);
    this.viewModel.addEventListener('viewScrollToTopAtCurrentUI', this.scrollToTopAtCurrentUI);
    this.viewModel.addEventListener('viewScrollToBottomAtCurrentUI', this.scrollToBottomAtCurrentUI);
    this.viewModel.addEventListener('viewScrollTo', this.scrollTo);
    this.viewModel.addEventListener('viewOnRemoveItem', this.onRemoveItem);
    this.viewModel.addEventListener('viewOnRemoveItems', this.onRemoveItems);
    this.viewModel.addEventListener('viewUpdateUIWhenScrollToItem', this.updateUIWhenScrollToItem);
    this.viewModel.addEventListener('viewOnAddItems', this.onAddItems);
    this.viewModel.addEventListener('viewOnRaiseItem', this.onRaiseItem);

    if (
      this.parentRef !== undefined &&
      this.parentRef.current &&
      this.parentRef.current.offsetTop
    ) {
      this.btnScrollBottomPos.top = this.parentRef.current.offsetTop + height - 50;
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);

    this.viewModel.removeEventListener('viewOnLoadMoreTop', this.onLoadMoreTop);
    this.viewModel.removeEventListener('viewOnLoadMore', this.onLoadMore);
    this.viewModel.removeEventListener('viewReRender', this.reRender);
    this.viewModel.removeEventListener('viewZoomToItem', this.zoomToItem);
    this.viewModel.removeEventListener('viewPendingScrollToSpecialItem', this.pendingScrollToSpecialItem);
    this.viewModel.removeEventListener('viewScrollToTopAtCurrentUI', this.scrollToTopAtCurrentUI);
    this.viewModel.removeEventListener('viewScrollToBottomAtCurrentUI', this.scrollToBottomAtCurrentUI);
    this.viewModel.removeEventListener('viewScrollTo', this.scrollTo);
    this.viewModel.removeEventListener('viewOnRemoveItem', this.onRemoveItem);
    this.viewModel.removeEventListener('viewUpdateUIWhenScrollToItem', this.updateUIWhenScrollToItem);
    this.viewModel.removeEventListener('viewOnAddItem', this.onAddItem);
  }

  updateUIWhenScrollToItem() {
    const data = this.viewModel.getDataUnfreeze();
    const {isVirtualized} = this.props;
    this.children = [];
    this._updateOldData();

    if (Array.isArray(data)) {
      if (isVirtualized) {
        // eslint-disable-next-line array-callback-return
        data.map((item, index) => {
          this._addStaticItemToChildren(index, item);
        });
      }
    }
    else {
      console.error('Data list is not an array');
    }

    this.estimateTotalHeight = (function () {
      let totalHeight = 0;
      for (let key of this.viewModel.getCache().getItemsMap.keys()) {
        totalHeight += this.viewModel.getCache().getHeight(key);
      }
      return totalHeight;
    }).call(this);
    this.oldEstimateTotalHeight = this.estimateTotalHeight;

    this.setState(this.state);
  }

  onChildrenChangeHeight(itemId: string, oldHeight: number, newHeight: number) {
    const itemCache = this.viewModel.getCache();
    const {height, isVirtualized, scrollToAnim} = this.props;
    const {scrollTop} = this.state;
    const isRendered = itemCache.isRendered(itemId);

    if (
      itemId &&
      isNum(oldHeight) &&
      isNum(newHeight) &&
      // case defaultHeight = real height
      (itemCache.getHeight(itemId) !== newHeight || !isRendered) &&
      itemCache.getHeight(itemId) !== NOT_FOUND
    ) {
      // this.firstItemInViewportBefore = {
      //   itemId: this.curItemInViewPort,
      //   disparity: this.state.scrollTop - itemCache.getPosition(this.curItemInViewPort),
      // };

      // Debut
      if (!isRendered) {

        // For load more top
        if (!isRendered && itemCache.getIndex(itemId) < itemCache.getIndex(this.oldFirstItem)) {
          this.needScrollBack = true;
        }
        // Scroll back to old position when add an item above
        else if (!isRendered && itemCache.getIndex(itemId) < itemCache.getIndex(this.firstItemInViewportBefore.itemId)) {
          this.needScrollBack = true;
        }

        if (!isRendered && this.isFirstLoadingDone) {
          const {additionAnim, timingResetAnimation} = this.props;
          this.addAnimWhenAppearance(additionAnim, timingResetAnimation);
        }

        this._updateItemsOnChangedHeight(itemId, newHeight, true);

        if (isVirtualized) {
          if (this.isFirstLoadingDone) {
            if (itemCache.getIndex(this.curItemInViewPort) >= itemCache.getIndex(itemId)) {
              this.itemScrollBackWhenHavingNewItem = {
                itemId: this.curItemInViewPort.toString(),
                disparity: scrollTop - itemCache.getPosition(this.curItemInViewPort) + newHeight - itemCache.getDefaultHeight,
              };
              //console.log(JSON.parse(JSON.stringify(this.state.scrollTop)), this.itemScrollBackWhenHavingNewItem.itemId, this.itemScrollBackWhenHavingNewItem.disparity, itemId);

              this.needScrollBackWhenHavingNewItem = true;
            }

            // Animation for new item
            const itemsIndex = this._getItemsIndexInViewport(scrollTop, height);
            if (itemCache.getIndex(itemId) >= itemsIndex.firstItemIndex &&
              itemCache.getIndex(itemId) <= itemsIndex.lastItemIndex) {
              const el = document.getElementById(itemId);
              let parent;
              if (el) {
                AnimExecution.executeDefaultAnim(el, AnimName.zoomIn, 0, 0, TIMING_ADDITION_ANIM_VIRTUALIZED);
                parent = el.parentElement;
                if (parent && parent.children) {
                  for (let i = 0; i < parent.children.length; i++) {
                    if (parent.children[i]) {
                      const id = parent.children[i].id;
                      if (id !== itemId && this.oldMap.get(id) !== undefined) {
                        if (itemCache.getIndex(id) > itemCache.getIndex(itemId)) {
                          parent.children[i].style.willChange = 'transform';
                          const fromPos = -newHeight / 1.2;
                          AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, fromPos, 0, TIMING_ADDITION_ANIM_VIRTUALIZED);
                          parent.children[i].style.willChange = 'auto';
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          if (!this.isFirstLoadingDone && !this.props.isStartAtBottom && itemCache.getIndex(itemId) === 0) {
            // Render first item => call scroll top on componentDidMount
            this.isFirstLoadingDone = true;
          }
        }
        // Non-Virtualized
        else {
          if (this.initItemCount < this.viewModel.getDataUnfreeze().length - 1) {
            this.initItemCount++;
          }
          else if (this.initItemCount === this.viewModel.getDataUnfreeze().length - 1) {
            this.initLoadDone = true;
          }

          if (this.isAddLast) {
            this.newLastItemsTotalHeight += newHeight;
          }

          const isDone = !(this.scrollToSpecialItemCount < this.numOfNewLoading - 1);
          if (!isDone) {
            this.scrollToSpecialItemCount++;
          }
          else if (isDone && this.numOfNewLoading !== 0) {
            if (this.isFirstLoadingDone) {
              // Scroll to top when add an item in top && scrollTop is near top
              if (this.isAddFirst) {
                this.isAddFirst = false;
                this.needScrollTop = true;
              }

              // Scroll to bottom when add an item in bottom && scrollTop is near bottom
              if (this.isAddLast) {
                this.isAddLast = false;
                this.needScrollBottom = true;
              }

              this.scrollToSpecialItemCount = 0;
              this.numOfNewLoading = 0;

              if (this.isScrollToSpecialItem) {
                this.needScrollToSpecialItem = true;
              }

              console.log('aaaaaaaaaaa');
              this.isLoadNewItemsDone = true;
            }
          }
        }

        this._updateEstimatedHeight(newHeight - oldHeight);
      }
      // re-mount with other size
      else {
        if (itemCache.getIndex(itemId) < itemCache.getIndex(this.firstItemInViewportBefore.itemId)) {
          this.difSizeWhenReMount = true;
          this.needScrollBack = true;
        }
        const itemOldHeight = itemCache.getHeight(itemId);
        this._updateItemsOnChangedHeight(itemId, newHeight);
        this._updateEstimatedHeight(newHeight - itemOldHeight);
      }
      this.needReRenderChildrenChangedHeight = true;
      this.setState(this.state); // instead of this.forceUpdate();
    }

    // Add anim for the item has rendered but not in batch in virtualized list
    if (itemId && this.itemNeedAddAnim === itemId) {
      this.addAnimWhenScrollToSpecialItem(itemId, this.props.scrollToAnim);
      this.itemNeedAddAnim = null;
    }

    const rangeIndexInViewport = this._getItemsIndexInViewport(scrollTop, height);
    if (
      itemId &&
      isNum(oldHeight) &&
      isNum(newHeight) &&
      this.needToExcuteRaiseAnimOutside &&
      this.beRaisedItemId === itemId &&
      itemCache.getIndex(itemId) >= rangeIndexInViewport.firstItemIndex &&
      itemCache.getIndex(itemId) <= rangeIndexInViewport.lastItemIndex) {
      this.needToExcuteRaiseAnimOutside = false;
      const el = document.getElementById(itemId);
      if (el) {
        const parent = el.parentElement;
        if (parent && parent.children) {
          for (let i = 0; i < parent.children.length; i++) {
            if (parent.children[i] && parent.children[i].id) {
              const id = parent.children[i].id;
              if (id !== itemId) {
                parent.children[i].style.willChange = 'transform';
                AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, -itemCache.getHeight(itemId) / 1.5, 0, TIMING_RAISE_ANIM_VIRTUALIZED);
                parent.children[i].style.willChange = 'auto';
              }
            }
          }
        }
        AnimExecution.executeDefaultAnim(el, AnimName.zoomIn, 0, 0, TIMING_RAISE_ANIM_VIRTUALIZED);
      }
    }
    else if (this.needToExcuteRaiseAnimOutside) {
      this.needToExcuteRaiseAnimOutside = false;
      this.needScrollBackWhenRaiseItem = true;
      this.reRender();
    }
  }

  onAddItems(startIndex, items, oldMap) {
    if (
      items &&
      Array.isArray(items) &&
      isNum(startIndex)
    ) {
      this.isAddMore = true;
      this.numOfNewLoading = items.length;
      this.oldMap = oldMap;

      this._removeStyleOfSpecialItem();

      const selectedIndex = this.viewModel.getSelectedItem();
      if (startIndex + items.length <= selectedIndex + 1) {
        this.viewModel.setSelectedItem(selectedIndex + items.length);
      }

      // Conflict with trigger load more when scroll to first | last item on UI
      this._clearIntervalId();

      if (parseInt(startIndex) === 0) {
        this.isAddFirst = true;
      }
      if (parseInt(startIndex) + items.length === this.viewModel.getDataUnfreeze().length) {
        this.isAddLast = true;
      }

      const stateScrollTop = this.state.scrollTop;

      if (
        this.props.isVirtualized &&
        !this.preventUpdateFirstItemInViewportWhenAdd &&
        oldMap.get(this.curItemInViewPort)
      ) {
        this.preventUpdateFirstItemInViewportWhenAdd = true;
        // Usage to scroll back, prevent flick view
        this.firstItemInViewportBefore = {
          itemId: this.curItemInViewPort,
          disparity: stateScrollTop - oldMap.get(this.curItemInViewPort).position,
        };
        console.log(this.firstItemInViewportBefore);
      }

      if (!this.props.isVirtualized) {
        let index = startIndex;
        for (let i = 0; i < items.length; i++) {
          this._addStaticItemToChildren(index, items[i]);
          index++;
        }
      }
      this._updateEstimatedHeight(this.viewModel.getCache().defaultHeight * items.length);
    }
  }

  onRemoveItem({removedItemId, removedItemIndex, removedItemHeight, removedItemPos, removedItem, oldMap}) {
    const {height, isVirtualized, scrollToAnim, removalAnim} = this.props;
    const {scrollTop} = this.state;

    this._removeStyleOfSpecialItem();
    this.removedElements = [];

    // ToNumber(null) = 0 => isNaN(null) = false
    if (
      removedItemId &&
      isNum(removedItemIndex) &&
      isNum(removedItemHeight) &&
      isNum(removedItemPos)
    ) {
      const itemIndex = removedItemIndex;
      const itemHeight = removedItemHeight;
      const itemCache = this.viewModel.getCache();

      const selectedItemIndex = this.viewModel.getSelectedItem();
      if (removedItemIndex === selectedItemIndex) {
        this.viewModel.clearSelectedItem();
      }
      else if (removedItemIndex < selectedItemIndex) {
        this.viewModel.setSelectedItem(selectedItemIndex - 1);
      }

      this.isRemoveItem = true;

      if (itemCache.getIndex(this.curItemInViewPort) === NOT_FOUND) {
        // flick view :)
      }
      else if (
        itemCache.getIndex(this.curItemInViewPort) !== NOT_FOUND &&
        removedItemIndex <= itemCache.getIndex(this.curItemInViewPort)
      ) {
        this.needScrollBackWhenRemoveItem = true;
        this.removedItemHeight = itemHeight;
      }

      const el = document.getElementById(removedItemId);
      let parent;
      if (el) {
        AnimExecution.removeStyle(el, scrollToAnim);
        const estimateTotalHeight = this.estimateTotalHeight;
        requestAnimationFrame(function () {
          el.style.position = 'absolute';
          if (scrollTop + height >= estimateTotalHeight && estimateTotalHeight >= height) {
            el.style.top = removedItemPos - removedItemHeight + 'px';
          }
          else {
            el.style.top = removedItemPos + 'px';
          }
        });
        parent = el.parentElement;
      }

      // Non-virtualized list
      if (!isVirtualized && el) {
        const stuntman = document.createElement('DIV');
        requestAnimationFrame(function () {
          stuntman.id = removedItemId + '_fake';
          stuntman.setAttribute('style', `height: ${itemHeight}px; width:100%; clear:both; position: relative`);
        });
        if (parent) {
          parent.insertBefore(stuntman, el);
        }

        const oldChildrenLength = this.children.length;
        AnimExecution.appendStyle(el, removalAnim);

        el.addEventListener('animationend', () => {
          this._updateEstimatedHeight(-itemHeight);
          this._updateOldData();

          console.log(oldChildrenLength);

          // Check in case be loaded more
          if (oldChildrenLength !== this.children.length) {
            console.log('el - diff', removedItemId, itemIndex);
            this.children.splice(itemIndex + this.loadMoreTopCount, 1);
          }
          else {
            console.log('el - non', removedItemId, itemIndex);
            this.children.splice(itemIndex, 1);
          }

          this.isLoadMore = false;
          this.loadMoreTopCount = 0;
          this.setState(this.state);
        });

        el.addEventListener('onanimationcancel', () => {
          console.log('el - cancel');
          this._updateEstimatedHeight(-itemHeight);
          this._updateOldData();

          // Check in case be loaded more
          if (oldChildrenLength !== this.children.length) {
            // remove from UI
            this.children.splice(itemIndex + this.loadMoreTopCount, 1);
          }
          else {
            // remove from UI
            this.children.splice(itemIndex, 1);
          }

          this.isLoadMore = false;
          this.loadMoreTopCount = 0;
          this.setState(this.state);
        });

        if (this.estimateTotalHeight > height &&
          scrollTop >= itemHeight &&
          this.estimateTotalHeight - itemHeight > height &&
          scrollTop >= this.estimateTotalHeight - height - itemHeight) {

          const topEl = document.createElement('DIV');
          requestAnimationFrame(function () {
            topEl.setAttribute('style', `height: 0px; width:100%; clear:both; position: relative`);
            topEl.style.setProperty('--itemHeight', itemHeight + 'px');
          });
          parent.prepend(topEl);

          AnimExecution.appendStyle(topEl, 'makeBigger');
          topEl.addEventListener('animationend', () => {
            parent.removeChild(topEl);
          });
        }
        else if (this.estimateTotalHeight - itemHeight < height) {
          this.needScrollTopWithAnim = true;
        }

        requestAnimationFrame(function () {
          stuntman.style.setProperty('--itemHeight', itemHeight + 'px');
        });
        AnimExecution.appendStyle(stuntman, 'makeInvisible');
        stuntman.addEventListener('animationend', () => {
          // remove from UI
          parent.removeChild(stuntman);
        });
        stuntman.addEventListener('onanimationcancel', () => {
          // remove from UI
          parent.removeChild(stuntman);
        });
      }
      // Virtualized list
      else {
        const rangeIndexInViewport = this._getItemsIndexInViewport(scrollTop, height);
        if (
          rangeIndexInViewport &&
          itemIndex >= rangeIndexInViewport.firstItemIndex &&
          itemIndex <= rangeIndexInViewport.lastItemIndex + 1
        ) {
          this.needHoldItemToExcuteRemovalAnim = true;
          let pos = 0;
          if (oldMap.get(removedItemId) && isNum(oldMap.get(removedItemId).position)) {
            pos = oldMap.get(removedItemId).position;
          }
          this.removedElements.push({
            item: removedItem,
            index: removedItemIndex,
            position: pos,
          });
        }
        if (el) {
          AnimExecution.executeDefaultAnim(el, AnimName.zoomOut, 0, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
          setTimeout(() => {
            this.needHoldItemToExcuteRemovalAnim = false;
            this.reRender();
          }, TIMING_REMOVAL_ANIM_VIRTUALIZED);
        }

        if (this.estimateTotalHeight <= height) {
          // Not full view
          if (parent && parent.children) {
            for (let i = 0; i < parent.children.length; i++) {
              if (parent.children[i]) {
                const id = parent.children[i].id;
                if (id !== removedItemId && oldMap.get(id) !== undefined) {
                  if (itemCache.getIndex(id) >= removedItemIndex) {
                    parent.children[i].style.willChange = 'transform';
                    const fromPos = oldMap.get(id).position - itemCache.getPosition(id);
                    AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, fromPos, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                    parent.children[i].style.willChange = 'auto';
                  }
                }
              }
            }
            // last item will hidden with inner list is updated (-itemHeight) => (+itemHeight) with return old height
            this._updateEstimatedHeight(itemHeight);
            setTimeout(() => {
                this._updateEstimatedHeight(-itemHeight);
                this.reRender();
              },
              TIMING_REMOVAL_ANIM_VIRTUALIZED);
          }
        }
        else if (scrollTop + height >= this.estimateTotalHeight - 2) {
          // At bottom
          if (parent && parent.children) {
            for (let i = 0; i < parent.children.length; i++) {
              if (parent.children[i]) {
                const id = parent.children[i].id;
                if (id !== removedItemId && oldMap.get(id) !== undefined) {
                  if (itemCache.getIndex(id) < removedItemIndex) {
                    parent.children[i].style.willChange = 'transform';
                    const fromPos = -removedItemHeight;
                    AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, fromPos, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                    parent.children[i].style.willChange = 'auto';
                  }
                }
              }
            }
          }
        }
        else if (scrollTop + height > this.estimateTotalHeight - itemHeight) {
          // Will trigger load bottom
          if (parent && parent.children) {
            for (let i = 0; i < parent.children.length; i++) {
              if (parent.children[i]) {
                const id = parent.children[i].id;
                if (id !== removedItemId && oldMap.get(id) !== undefined) {
                  if (itemCache.getIndex(id) >= removedItemIndex) {
                    parent.children[i].style.willChange = 'transform';
                    const fromPos = oldMap.get(id).position - itemCache.getPosition(id);
                    AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, fromPos, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                    parent.children[i].style.willChange = 'auto';
                  }
                }
              }
            }
            this._updateEstimatedHeight(itemHeight);
            setTimeout(() => {
                this._updateEstimatedHeight(-itemHeight);
                this.reRender();
              },
              TIMING_REMOVAL_ANIM_VIRTUALIZED);
          }
        }
        else {
          if (parent && parent.children) {
            for (let i = 0; i < parent.children.length; i++) {
              if (parent.children[i]) {
                const id = parent.children[i].id;
                if (id !== removedItemId && oldMap.get(id) !== undefined) {
                  parent.children[i].style.willChange = 'transform';
                  const fromPos = oldMap.get(id).position - itemCache.getPosition(id);
                  AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, fromPos, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                  parent.children[i].style.willChange = 'auto';
                }
              }
            }
          }
        }

        this._updateEstimatedHeight(-itemHeight);
      }
    }
  }

  onRemoveItems({removedItemsId, startIndex, removedLastItemIndex, deleteCount, removedItemsHeight, removedFirstItemPos, removedItems, oldMap}) {
    console.log({
      removedItemsId,
      startIndex,
      deleteCount,
      removedLastItemIndex,
      removedItemsHeight,
      removedFirstItemPos,
      removedItems,
    });
    const {height, isVirtualized} = this.props;
    const {scrollTop} = this.state;

    this._removeStyleOfSpecialItem();
    this.removedElements = [];

    if (
      removedItemsId &&
      isNum(startIndex) &&
      isNum(deleteCount) &&
      removedItemsHeight &&
      isNum(removedFirstItemPos)
    ) {
      const itemCache = this.viewModel.getCache();

      let totalItemsHeight = 0;
      if (Array.isArray(removedItemsHeight)) {
        for (let i = 0; i < removedItemsHeight.length; i++) {
          totalItemsHeight += removedItemsHeight[i];
        }
      }

      const selectedItemIndex = this.viewModel.getSelectedItem();
      if (selectedItemIndex >= startIndex + deleteCount) {
        this.viewModel.setSelectedItem(selectedItemIndex - deleteCount);
      }
      else if (startIndex <= selectedItemIndex && selectedItemIndex <= startIndex + deleteCount) {
        this.viewModel.clearSelectedItem();
      }

      this.isRemoveItem = true;

      // Non-virtualized list
      if (!isVirtualized) {

      }
      // Virtualized list
      else {
        const rangeIndexInViewport = this._getItemsIndexInViewport(scrollTop, height);
        const first = rangeIndexInViewport.firstItemIndex;
        const last = rangeIndexInViewport.lastItemIndex;
        const timing = TIMING_REMOVAL_ANIM_VIRTUALIZED;

        if (removedLastItemIndex < first) {
          // scroll back
          this.needScrollBackWhenRemoveItem = true;
          this.removedItemHeight = totalItemsHeight;
          this._updateEstimatedHeight(-totalItemsHeight);
        }
        else if (this.estimateTotalHeight < height) {
          console.log('[Remove Multi] - Case 1');
          this.needHoldItemToExcuteRemovalAnim = true;

          const els = [];
          let parent = null;
          for (let i = 0; i < removedItemsId.length; i++) {
            let pos = 0;
            if (oldMap.get(removedItemsId[i]) && isNum(oldMap.get(removedItemsId[i]).position)) {
              pos = oldMap.get(removedItemsId[i]).position;
            }
            this.removedElements.push({
              item: removedItems[i],
              index: removedLastItemIndex - deleteCount + 1 + i,
              position: pos,
            });
            const el = document.getElementById(removedItemsId[i]);
            if (el && parent === null) {
              parent = el.parentElement;
            }
            els.push(el);
          }

          for (let i = 0; i < els.length; i++) {
            if (els[i]) {
              setTimeout(() => {
                AnimExecution.executeDefaultAnim(els[i], AnimName.zoomOut, 0, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
              }, (timing / els.length) * (els.length - i - 1));
            }
          }

          if (parent && parent.children) {
            for (let i = 0; i < parent.children.length; i++) {
              if (parent.children[i]) {
                const id = parent.children[i].id;
                if (!removedItemsId.includes(id) && oldMap.get(id) !== undefined) {
                  if (itemCache.getIndex(id) >= removedLastItemIndex - deleteCount) {
                    parent.children[i].style.willChange = 'transform';
                    const fromPos = oldMap.get(id).position - itemCache.getPosition(id);
                    AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, fromPos, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                    parent.children[i].style.willChange = 'auto';
                  }
                }
              }
            }
          }

          setTimeout(() => {
            this.needHoldItemToExcuteRemovalAnim = false;
            this._updateEstimatedHeight(-totalItemsHeight);
            this.reRender();
          }, TIMING_REMOVAL_ANIM_VIRTUALIZED);
        }
        else if (this.estimateTotalHeight - scrollTop - height < totalItemsHeight) {
          this.needHoldItemToExcuteRemovalAnim = true;

          const els = [];
          let parent = null;
          for (let i = 0; i < removedItemsId.length; i++) {
            let pos = 0;
            if (oldMap.get(removedItemsId[i]) && isNum(oldMap.get(removedItemsId[i]).position)) {
              pos = oldMap.get(removedItemsId[i]).position;
            }
            this.removedElements.push({
              item: removedItems[i],
              index: removedLastItemIndex - deleteCount + 1 + i,
              position: pos,
            });
            const el = document.getElementById(removedItemsId[i]);
            if (el && parent === null) {
              parent = el.parentElement;
            }
            els.push(el);
          }

          // After remove items, need to check whether estimate height is lesser than height?
          // If yes, call scroll to while removing
          if (this.estimateTotalHeight - totalItemsHeight <= height) {
            GLog.logInfo(this, '[Remove Multi] - Case', 2.1);
            for (let i = 0; i < els.length; i++) {
              if (els[i]) {
                setTimeout(() => {
                  AnimExecution.executeDefaultAnim(els[i], AnimName.zoomOut, 0, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                }, (timing / els.length) * (els.length - i - 1));
              }
            }

            if (parent && parent.children) {
              for (let i = 0; i < parent.children.length; i++) {
                if (parent.children[i]) {
                  const id = parent.children[i].id;
                  if (!removedItemsId.includes(id) && oldMap.get(id) !== undefined) {
                    if (itemCache.getIndex(id) <= removedLastItemIndex - deleteCount) {

                    }
                    else {
                      parent.children[i].style.willChange = 'transform';
                      const fromPos = oldMap.get(id).position - itemCache.getPosition(id);
                      AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, fromPos, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                      parent.children[i].style.willChange = 'auto';
                    }
                  }
                }
              }
            }

            this._scrollTopWithAnim(TIMING_REMOVAL_ANIM_VIRTUALIZED);
            setTimeout(() => {
              this.needHoldItemToExcuteRemovalAnim = false;
              this._updateEstimatedHeight(-totalItemsHeight);
              this.reRender();
            }, TIMING_REMOVAL_ANIM_VIRTUALIZED);
          }
          else {
            GLog.logInfo(this, '[Remove Multi] - Case', 2.2);
            for (let i = 0; i < els.length; i++) {
              if (els[i]) {
                setTimeout(() => {
                  AnimExecution.executeDefaultAnim(els[i], AnimName.zoomOut, 0, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                }, (timing / (els.length + 1)) * (i));
              }
            }

            if (parent && parent.children) {
              for (let i = 0; i < parent.children.length; i++) {
                if (parent.children[i]) {
                  const id = parent.children[i].id;
                  if (!removedItemsId.includes(id) && oldMap.get(id) !== undefined) {
                    if (itemCache.getIndex(id) <= removedLastItemIndex - deleteCount) {
                      parent.children[i].style.willChange = 'transform';
                      const fromPos = totalItemsHeight;
                      AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, 0, fromPos, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                      parent.children[i].style.willChange = 'auto';
                    }
                    else {
                      parent.children[i].style.willChange = 'transform';
                      const fromPos = totalItemsHeight;
                      AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, fromPos, fromPos, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                      parent.children[i].style.willChange = 'auto';
                    }
                  }
                }
              }
            }

            setTimeout(() => {
              this.needHoldItemToExcuteRemovalAnim = false;
              this._scrollToOffset(scrollTop - totalItemsHeight);
              this._updateEstimatedHeight(-totalItemsHeight);
            }, TIMING_REMOVAL_ANIM_VIRTUALIZED);
          }
        }
        else if (startIndex < first && removedLastItemIndex >= last) {
          // ACE :D
          GLog.logInfo(this, '[Remove Multi] - Case', 3);
          this.needHoldItemToExcuteRemovalAnim = true;

          const els = [];
          let parent = null;
          for (let i = 0; i < removedItemsId.length; i++) {
            let pos = 0;
            if (oldMap.get(removedItemsId[i]) && isNum(oldMap.get(removedItemsId[i]).position)) {
              pos = oldMap.get(removedItemsId[i]).position;
            }
            this.removedElements.push({
              item: removedItems[i],
              index: removedLastItemIndex - deleteCount + 1 + i,
              position: pos,
            });
            const el = document.getElementById(removedItemsId[i]);
            if (el && parent === null) {
              parent = el.parentElement;
            }
            els.push(el);
          }

          for (let i = 0; i < els.length; i++) {
            if (els[i]) {
              setTimeout(() => {
                AnimExecution.executeDefaultAnim(els[i], AnimName.zoomOut, 0, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
              }, (timing / els.length) * (els.length - i - 1));
            }
          }
          this._updateEstimatedHeight(-totalItemsHeight);
          setTimeout(() => {
            this.needHoldItemToExcuteRemovalAnim = false;
          }, TIMING_REMOVAL_ANIM_VIRTUALIZED);
        }
        else if (startIndex < first && removedLastItemIndex >= first && removedLastItemIndex <= last) {
          GLog.logInfo(this, '[Remove Multi] - Case', 4);
          this.needHoldItemToExcuteRemovalAnim = true;

          const els = [];
          let parent = null;
          for (let i = 0; i < removedItemsId.length; i++) {
            let pos = 0;
            if (oldMap.get(removedItemsId[i]) && isNum(oldMap.get(removedItemsId[i]).position)) {
              pos = oldMap.get(removedItemsId[i]).position;
            }
            this.removedElements.push({
              item: removedItems[i],
              index: removedLastItemIndex - deleteCount + 1 + i,
              position: pos,
            });
            const el = document.getElementById(removedItemsId[i]);
            if (el && parent === null) {
              parent = el.parentElement;
            }
            els.push(el);
          }

          for (let i = 0; i < els.length; i++) {
            if (els[i]) {
              setTimeout(() => {
                AnimExecution.executeDefaultAnim(els[i], AnimName.zoomOut, 0, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
              }, (timing / els.length) * (els.length - i - 1));
            }
          }

          if (parent && parent.children) {
            for (let i = 0; i < parent.children.length; i++) {
              if (parent.children[i]) {
                const id = parent.children[i].id;
                if (!removedItemsId.includes(id) && oldMap.get(id) !== undefined) {
                  if (itemCache.getIndex(id) >= removedLastItemIndex - deleteCount) {
                    parent.children[i].style.willChange = 'transform';
                    const fromPos = oldMap.get(id).position - itemCache.getPosition(id);
                    AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, fromPos, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                    parent.children[i].style.willChange = 'auto';
                  }
                }
              }
            }
          }

          this._updateEstimatedHeight(-totalItemsHeight);

          setTimeout(() => {
            this.needHoldItemToExcuteRemovalAnim = false;
            this.reRender();
          }, TIMING_REMOVAL_ANIM_VIRTUALIZED);
        }
        else if (startIndex >= first && startIndex <= last) {
          GLog.logInfo(this, '[Remove Multi] - Case', 5);
          this.needHoldItemToExcuteRemovalAnim = true;

          const els = [];
          let parent = null;
          for (let i = 0; i < removedItemsId.length; i++) {
            let pos = 0;
            if (oldMap.get(removedItemsId[i]) && isNum(oldMap.get(removedItemsId[i]).position)) {
              pos = oldMap.get(removedItemsId[i]).position;
            }
            this.removedElements.push({
              item: removedItems[i],
              index: removedLastItemIndex - deleteCount + 1 + i,
              position: pos,
            });
            const el = document.getElementById(removedItemsId[i]);
            if (el && parent === null) {
              parent = el.parentElement;
            }
            els.push(el);
          }

          for (let i = 0; i < els.length; i++) {
            if (els[i]) {
              setTimeout(() => {
                AnimExecution.executeDefaultAnim(els[i], AnimName.zoomOut, 0, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
              }, (timing / els.length) * (els.length - i - 1));
            }
          }

          if (parent && parent.children) {
            for (let i = 0; i < parent.children.length; i++) {
              if (parent.children[i]) {
                const id = parent.children[i].id;
                if (!removedItemsId.includes(id) && oldMap.get(id) !== undefined) {
                  if (itemCache.getIndex(id) >= removedLastItemIndex - deleteCount) {
                    parent.children[i].style.willChange = 'transform';
                    const fromPos = oldMap.get(id).position - itemCache.getPosition(id);
                    AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, fromPos, 0, TIMING_REMOVAL_ANIM_VIRTUALIZED);
                    parent.children[i].style.willChange = 'auto';
                  }
                }
              }
            }
          }

          this._updateEstimatedHeight(-totalItemsHeight);

          setTimeout(() => {
            this.needHoldItemToExcuteRemovalAnim = false;
            this.reRender();
          }, TIMING_REMOVAL_ANIM_VIRTUALIZED);
        }
        else {
          GLog.logInfo(this, '[Remove Multi] - Case', 'Else');
          if (removedLastItemIndex - deleteCount) {
            console.log(deleteCount);
          }
          console.log(totalItemsHeight);
          this._updateEstimatedHeight(-totalItemsHeight);
          console.log(startIndex, removedLastItemIndex, first, last);
          this.reRender();
        }
      }
    }
  }

  onLoadMore(startIndex, items, firstItemId, oldPosOfFirstItem) {
    if (
      items &&
      Array.isArray(items) &&
      isNum(startIndex)
    ) {
      this.isLoadMore = true;
      this.numOfNewLoading = items.length;

      this._removeStyleOfSpecialItem();

      // Conflict with trigger load more when scroll to first | last item on UI
      this._clearIntervalId();

      if (parseInt(startIndex) === 0) {
        this.loadMoreTopCount = items.length;
      }

      if (!this.props.isVirtualized) {
        let index = startIndex;
        for (let i = 0; i < items.length; i++) {
          this._addStaticItemToChildren(index, items[i]);
          index++;
        }
      }

      this._updateEstimatedHeight(this.viewModel.getCache().getDefaultHeight * items.length);
    }
  }

  onRaiseItem(beRaisedItem, beforeBeRaisedIndex, oldMap) {
    const {height, scrollToAnim} = this.props;
    const scrollTop = this.state.scrollTop;
    const itemCache = this.viewModel.getCache();
    const beRaisedItemId = itemCache.getItemId(beRaisedItem);
    let isScrollToTop = false;
    const rangeIndexInViewport = this._getItemsIndexInViewport(scrollTop, height);

    const el = document.getElementById(beRaisedItemId);
    if (
      el &&
      beRaisedItemId !== NOT_FOUND &&
      isNum(beforeBeRaisedIndex) &&
      beforeBeRaisedIndex >= rangeIndexInViewport.firstItemIndex &&
      beforeBeRaisedIndex <= rangeIndexInViewport.lastItemIndex &&
      oldMap &&
      oldMap.get(beRaisedItemId)) {

      const _beforeBeRaisedIndex = parseInt(beforeBeRaisedIndex);
      if (this.viewModel.getSelectedItem() !== -1) {
        if (this.viewModel.getSelectedItem() === _beforeBeRaisedIndex) {
          this.viewModel.setSelectedItem(0);
          AnimExecution.appendStyle(el, 'highlighted');
          if (scrollTop !== 0) {
            isScrollToTop = true;
          }
        }
        else if (_beforeBeRaisedIndex >= this.viewModel.getSelectedItem()) {
          this.viewModel.setSelectedItem(this.viewModel.getSelectedItem() + 1);
        }
      }

      const rangeCurrentViewport = {
        top: scrollTop,
        bottom: scrollTop + height,
      };

      let oldPos = 0;
      if (oldMap.get(beRaisedItemId)) {
        oldPos = oldMap.get(beRaisedItemId).position;
      }

      if (oldPos >= rangeCurrentViewport.top && oldPos <= rangeCurrentViewport.bottom) {
        // start position of beRaisedItem in current viewport and the other is outside of batch.
        const itemsInBatch = this._getItemsInBatch(scrollTop);
        if (!itemsInBatch.includes(beRaisedItemId)) {
          this.needHoldItemToExcuteRaiseAnim = true;
        }
      }
      AnimExecution.removeStyle(el, scrollToAnim);
      el.style.zIndex = 2;
      AnimExecution.executeDefaultAnim(el, AnimName.verticalSlide, oldMap.get(beRaisedItemId).position, 0, TIMING_RAISE_ANIM_VIRTUALIZED);
      setTimeout(() => {
        this.needHoldItemToExcuteRaiseAnim = false;
        el.style.zIndex = 1;
        this.reRender();
      }, TIMING_RAISE_ANIM_VIRTUALIZED);

      const parent = el.parentElement;
      if (parent && parent.children) {
        for (let i = 0; i < parent.children.length; i++) {
          if (parent.children[i] && parent.children[i].id) {
            const id = parent.children[i].id;
            if (parent.children[i].id !== beRaisedItemId && itemCache.getIndex(id) <= _beforeBeRaisedIndex) {
              parent.children[i].style.willChange = 'transform';
              AnimExecution.executeDefaultAnim(parent.children[i], AnimName.verticalSlide, -itemCache.getHeight(beRaisedItemId), 0, TIMING_RAISE_ANIM_VIRTUALIZED);
              parent.children[i].style.willChange = 'auto';
            }
          }
        }
      }

      if (isScrollToTop) {
        if (this.props.id) {
          const masonry = document.getElementById('innerScrollContainerId');
          if (masonry) {
            if (scrollTop >= 1120) {
              setTimeout(() => {
                this._scrollToOffset(1120);
                this._scrollTopWithAnim(TIMING_RAISE_ANIM_VIRTUALIZED);
              }, TIMING_RAISE_ANIM_VIRTUALIZED / 2);
            }
            else {
              this._scrollTopWithAnim(TIMING_RAISE_ANIM_VIRTUALIZED);
            }
            //AnimExecution.executeDefaultAnim(masonry, AnimName.scrollTop, scrollTop, 0, TIMING_RAISE_ANIM_VIRTUALIZED);
          }
        }
      }
    }
    // out of view but in batch both start and end position => not call onChangedHeight
    else if (
      el &&
      beRaisedItemId !== NOT_FOUND &&
      isNum(beforeBeRaisedIndex) &&
      oldMap &&
      oldMap.get(beRaisedItemId)) {

      this.needScrollBackWhenRaiseItem = true;

      let dis = 0;
      if (oldMap.get(this.curItemInViewPort)) {
        dis = scrollTop - oldMap.get(this.curItemInViewPort).position;
      }
      this.itemScrollBackWhenRaiseOutside = {
        itemId: this.curItemInViewPort,
        disparity: dis,
      };

      if (this.viewModel.getSelectedItem() !== -1) {
        if (this.viewModel.getSelectedItem() === parseInt(beforeBeRaisedIndex)) {
          this.viewModel.setSelectedItem(0);
        }
        else if (parseInt(beforeBeRaisedIndex) >= this.viewModel.getSelectedItem()) {
          this.viewModel.setSelectedItem(this.viewModel.getSelectedItem() + 1);
        }
      }
    }
    // item's start position out of view and call onChangedHeight
    else if (beRaisedItemId !== NOT_FOUND && isNum(beforeBeRaisedIndex) && oldMap && oldMap.get(beRaisedItemId)) {
      this.beRaisedItemId = beRaisedItemId;
      this.needToExcuteRaiseAnimOutside = true;

      let dis = 0;
      if (oldMap.get(this.curItemInViewPort)) {
        dis = scrollTop - oldMap.get(this.curItemInViewPort).position;
      }
      this.itemScrollBackWhenRaiseOutside = {
        itemId: this.curItemInViewPort,
        disparity: dis,
      };
      if (this.viewModel.getSelectedItem() !== -1) {
        if (this.viewModel.getSelectedItem() === parseInt(beforeBeRaisedIndex)) {
          this.viewModel.setSelectedItem(0);
        }
        else if (parseInt(beforeBeRaisedIndex) >= this.viewModel.getSelectedItem()) {
          this.viewModel.setSelectedItem(this.viewModel.getSelectedItem() + 1);
        }
      }
    }

    this.reRender();
  }

  zoomToItem(itemId: string, withAnim: boolean = true) {
    this._clearIntervalId();
    if (itemId) {
      if (itemId === this.itemIdToScroll && this.isStableAfterScrollToSpecialItem && withAnim) {
        // Re-active animation without scroll.
        if (itemId && this.props.scrollToAnim) {
          // TODO: Raf
          const curEl = this.getElementFromId(itemId);
          const newEl = curEl.cloneNode(true);
          const parentNode = curEl.parentNode;
          parentNode.replaceChild(newEl, curEl);
          parentNode.replaceChild(curEl, newEl);
          this._removeScrollBackItemTrigger();
        }
      }
      else {
        this.itemIdToScroll = itemId;
        this.isScrollToSpecialItem = true;
        this.scrollToSpecialItem(this.itemIdToScroll, withAnim);
      }
    }
  }

  scrollToSpecialItem(itemId: string, withAnim: boolean = true) {
    const {
      height,
      isItemScrollToInBottom,
      scrollToAnim,
      forChatBoxView,
    } = this.props;

    this._clearIntervalId();

    const itemCache = this.viewModel.getCache();

    this.preventLoadTop = true;
    this.preventLoadBottom = true;

    const itemPos = itemCache.getPosition(itemId);
    const itemHeight = itemCache.getHeight(itemId);
    let scrollTop = 0;

    if (forChatBoxView) {
      // for chat box view scroll to item
      if (
        itemHeight > height ||
        itemPos + itemHeight < height ||
        !isItemScrollToInBottom
      ) {
        scrollTop = itemPos;
      }
      else {
        scrollTop = itemPos + itemHeight - height;
      }

      if (withAnim) {
        if (this.estimateTotalHeight < height) {
          this._removeStyleOfSpecialItem();
          this._removeScrollBackItemTrigger();
          this.addAnimWhenScrollToSpecialItem(itemId, scrollToAnim);
        }
        else if (scrollTop < this.state.scrollTop) {
          this._scrollToItemWithAnimUp(scrollTop, itemId, scrollToAnim);
        }
        else {
          this._scrollToItemWithAnimDown(scrollTop, itemId, scrollToAnim);
        }
      }
      else {
        this._removeScrollBackItemTrigger();
        this._scrollToOffset(scrollTop);
        this.addAnimWhenScrollToSpecialItem(itemId, scrollToAnim);
      }
    }
    else {
      // for msg chat scroll to item
      const rangeView = {
        start: this.state.scrollTop,
        end: this.state.scrollTop + height,
      };
      if (itemPos + itemHeight <= rangeView.start || itemPos >= rangeView.end) {
        // OUT of view
        if (itemPos < rangeView.start) {
          // above
          scrollTop = itemPos;
          this._removeScrollBackItemTrigger();
          this._scrollToOffset(scrollTop);
          this.addAnimWhenScrollToSpecialItem(itemId, scrollToAnim);
        }
        else {
          // under
          scrollTop = itemPos + itemHeight - height;
          this._removeScrollBackItemTrigger();
          this._scrollToOffset(scrollTop);
          this.addAnimWhenScrollToSpecialItem(itemId, scrollToAnim);
        }
      }
      else if (itemPos < rangeView.start && itemPos + itemHeight > rangeView.start) {
        // half of top
        scrollTop = itemPos;
        this._removeScrollBackItemTrigger();
        this._scrollToOffset(scrollTop);
        this.addAnimWhenScrollToSpecialItem(itemId, scrollToAnim);
      }
      else if (itemPos < rangeView.end && itemPos + itemHeight > rangeView.end) {
        // half of bottom
        scrollTop = itemPos + itemHeight - height;
        this._removeScrollBackItemTrigger();
        this._scrollToOffset(scrollTop);
        this.addAnimWhenScrollToSpecialItem(itemId, scrollToAnim);
      }
      else {
        // in viewport
        this._removeScrollBackItemTrigger();
        this.addAnimWhenScrollToSpecialItem(itemId, scrollToAnim);
      }
    }
  }

  scrollTo(index: number) {
    if (isNum(index)) {
      const itemId = this.viewModel.getCache().getItemId(parseInt(index));
      if (itemId !== NOT_FOUND) {
        this._removeScrollBackItemTrigger();
        this._removeStyleOfSpecialItem();
        if (this.props.isVirtualized) {
          this.zoomToItem(itemId, false);
        }
        else {
          this.zoomToItem(itemId);
        }
      }
    }
  }

  addAnimWhenAppearance(itemId, additionAnim, timingResetAnimation = 200) {
    const el = this.getElementFromId(itemId);
    if (additionAnim) {
      AnimExecution.appendStyle(el, additionAnim);
      setTimeout(() => {
        AnimExecution.removeStyle(el, additionAnim);
      }, timingResetAnimation);
    }
    else {
      AnimExecution.executeDefaultAnim(el, AnimName.zoomIn);
      setTimeout(() => {
        AnimExecution.removeStyle(el, AnimName.zoomIn);
      }, timingResetAnimation);
    }
  }

  addAnimWhenScrollToSpecialItem(itemId, animationNames) {
    if (itemId) {
      const el = this.getElementFromId(itemId);
      if (el !== null) {
        AnimExecution.appendStyle(el, animationNames);
      }
      else {
        this.itemNeedAddAnim = itemId;
      }

      setTimeout(
        () => {
          this.isStableAfterScrollToSpecialItem = true;
          this.itemAddedScrollToAnim = {
            itemId: itemId,
            anim: animationNames,
          };
        }, 16.66,
      );
    }
  }

  getElementFromId(itemId) {
    if (itemId) {
      return this.masonry.firstChild.children.namedItem(itemId);
    }
  }

  scrollToTopAtCurrentUI() {
    this.preventLoadTop = true;
    this._removeScrollBackItemTrigger();
    this._scrollToOffset(0);
  };

  scrollToBottomAtCurrentUI() {
    this.preventLoadBottom = true;
    this._removeScrollBackItemTrigger();
    this._scrollToOffset(this.estimateTotalHeight);
  };

  reRender() {
    this.setState(this.state);
  }

  updateChildrenInVirtualized(scrollTop) {
    this.itemsInBatch = this._getItemsInBatch(scrollTop);
    const itemCache = this.viewModel.getCache();
    const becomeSelectedItemCallback = this.viewModel.setSelectedItem;
    this.children = [];

    for (let i = 0; i < this.itemsInBatch.length; i++) {
      const index = itemCache.getIndex(this.itemsInBatch[i]);
      const item = this.viewModel.getDataUnfreeze()[index];
      const removeCallback = this.viewModel.onRemoveItemById;
      const position = {
        top: itemCache.getPosition(this.itemsInBatch[i]),
        left: 0,
      };
      const el = document.getElementById(itemCache.getItemId(index));

      if (el) {
        if (index === this.viewModel.getSelectedItem()) {
          this.beforeItemHighlight = el;
          AnimExecution.appendStyle(el, 'highlighted');
        }
        else {
          AnimExecution.removeStyle(el, 'highlighted');
        }
      }
      if (!!item) {
        this.children.push(
          <CellMeasurer
            id={itemCache.getItemId(index)}
            key={itemCache.getItemId(index)}
            isVirtualized={this.props.isVirtualized}
            defaultHeight={itemCache.getDefaultHeight}
            onChangedHeight={this.onChildrenChangeHeight}
            position={position}>
            {
              isFunction(this.props.cellRenderer) ?
                this.props.cellRenderer({
                  item,
                  index,
                  removeCallback,
                  becomeSelectedItemCallback,
                }) :
                null
            }
          </CellMeasurer>,
        );
      }
    }

    // Prevent removed item is disappeared.
    if (this.needHoldItemToExcuteRemovalAnim) {
      for (let i = 0; i < this.removedElements.length; i++) {
        const item = this.removedElements[i].item;
        const removedItemIndex = this.removedElements[i].index;
        const getTopPos = this.removedElements[i].position;
        const position = {
          top: getTopPos,
          left: 0,
        };

        if (
          item &&
          item.itemId &&
          isNum(position.top) &&
          position.top !== NOT_FOUND
        ) {
          this.children.push(
            <CellMeasurer
              id={item.itemId}
              key={item.itemId}
              isVirtualized={this.props.isVirtualized}
              defaultHeight={itemCache.getDefaultHeight}
              onChangedHeight={this.onChildrenChangeHeight}
              position={position}>
              {
                isFunction(this.props.cellRenderer) ?
                  this.props.cellRenderer({
                    item,
                    removedItemIndex,
                  }) :
                  null
              }
            </CellMeasurer>,
          );
        }
      }
    }

    if (this.needHoldItemToExcuteRaiseAnim && this.children) {
      const item = this.viewModel.getDataUnfreeze()[0];
      let isDup = false;
      this.itemsInBatch.forEach((itemId) => {
        if (itemId === item.itemId) {
          isDup = true;
        }
      });
      const itemIndex = 0;
      const removeCallback = this.viewModel.onRemoveItemById;
      const position = {
        top: 0,
        left: 0,
      };

      if (
        item &&
        item.itemId &&
        isNum(position.top) &&
        position.top !== NOT_FOUND &&
        !isDup
      ) {
        this.children.push(
          <CellMeasurer
            id={item.itemId}
            key={item.itemId}
            isVirtualized={this.props.isVirtualized}
            defaultHeight={itemCache.getDefaultHeight}
            onChangedHeight={this.onChildrenChangeHeight}
            position={position}>
            {
              isFunction(this.props.cellRenderer) ?
                this.props.cellRenderer({
                  item,
                  itemIndex,
                  removeCallback,
                  becomeSelectedItemCallback,
                }) :
                null
            }
          </CellMeasurer>,
        );
      }
    }

    // if (!Lodash.isEqual(this.itemsInBatch, this.oldItemsInBatch) || this.needReRenderChildrenChangedHeight) {
    //   this.oldItemsInBatch = [...this.itemsInBatch];
    //   this.children = [];
    //   this.needReRenderChildrenChangedHeight = false;
    //
    //   for (let i = 0; i < this.itemsInBatch.length; i++) {
    //     const itemCache = this.viewModel.getCache();
    //     const index = itemCache.getIndex(this.itemsInBatch[i]);
    //     const item = this.viewModel.getDataUnfreeze()[index];
    //     const removeCallback = this.viewModel.onRemoveItemById;
    //     const position = {
    //       top: itemCache.getPosition(this.itemsInBatch[i]),
    //       left: 0,
    //     };
    //     if (!!item) {
    //       this.children.push(
    //         <CellMeasurer
    //           id={itemCache.getItemId(index)}
    //           key={itemCache.getItemId(index)}
    //           isVirtualized={this.props.isVirtualized}
    //           defaultHeight={itemCache.getDefaultHeight}
    //           onChangedHeight={this.onChildrenChangeHeight}
    //           position={position}>
    //           {
    //             isFunction(this.props.cellRenderer) ?
    //               this.props.cellRenderer({
    //                 item,
    //                 index,
    //                 removeCallback,
    //               }) :
    //               null
    //           }
    //         </CellMeasurer>,
    //       );
    //     }
    //   }
    // }
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
      renderDirection,
      isVirtualized,
    } = this.props;

    const {scrollTop} = this.state;

    //console.log('render', scrollTop)
    this.curItemInViewPort = this._getItemIdFromPosition(scrollTop);

    const {v2, noHScroll, noVScroll, compositeScroll, ...rest} = this.props;
    if (noHScroll) {
      rest.renderTrackHorizontal = renderNoScroll;
    }
    if (noVScroll) {
      rest.renderTrackVertical = renderNoScroll;
    }
    else {
      rest.renderTrackVertical = v2 === true ?
        renderTrackVerticalVer2 :
        renderTrackVertical;
    }

    if (compositeScroll) {
      rest.renderView = props => {
        let {style, ...rest} = props;
        style.willChange = 'transform';
        return <div {...rest} style={style}/>;
      };
    }

    if (isVirtualized) {
      this.updateChildrenInVirtualized(scrollTop);
    }

    return (
      <div
        className={'masonry-parent'}
        ref={this.parentRef}>
        <div
          className={className}
          id={id}
          onScroll={this._onScroll}
          style={{
            backgroundColor: 'white',
            boxSizing: 'border-box',
            overflowX: 'hidden',
            overflowY: 'scroll',
            width: 'auto',
            minWidth: minWidth,
            height: height,
            minHeight: minHeight,
            position: 'relative',
            willChange: isVirtualized ?
              'auto' :
              'transform',
            ...style,
          }}>
          <div
            className={`${innerScrollClassName ?
              innerScrollClassName :
              'innerScrollContainer'}`}
            id={'innerScrollContainerId'}
            style={{
              width: '100%',
              height: this.estimateTotalHeight,
              maxWidth: '100%',
              maxHeight: this.estimateTotalHeight,
              overflow: 'hidden',
              position: 'relative',
              pointerEvents: isScrolling ?
                'none' :
                '', // property defines whether or not an element reacts to pointer events.
              ...innerScrollStyle,
            }}>
            {this.children}
          </div>
        </div>
      </div>
    );
  }

  componentDidUpdate() {
    const data = this.viewModel.getDataUnfreeze();
    const {isVirtualized, height} = this.props;
    const {scrollTop} = this.state;

    this._checkScrollToBottomInFirstSight();

    this._checkAndNotifyIfViewNotFull(height);

    this._checkEnableLoadTop(scrollTop);

    this._checkEnableLoadBottom(scrollTop, height);

    this._checkAndResetTriggerLoadTop(scrollTop);

    this._checkAndResetTriggerLoadBottom(scrollTop, height);

    this._checkScrollTopWithAnimation();

    this._checkAndScrollBackWhenHavingNewItem(isVirtualized);

    // Check scroll to old position when load more top.
    this._checkAndScrollBackWhenLoadOrAddTop(isVirtualized);

    this._checkAndScrollBackWhenRemoveItem(isVirtualized, scrollTop);

    this._checkAndScrollBackWhenRaiseItem();

    this._checkAndScrollTopWhenAddItem(scrollTop);

    this._checkAndScrollBottomWhenAddItem(scrollTop, height);

    this._checkAndScrollToSpecialItem();

    this._checkAndUpdateOldData(data.length);
  }

  onLoadMoreTop(firstItemId, oldPosOfFirstItem) {
    this.isLoadingTop = true;
    this.firstItemInViewportBefore = {
      itemId: this.curItemInViewPort,
      disparity: this.state.scrollTop - oldPosOfFirstItem,
    };

    this.oldFirstItem = firstItemId;

  }

  _checkScrollToBottomInFirstSight() {
    if (this.props.isStartAtBottom && !this.isFirstLoadingDone) {
      this._scrollToBottomAtFirst(this.itemsInBatch.length);
      this.preventLoadBottom = true;
    }
    else if (!this.props.isStartAtBottom && !this.isFirstLoadingDone) {
      this.preventLoadTop = true;
      if (this.props.isVirtualized) {
        this._scrollToOffset(0);
      }
      else {
        this.isFirstLoadingDone = true;
      }
    }
  }

  _checkAndNotifyIfViewNotFull(height) {
    // Notify if viewport is not full.
    if (this.isFirstLoadingDone && this.estimateTotalHeight < height) {
      console.log('notify not full');
      this.viewModel.enableLoadTop();
    }
  }

  _checkEnableLoadTop(scrollTop) {
    if (
      scrollTop < LOAD_MORE_TOP_TRIGGER_POS &&
      this.isFirstLoadingDone &&
      !this.isLoadingTop &&
      !this.preventLoadTop
    ) {
      console.log('enable load top');
      this.viewModel.enableLoadTop();
    }
  }

  _checkEnableLoadBottom(scrollTop, height) {
    // trigger load more bottom
    LOAD_MORE_BOTTOM_TRIGGER_POS = this.estimateTotalHeight - height - 2;
    if (
      scrollTop >= LOAD_MORE_BOTTOM_TRIGGER_POS &&
      this.isFirstLoadingDone &&
      !this.preventLoadBottom
    ) {
      console.log('enable load bottom');
      this.viewModel.enableLoadBottom();
    }
  }

  _checkAndResetTriggerLoadTop(scrollTop) {
    if (scrollTop > LOAD_MORE_TOP_TRIGGER_POS) {
      this.preventLoadTop = false;
      this.isLoadingTop = false;
    }
  }

  _checkAndResetTriggerLoadBottom(scrollTop, height) {
    if (scrollTop < this.estimateTotalHeight - height - 20 && this.isFirstLoadingDone) {
      this.preventLoadBottom = false;
    }
  }

  _checkScrollTopWithAnimation() {
    if (this.needScrollTopWithAnim) {
      if (
        !this.isLoadMore &&
        !this.needScrollBack
      ) {
        this.needScrollTopWithAnim = false;
        this._scrollTopWithAnim();
      }
    }
  }

  _checkAndScrollBackWhenHavingNewItem(isVirtualized) {
    if (
      isVirtualized &&
      this.needScrollBackWhenHavingNewItem &&
      !this.isLoadingTop &&
      this.isFirstLoadingDone &&
      !this.justLoadTop
    ) {
      this.needScrollBackWhenHavingNewItem = false;
      this.justLoadTop = false;
      const posNeedToScr =
        this.viewModel.getCache().getPosition(this.itemScrollBackWhenHavingNewItem.itemId) +
        this.itemScrollBackWhenHavingNewItem.disparity;
      console.log('having', posNeedToScr, this.itemScrollBackWhenHavingNewItem);
      this._scrollToOffset(posNeedToScr);
    }
    else if (isVirtualized && this.difSizeWhenReMount && !this.isLoadingTop && this.isFirstLoadingDone) {
      // scroll back when item re-mount with different size.
      this.difSizeWhenReMount = false;
      const posNeedToScr =
        this.viewModel.getCache().getPosition(this.firstItemInViewportBefore.itemId) +
        this.viewModel.getCache().getHeight(this.firstItemInViewportBefore.itemId);
      this._scrollToOffset(posNeedToScr);
    }
  }

  _checkAndScrollBackWhenLoadOrAddTop(isVirtualized) {
    if (this.needScrollBack) {
      if (isVirtualized && this.isLoadMore) {
        //console.log('load top', this.firstItemInViewportBefore.itemId, this.firstItemInViewportBefore.disparity);
        this.isLoadMore = false;
        this.justLoadTop = true;
        const posNeedToScr =
          this.viewModel.getCache().getPosition(this.firstItemInViewportBefore.itemId) +
          this.firstItemInViewportBefore.disparity;
        console.log('load top 2', posNeedToScr, this.curItemInViewPort);
        this._scrollToOffset(posNeedToScr);
        //this._scrollToItem(this.firstItemInViewportBefore.itemId, this.firstItemInViewportBefore.disparity);
      }
      else if (this.isLoadNewItemsDone && this.isAddMore) {
        console.log('lalala');
        this.isAddMore = false;
        this.isLoadNewItemsDone = false;
        this._scrollToItem(
          this.firstItemInViewportBefore.itemId,
          this.firstItemInViewportBefore.disparity,
        );
      }
      else {
        clearInterval(this.scrTopTimeOutId);
        if (!this.isScrollToSpecialItem && this.isLoadNewItemsDone) {
          console.log('hahaa');
          this.isLoadNewItemsDone = false;
          this._scrollToItem(
            this.firstItemInViewportBefore.itemId,
            this.firstItemInViewportBefore.disparity,
          );
        }
      }
      this.needScrollBack = false;
    }
    // [Virtualized] Add items out range of batch
    else if (isVirtualized && this.isAddMore) {
      this.preventUpdateFirstItemInViewportWhenAdd = false;
      console.log('aaaaaa');
      this.isAddMore = false;
      this._scrollToItem(
        this.firstItemInViewportBefore.itemId,
        this.firstItemInViewportBefore.disparity,
      );
    }
  }

  _checkAndScrollBackWhenRemoveItem(isVirtualized, scrollTop) {
    if (isVirtualized && this.isRemoveItem) {
      this.isRemoveItem = false;
      if (this.needScrollBackWhenRemoveItem && !this.needHoldItemToExcuteRemovalAnim) {
        console.log('scroll back remove');
        this.needScrollBackWhenRemoveItem = false;
        this._scrollToOffset(scrollTop - this.removedItemHeight);
      }
    }
  }

  _checkAndScrollBackWhenRaiseItem() {
    if (this.needScrollBackWhenRaiseItem) {
      this.needScrollBackWhenRaiseItem = false;
      this._scrollToItem(this.itemScrollBackWhenRaiseOutside.itemId, this.itemScrollBackWhenRaiseOutside.disparity);
    }
  }

  _checkAndScrollTopWhenAddItem(scrollTop) {
    if (this.needScrollTop) {
      console.log('scrolltop');
      this.needScrollTop = false;
      if (scrollTop <= NEED_TO_SCROLL_TOP_POS) {
        this._scrollToOffset(0);
      }
    }
  }

  _checkAndScrollBottomWhenAddItem(scrollTop, height) {
    if (this.needScrollBottom) {
      this.needScrollBottom = false;
      if (scrollTop >= this.estimateTotalHeight - this.newLastItemsTotalHeight - height - NEED_TO_SCROLL_BOTTOM_POS) {
        //TODO: conflict with "resize" after add bottom
        console.log('scr bottom add item');
        this.scrollToBottomAtCurrentUI();
      }
      this.newLastItemsTotalHeight = 0;
    }
  }

  _checkAndScrollToSpecialItem() {
    if (this.needScrollToSpecialItem) {
      this.needScrollToSpecialItem = false;
      this.scrollToSpecialItem(this.itemIdToScroll, this.isActiveAnimWhenScrollToItem);
    }
  }

  _checkAndUpdateOldData(dataLength) {
    if (this.oldData.oldLength !== dataLength && !this.isLoadingTop) {
      this._updateOldData();
    }
  }

  pendingScrollToSpecialItem(numOfItems: number, itemId: string, withAnim: boolean = true) {
    if (isNum(numOfItems) && itemId) {
      if (numOfItems === 0) {
        this.zoomToItem(itemId, withAnim);
      }
      else {
        this.isScrollToSpecialItem = true;
      }

      this.numOfNewLoading = numOfItems;
      this.itemIdToScroll = itemId;
      this.isActiveAnimWhenScrollToItem = withAnim;
    }
  }

  _clearIntervalId() {
    clearInterval(this.scrTopTimeOutId);
    clearInterval(this.scrUpTimeOutId);
    clearInterval(this.scrDownTimeOutId);
  }

  _scrollTopWithAnim(
    duration: number,
    msDelayInEachStep: number = 16.67) {
    const distance = this.state.scrollTop;
    const stepInPixel = distance * msDelayInEachStep / duration;

    this.scrTopTimeOutId = setInterval(() => {
      this.masonry.scrollTo(0, this.state.scrollTop - stepInPixel);
      if (this.state.scrollTop <= 0) {
        clearInterval(this.scrTopTimeOutId);
        this._removeScrollBackItemTrigger();
        this._scrollToOffset(0);
      }
    }, msDelayInEachStep);
  }

  _scrollToItemWithAnimUp(
    offset: number,
    itemId: string,
    animationName: string,
    stepInPixel: number = 50,
    msDelayInEachStep: number = 16.66) {

    this.jumpBeforeScroll(offset);

    this.scrUpTimeOutId = window.setInterval(() => {
      this.masonry.scrollTo(0, this.state.scrollTop - stepInPixel);
      if (this.state.scrollTop <= offset) {
        clearInterval(this.scrUpTimeOutId);
        this._removeScrollBackItemTrigger();
        this._scrollToOffset(offset);
        if (itemId) {
          this.addAnimWhenScrollToSpecialItem(itemId, animationName);
        }
      }
    }, msDelayInEachStep);
  }

  _scrollToItemWithAnimDown(
    offset: number,
    itemId: string,
    animationName: string,
    stepInPixel: number = 50,
    msDelayInEachStep: number = 16.66) {

    this.jumpBeforeScroll(offset);

    this.scrDownTimeOutId = window.setInterval(() => {
      this.masonry.scrollTo(0, this.state.scrollTop + stepInPixel);
      if (this.state.scrollTop >= offset) {
        clearInterval(this.scrDownTimeOutId);
        this._removeScrollBackItemTrigger();
        this._scrollToOffset(offset);
        if (itemId) {
          this.addAnimWhenScrollToSpecialItem(itemId, animationName);
        }
      }
    }, msDelayInEachStep);
  }

  jumpBeforeScroll(offset: number, distance: number = 200) {
    const stateScrTop = this.state.scrollTop;

    if (stateScrTop >= offset + distance) {
      this._scrollToOffset(offset + distance);
    }
    else if (stateScrTop <= offset - distance) {
      this._scrollToOffset(offset - distance);
    }
  }

  /*
   * Scroll to bottom when the first loading
   */
  _scrollToBottomAtFirst(numOfItemsInBatch = 0) {
    if (this.masonry !== undefined && isNum(numOfItemsInBatch)) {
      if (this.initLoadDone) {
        this.isFirstLoadingDone = true;
        this.masonry.firstChild.scrollIntoView(false);
      }
      else if (this.props.isVirtualized) {
        // In virtualized mode, we dont know when init load done
        // therefore call scroll to bottom until init count = data.
        this.initItemCount++;
        console.log(this.initItemCount, numOfItemsInBatch);
        if (this.initItemCount >= numOfItemsInBatch) {
          console.log('reverse done');
          this.isFirstLoadingDone = true;
          this.masonry.firstChild.scrollIntoView(false);
        }
      }
    }
  }

  _addStaticItemToChildren(index, item) {
    if (
      isNum(index) &&
      item &&
      item.itemId
    ) {
      const {isVirtualized, cellRenderer} = this.props;
      const defaultHeight = this.viewModel.getCache().getDefaultHeight;

      // const index = this.itemCache.getIndex;
      const removeCallback = this.viewModel.onRemoveItemById;
      this.children.splice(index, 0,
        <CellMeasurer id={item.itemId}
                      key={item.itemId}
                      defaultHeight={defaultHeight}
                      isVirtualized={isVirtualized}
                      onChangedHeight={this.onChildrenChangeHeight}
                      position={{
                        top: 0,
                        left: 0,
                      }}>
          {
            isFunction(cellRenderer) ?
              cellRenderer({
                item,
                index,
                removeCallback,
              }) :
              null
          }
        </CellMeasurer>,
      );
    }
  }

  _removeStyleOfSpecialItem() {
    if (this.isStableAfterScrollToSpecialItem) {
      // console.log(this.itemAddedScrollToAnim.itemId);
      const el = this.masonry.firstChild.children.namedItem(this.itemAddedScrollToAnim.itemId);
      AnimExecution.removeStyle(el, this.itemAddedScrollToAnim.anim);
      this.isStableAfterScrollToSpecialItem = false;
    }
  }

  _onScroll() {
    //console.log('onScr');
    const {height} = this.props;

    this._removeStyleOfSpecialItem();
    //this._removeScrollBackItemTrigger();

    const eventScrollTop = this.masonry.scrollTop;
    const scrollTop = Math.min(
      Math.max(0, this.estimateTotalHeight - height),
      eventScrollTop,
    );

    if (Math.round(eventScrollTop) !== Math.round(scrollTop)) {
      return;
    }

    if (this.state.scrollTop !== scrollTop) {
      this.setState({
        isScrolling: true,
        scrollTop,
      });
    }
  };

  _onResize() {
    console.log('resize');
    this.isResize = false;
  }

  _scrollToOffset(top) {
    if (
      this.masonry &&
      isFunction(this.masonry.scrollTo) &&
      isNum(top)
    ) {
      this.masonry.scrollTo(0, top);
    }
  }

  /*
   *  Get total height in estimation.
   */
  _getEstimatedTotalHeight(): number {
    const data = this.viewModel.getDataUnfreeze();
    let totalHeight = 0;

    if (!!data.length) {
      totalHeight = this.viewModel.getCache().getDefaultHeight * data.length;
    }
    return totalHeight;
  }

  _updateEstimatedHeight(difference: number) {
    if (isNum(difference)) {
      this.estimateTotalHeight = this.oldEstimateTotalHeight + difference;
      this.oldEstimateTotalHeight = this.estimateTotalHeight;
    }
  }

  _updateOldData() {
    const data = this.viewModel.getDataUnfreeze();
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
   *  Update other items' position below the item that changed height.
   */
  _updateItemsOnChangedHeight(itemId: string, newHeight: number, isRendered: boolean = true) {
    if (itemId && isNum(newHeight)) {
      this.viewModel.getCache().updateItemHeight(itemId, newHeight, isRendered);
      this.viewModel.updateItemsPositionFromSpecifiedItem(itemId);
    }
  }

  _isItemInViewport(itemId: string, scrollTop: number, viewHeight: number): boolean {
    // Another way is check from '_getItemsInViewport' but may be the cost is higher.
    // This solution is getting index of item first and last in viewport,
    //  after that return item's index is between or not.
    const getIndex = this.viewModel.getCache().getIndex.bind(this.viewModel.getCache());
    const itemIndex = getIndex(itemId);

    const firstItem = this._getItemIdFromPosition(scrollTop);
    const lastItem = this._getItemIdFromPosition(scrollTop + viewHeight);

    const fItemIndex = getIndex(firstItem);
    const lItemIndex = getIndex(lastItem);

    return itemIndex !== NOT_FOUND &&
      fItemIndex !== NOT_FOUND &&
      lItemIndex !== NOT_FOUND &&
      itemIndex >= fItemIndex &&
      itemIndex <= lItemIndex;
  }

  _getItemsIndexInViewport(scrollTop: number, viewHeight: number): Object {
    const getIndex = this.viewModel.getCache().getIndex.bind(this.viewModel.getCache());
    const firstItemIndex = getIndex(this._getItemIdFromPosition(scrollTop));
    const lastItemIndex = getIndex(this._getItemIdFromPosition(scrollTop + viewHeight));

    // Can be return NOT_FOUND (-1)
    return {
      firstItemIndex,
      lastItemIndex,
    };
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
    const data = this.viewModel.getDataUnfreeze();
    const itemCache = this.viewModel.getCache();
    if (!!data.length && isNum(positionTop)) {
      if (positionTop >= this.estimateTotalHeight) {
        return itemCache.getItemId(data.length - 1);
      }

      let result = this._ternarySearch(0, data.length, positionTop);
      if (!result) {
        const lastItem = itemCache.getItemId(data.length - 1);
        if (positionTop < itemCache.getPosition(itemCache.getItemId(0))) {
          // rarely, some cases first item's pos doesn't equals 0
          result = itemCache.getItemId(0);
        }
        else if (positionTop >
          itemCache.getPosition(lastItem) +
          itemCache.getHeight(lastItem)) {
          // some cases positionTop is higher than last item's position
          result = lastItem;
        }
        else {
          for (let key of itemCache.getItemsMap.keys()) {
            if (positionTop >= itemCache.getPosition(key) &&
              positionTop < itemCache.getPosition(key) + itemCache.getHeight(key)) {
              return key;
            }
          }
        }
      }

      return result;
    }
  }

  // Unneeded check params type cause this func using inner
  _ternarySearch(left: number, right: number, positionTop: number) {
    if (right >= left) {
      const cache = this.viewModel.getCache();

      const midLeft = left + Math.floor((right - left) / 3);
      const midRight = right - Math.floor((right - left) / 3);

      if (midLeft > midRight) {
        return;
      }
      const midLeftId = cache.getItemId(midLeft);
      const midRightId = cache.getItemId(midRight);

      const midLeftPos = cache.getPosition(midLeftId);
      const midLeftHeight = cache.getHeight(midLeftId);

      const midRightPos = cache.getPosition(midRightId);
      const midRightHeight = cache.getHeight(midRightId);

      if (positionTop >= midLeftPos &&
        positionTop < midLeftPos + midLeftHeight) {
        return midLeftId;
      }
      else if (positionTop >= midRightPos &&
        positionTop < midRightPos + midRightHeight) {
        return midRightId;
      }

      if (positionTop < midLeftPos) {
        // Between left and midLeft
        return this._ternarySearch(left, midLeft - 1, positionTop);
      }
      else if (positionTop > midRightPos) {
        // Between midRight and right
        return this._ternarySearch(midRight + 1, right, positionTop);
      }
      else {
        // Between midLeft and midRight
        return this._ternarySearch(midLeft + 1, midRight - 1, positionTop);
      }
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
    const data = this.viewModel.getDataUnfreeze();
    const {height, numOfOverscan} = this.props;
    let results: Array<string> = [];

    if (!!data.length && isNum(scrollTop)) {
      const currentItemId = this._getItemIdFromPosition(scrollTop);
      const currentIndex = this.viewModel.getCache().getIndex(currentItemId);
      const numOfItemInViewport = this._getItemsInViewport(scrollTop, currentItemId, data.length).length;

      const startIndex = Math.max(0, currentIndex - numOfOverscan);
      const endIndex = Math.min(currentIndex + numOfItemInViewport + numOfOverscan, data.length);

      for (let i = startIndex; i < endIndex; i++) {
        if (data[i] && data[i].itemId) {
          results.push(data[i].itemId);
        }
      }
    }
    return results;
  }

  /**
   *  Return an array stores all items rendering in viewport.
   *
   *  @param {number} scrollTop - This masonry position.
   *  @param {number} viewportHeight
   *  @param {string} firstItemIdInViewport
   *
   *  @return {Array<string>} - Stores all items' id in viewport. Can be empty.
   */
  _getItemsInViewport(scrollTop: number, firstItemIdInViewport: string, dataLength: number): Array<string> {
    const viewportHeight = this.props.height;
    const results = [];

    if (!!dataLength && firstItemIdInViewport) {
      const itemIdStart = firstItemIdInViewport;

      if (itemIdStart && itemIdStart !== NOT_FOUND) {
        results.push(itemIdStart);

        // disparity > 0 when scrollTop position is between `the item's position` and `item's position + its height`.
        const disparity = scrollTop - this.viewModel.getCache().getPosition(itemIdStart);
        let remainingViewHeight = viewportHeight - this.viewModel.getCache().getHeight(itemIdStart) + disparity;

        let i = 1;
        let itemIndex = this.viewModel.getCache().getIndex(itemIdStart);
        if (itemIndex + i >= dataLength) {
          itemIndex = dataLength - 2;
        }

        let nextItemId = this.viewModel.getCache().getItemId(itemIndex + i);
        let nextItemHeight = this.viewModel.getCache().getHeight(nextItemId);

        while (remainingViewHeight > nextItemHeight && nextItemHeight !== 0) {
          remainingViewHeight -= nextItemHeight;
          results.push(nextItemId);
          i++;
          nextItemId = this.viewModel.getCache().getItemId(itemIndex + i);
          if (nextItemId !== NOT_FOUND) {
            nextItemHeight = this.viewModel.getCache().getHeight(nextItemId);
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
    const itemCache = this.viewModel.getCache();
    if (itemCache.hasItem(itemId)) {
      this._scrollToOffset(itemCache.getPosition(itemId) + disparity);
    }
  }

  _removeScrollBackItemTrigger() {
    this.isScrollToSpecialItem = false;
  }

  _isAtTop(): boolean {
    return this.state.scrollTop === 0;
  }

  _isAtBottom() {
    return this.state.scrollTop === this.estimateTotalHeight - this.props.height;
  }

  /* ========================================================================
   [Public API] - Scroll Bar
   ======================================================================== */
  scrollTop(top = 0) {
    if (
      this._scrollBar &&
      isFunction(this._scrollBar.scrollTop) &&
      top >= 0
    ) {
      this._scrollBar.scrollTop(top);
    }
  }

  scrollLeft(left = 0) {
    if (
      this._scrollBar &&
      isFunction(this._scrollBar.scrollLeft) &&
      left >= 0
    ) {
      this._scrollBar.scrollLeft(left);
    }
  }

  scrollToTop() {
    if (this._scrollBar && isFunction(this._scrollBar.scrollToTop)) {
      this._scrollBar.scrollToTop();
    }
  }

  scrollToBottom() {
    if (this._scrollBar && isFunction(this._scrollBar.scrollToBottom)) {
      this._scrollBar.scrollToBottom();
    }
  }

  scrollToLeft() {
    if (this._scrollBar && isFunction(this._scrollBar.scrollToLeft)) {
      this._scrollBar.scrollToLeft();
    }
  }

  scrollToRight() {
    if (this._scrollBar && isFunction(this._scrollBar.scrollToRight)) {
      this._scrollBar.scrollToRight();
    }
  }

  getScrollLeft() {
    if (this._scrollBar && isFunction(this._scrollBar.getScrollLeft)) {
      return this._scrollBar.getScrollLeft();
    }
  }

  getScrollTop() {
    if (this._scrollBar && isFunction(this._scrollBar.getScrollTop)) {
      return this._scrollBar.getScrollTop();
    }
  }

  getScrollWidth() {
    if (this._scrollBar && isFunction(this._scrollBar.getScrollWidth)) {
      return this._scrollBar.getScrollWidth();
    }
  }

  getScrollHeight() {
    if (this._scrollBar && isFunction(this._scrollBar.getScrollHeight)) {
      return this._scrollBar.getScrollHeight();
    }
  }

  getClientWidth() {
    if (this._scrollBar && isFunction(this._scrollBar.getClientWidth)) {
      return this._scrollBar.getClientWidth();
    }
  }

  getClientHeight() {
    if (this._scrollBar && isFunction(this._scrollBar.getClientHeight)) {
      return this._scrollBar.getClientHeight();
    }
  }

  getValues() {
    if (this._scrollBar && isFunction(this._scrollBar.getValues)) {
      return this._scrollBar.getValues();
    }
  }
}

export function renderTrackVertical({style, ...props}) {
  const finalStyle = {
    ...style,
    right: 2,
    bottom: 2,
    top: 2,
    width: 8,
    borderRadius: 3,
  };
  return <div style={finalStyle} {...props} />;
}

export function renderTrackVerticalVer2({style, ...props}) {
  const finalStyle = {
    ...style,
    right: 10,
    bottom: 2,
    top: 2,
    width: 8,
    borderRadius: 3,
  };
  return <div style={finalStyle} {...props} />;
}

export function renderNoScroll({style, ...props}) {
  const finalStyle = {
    ...style,
    width: 0,
  };
  return <div style={finalStyle} {...props} />;
}

export default Masonry;
