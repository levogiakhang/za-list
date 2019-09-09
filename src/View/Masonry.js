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
import hasWhiteSpace from '../utils/hasWhiteSpace';
import removeClass from '../utils/removeClass';
import addClass from '../utils/addClass';
import { Scrollbars } from 'react-custom-scrollbars';
import * as Lodash from 'lodash/core';

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
};

const LOAD_MORE_TOP_TRIGGER_POS = 50;
let LOAD_MORE_BOTTOM_TRIGGER_POS = 0;
const NEED_TO_SCROLL_TOP_POS = 300;
const NEED_TO_SCROLL_BOTTOM_POS = 600;

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
  };

  constructor(props) {
    super(props);
    this.viewModel = props.viewModel;

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

    this.isLoadMore = false;
    this.loadMoreTopCount = 0; // resolves remove incorrect item when removal animation end.
    this.needScrollTopWithAnim = false; // turn on this flag when remove an item in case after remove, list's height is greater than total items' height
    this.isAddMore = false;
    this.isAddFirst = false;
    this.needScrollTop = false;
    this.isAddLast = false;
    this.needScrollBottom = false;
    this.newLastItemsTotalHeight = 0;
    this.needScrollBack = false;
    this.initLoadDone = false;
    this.initItemCount = 0;
    this.needScrollBackWhenHavingNewItem = false;

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

    this.children = [];
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
    this.updateUIWhenScrollToItem = this.updateUIWhenScrollToItem.bind(this);
    this.onAddItems = this.onAddItems.bind(this);

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
    this.masonry = this.parentRef.current.firstChild;

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
    this.viewModel.addEventListener('viewUpdateUIWhenScrollToItem', this.updateUIWhenScrollToItem);
    this.viewModel.addEventListener('viewOnAddItems', this.onAddItems);

    if (this.parentRef !== undefined) {
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
    const {isVirtualized} = this.props;

    if (itemCache.getHeight(itemId) !== newHeight) {
      const isRendered = itemCache.isRendered(itemId);
      this.firstItemInViewportBefore = {
        itemId: this.curItemInViewPort,
        disparity: this.state.scrollTop - this.viewModel.getCache().getPosition(this.curItemInViewPort),
      };

      // Debut
      if (!isRendered) {
        // For load more top
        if (!isRendered && itemCache.getIndex(itemId) < itemCache.getIndex(this.oldData.firstItem)) {
          this.needScrollBack = true;
        }

        // Scroll back to old position when add an item above
        if (!isRendered && itemCache.getIndex(itemId) < itemCache.getIndex(this.firstItemInViewportBefore.itemId)) {
          this.needScrollBack = true;
        }

        if (!isRendered && this.isFirstLoadingDone) {
          const {additionAnim, timingResetAnimation} = this.props;
          this.appendStyle(this.getElementFromId(itemId), additionAnim);
          setTimeout(() => {
            this.removeStyle(this.getElementFromId(itemId), additionAnim);
          }, timingResetAnimation);
        }

        this._updateItemsOnChangedHeight(itemId, newHeight, true);

        if (isVirtualized) {
          if (this.isFirstLoadingDone && !isRendered) {
            this.firstItemInViewportBefore = {
              itemId: this.curItemInViewPort,
              disparity: this.state.scrollTop - itemCache.getPosition(this.curItemInViewPort),
            };
            if (itemCache.getIndex(this.curItemInViewPort) >= itemCache.getIndex(itemId)) {
              this.needScrollBackWhenHavingNewItem = true;
            }
          }
          if (!this.isFirstLoadingDone && !this.props.isStartAtBottom && itemCache.getIndex(itemId) === 0) {
            // Render first item => call scroll top on componentDidMount
            this.isFirstLoadingDone = true;
          }
        }
        else {
          if (this.initItemCount < this.viewModel.getDataUnfreeze().length - 1) {
            this.initItemCount++;
          }
          else if (this.initItemCount === this.viewModel.getDataUnfreeze().length - 1) {
            this.initLoadDone = true;
          }
        }

        if (this.isAddLast) {
          if (isVirtualized) {

          }
          else {
            this.newLastItemsTotalHeight += newHeight;
          }
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
      this.setState(this.state); // instead of this.forceUpdate();
    }
  }

  onAddItems(startIndex, items, oldMap) {
    if (Array.isArray(items)) {
      this.isAddMore = true;
      this.numOfNewLoading = items.length;

      this._removeStyleOfSpecialItem();

      // Conflict with trigger load more when scroll to first | last item on UI
      this._clearIntervalId();

      if (parseInt(startIndex) === 0) {
        this.isAddFirst = true;
      }
      if (parseInt(startIndex) + items.length === this.viewModel.getDataUnfreeze().length) {
        this.isAddLast = true;
      }

      const stateScrollTop = this.state.scrollTop;

      // Usage to scroll back, prevent flick view
      this.firstItemInViewportBefore = {
        itemId: this.curItemInViewPort,
        disparity: stateScrollTop - oldMap.get(this.curItemInViewPort).position,
      };

      let index = startIndex;
      for (let i = 0; i < items.length; i++) {
        this._addStaticItemToChildren(index, items[i]);
        index++;
      }
      this._updateEstimatedHeight(this.viewModel.getCache().defaultHeight * items.length);
    }
  }

  onRemoveItem({itemId, iIndex, iHeight, iPosition}) {
    const {height} = this.props;
    const {scrollTop} = this.state;
    const itemIndex = iIndex;

    const {scrollToAnim, removalAnim} = this.props;

    this._removeStyleOfSpecialItem();

    console.log(itemId);
    if (itemIndex !== NOT_FOUND) {
      const itemHeight = iHeight;

      const el = document.getElementById(itemId);
      this.removeStyle(el, scrollToAnim);
      requestAnimationFrame(function () {
        el.style.position = 'absolute';
        el.style.top = iPosition + 'px';
      });

      const parent = el.parentElement;

      const stuntman = document.createElement('DIV');
      requestAnimationFrame(function () {
        stuntman.id = itemId + '_fake';
        stuntman.setAttribute('style', `height: ${itemHeight}px; width:100%; clear:both; position: relative`);
      });

      parent.insertBefore(stuntman, el);

      const oldChildrenLength = this.children.length;
      this.appendStyle(el, removalAnim);

      el.addEventListener('animationend', () => {
        this._updateEstimatedHeight(-itemHeight);
        this._updateOldData();

        console.log(oldChildrenLength);

        // Check in case be loaded more
        if (oldChildrenLength !== this.children.length) {
          console.log('el - diff', itemId, itemIndex);
          this.children.splice(itemIndex + this.loadMoreTopCount, 1);
        }
        else {
          console.log('el - non', itemId, itemIndex);
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

        this.appendStyle(topEl, 'makeBigger');
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
      this.appendStyle(stuntman, 'makeInvisible');
      stuntman.addEventListener('animationend', () => {
        // remove from UI
        parent.removeChild(stuntman);
      });
      stuntman.addEventListener('onanimationcancel', () => {
        // remove from UI
        parent.removeChild(stuntman);
      });
    }
  }

  onLoadMore(startIndex, items) {
    if (Array.isArray(items)) {
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

  zoomToItem(itemId: string, withAnim: boolean = true) {
    this._clearIntervalId();

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

  scrollToSpecialItem(itemId: string, withAnim: boolean = true) {
    const {
      height,
      isItemScrollToInBottom,
      scrollToAnim,
    } = this.props;

    this._clearIntervalId();

    const itemCache = this.viewModel.getCache();

    this.preventLoadTop = true;
    this.preventLoadBottom = true;

    const itemPos = itemCache.getPosition(itemId);
    const itemHeight = itemCache.getHeight(itemId);
    let scrollTop = 0;

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
    }
  }

  scrollTo(index: number) {
    const itemId = this.viewModel.getCache().getItemId(parseInt(index));
    if (itemId !== NOT_FOUND) {
      this._removeScrollBackItemTrigger();
      this._removeStyleOfSpecialItem();
      this.zoomToItem(itemId);
    }
  }

  addAnimWhenScrollToSpecialItem(itemId, animationNames) {
    this.appendStyle(this.getElementFromId(itemId), animationNames);
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

  appendStyle = (el, animationNames) => {
    const arrAnim = hasWhiteSpace(animationNames) ?
      animationNames.split(' ') :
      animationNames;

    if (typeof arrAnim === 'string') {
      addClass(el, arrAnim);
    }
    else {
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
    }
    else {
      for (let i = 0; i < arrAnim.length; i++) {
        removeClass(el, arrAnim[i]);
      }
    }
  };

  getElementFromId(itemId) {
    return this.masonry.firstChild.children.namedItem(itemId);
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
      this.itemsInBatch = this._getItemsInBatch(scrollTop);

      this.children = [];

      for (let i = 0; i < this.itemsInBatch.length; i++) {
        const index = this.viewModel.getCache().getIndex(this.itemsInBatch[i]);
        const item = this.viewModel.getDataUnfreeze()[index];
        const removeCallback = this.viewModel.onRemoveItemsById;
        const position = {
          top: this.viewModel.getCache().getPosition(this.itemsInBatch[i]),
          left: 0,
        };
        if (!!item) {
          this.children.push(
            <CellMeasurer
              id={this.viewModel.getCache().getItemId(index)}
              key={this.viewModel.getCache().getItemId(index)}
              isVirtualized={this.props.isVirtualized}
              defaultHeight={this.viewModel.getCache().getDefaultHeight}
              onChangedHeight={this.onChildrenChangeHeight}
              position={position}>
              {
                isFunction(this.props.cellRenderer) ?
                  this.props.cellRenderer({
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

      // Change item height not affect the behind others
      // if (!Lodash.isEqual(this.itemsInBatch, this.oldItemsInBatch)) {
      //   this.oldItemsInBatch = [...this.itemsInBatch];
      //   this.children = [];
      //
      //   for (let i = 0; i < this.itemsInBatch.length; i++) {
      //     const index = this.viewModel.getCache().getIndex(this.itemsInBatch[i]);
      //     const item = this.viewModel.getDataUnfreeze()[index];
      //     const removeCallback = this.viewModel.onRemoveItemsById;
      //     const position = {
      //       top: this.viewModel.getCache().getPosition(this.itemsInBatch[i]),
      //       left: 0,
      //     };
      //     if (!!item) {
      //       this.children.push(
      //         <CellMeasurer
      //           id={this.viewModel.getCache().getItemId(index)}
      //           key={this.viewModel.getCache().getItemId(index)}
      //           isVirtualized={this.props.isVirtualized}
      //           defaultHeight={this.viewModel.getCache().getDefaultHeight}
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

    return (
      <Scrollbars
        key="scroller"
        ref={c => this._scrollBar = c}
        thumbMinSize={2000}
        autoHide
        autoHideTimeout={1000}
        autoHideDuration={200}
        {...rest}>
        <div
          className={'masonry-parent'}
          ref={this.parentRef}>
          <div
            className={className}
            id={id}
            onScroll={this._onScroll}
            style={{
              backgroundColor: 'cornflowerblue',
              boxSizing: 'border-box',
              overflowX: 'hidden',
              overflowY: 'scroll',
              width: 'auto',
              minWidth: minWidth,
              height: height,
              minHeight: minHeight,
              position: 'relative',
              ...style,
            }}>
            <div
              className={`${innerScrollClassName ?
                innerScrollClassName :
                'innerScrollContainer'}`}
              style={{
                width: '100%',
                height: this.estimateTotalHeight,
                maxWidth: '100%',
                maxHeight: this.estimateTotalHeight,
                overflow: 'hidden',
                position: 'relative',
                willChange: isVirtualized ? 'auto' : 'transform',
                pointerEvents: isScrolling ?
                  'none' :
                  '', // property defines whether or not an element reacts to pointer events.
                ...innerScrollStyle,
              }}>
              {this.children}
            </div>
          </div>
        </div>
      </Scrollbars>
    );
  }

  componentDidUpdate() {
    const data = this.viewModel.getDataUnfreeze();
    const {isVirtualized, height} = this.props;
    const {scrollTop} = this.state;

    this._checkScrollToBottomInFirstSight();

    this._checkEnableLoadTop(scrollTop);

    this._checkEnableLoadBottom(scrollTop, height);

    this._checkAndResetTriggerLoadTop(scrollTop);

    this._checkAndResetTriggerLoadBottom(scrollTop, height);

    this._checkAndNotifyIfViewNotFull(height);

    this._checkScrollTopWithAnimation();

    this._checkAndScrollBackWhenHavingNewItem(isVirtualized);

    // Check scroll to old position when load more top.
    this._checkAndScrollBackWhenLoadOrAddTop();

    this._checkAndScrollTopWhenAddItem(scrollTop);

    this._checkAndScrollBottomWhenAddItem(scrollTop, height);

    this._checkAndScrollToSpecialItem();

    this._checkAndUpdateOldData(data.length);
  }

  onLoadMoreTop() {
    this.isLoadingTop = true;
    this.firstItemInViewportBefore = {
      itemId: this.curItemInViewPort,
      disparity: this.state.scrollTop - this.viewModel.getCache().getPosition(this.curItemInViewPort),
    };
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

  _checkEnableLoadTop(scrollTop) {
    if (
      scrollTop < LOAD_MORE_TOP_TRIGGER_POS &&
      this.isFirstLoadingDone &&
      !this.isLoadingTop &&
      !this.preventLoadTop
    ) {
      console.log('enable load top');
      //this.viewModel.enableLoadTop();
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

  _checkAndNotifyIfViewNotFull(height) {
    // Notify if viewport is not full.
    if (this.isFirstLoadingDone && this.estimateTotalHeight < height) {
      this.viewModel.enableLoadTop();
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
    if (isVirtualized && this.needScrollBackWhenHavingNewItem && !this.isLoadingTop && this.isFirstLoadingDone) {
      this.needScrollBackWhenHavingNewItem = false;
      const posNeedToScr =
        this.viewModel.getCache().getPosition(this.firstItemInViewportBefore.itemId) +
        this.viewModel.getCache().getHeight(this.firstItemInViewportBefore.itemId);
      this._scrollToOffset(posNeedToScr);
    }
    else if (isVirtualized && this.difSizeWhenReMount && !this.isLoadingTop && this.isFirstLoadingDone) {
      this.difSizeWhenReMount = false;
      const posNeedToScr =
        this.viewModel.getCache().getPosition(this.firstItemInViewportBefore.itemId) +
        this.viewModel.getCache().getHeight(this.firstItemInViewportBefore.itemId);
      this._scrollToOffset(posNeedToScr);
    }
  }

  _checkAndScrollBackWhenLoadOrAddTop() {
    if (this.needScrollBack) {
      if (this.isLoadNewItemsDone && this.isAddMore) {
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
          this.isLoadNewItemsDone = false;
          this._scrollToItem(
            this.firstItemInViewportBefore.itemId,
            this.firstItemInViewportBefore.disparity,
          );
        }
      }
      this.needScrollBack = false;
    }
  }

  _checkAndScrollTopWhenAddItem(scrollTop) {
    if (this.needScrollTop) {
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

  _clearIntervalId() {
    clearInterval(this.scrTopTimeOutId);
    clearInterval(this.scrUpTimeOutId);
    clearInterval(this.scrDownTimeOutId);
  }

  _scrollTopWithAnim(
    stepInPixel: number = 30,
    msDelayInEachStep: number = 16.66) {

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
    if (this.masonry !== undefined && this.initLoadDone) {
      this.isFirstLoadingDone = true;
      this.masonry.firstChild.scrollIntoView(false);
    }
    else if (this.masonry !== undefined && this.props.isVirtualized) {
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

  _addStaticItemToChildren(index, item) {
    const {isVirtualized, cellRenderer} = this.props;
    const defaultHeight = this.viewModel.getCache().getDefaultHeight;

    // const index = this.itemCache.getIndex;
    const removeCallback = this.viewModel.onRemoveItemsById;
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

  _removeStyleOfSpecialItem() {
    if (this.isStableAfterScrollToSpecialItem) {
      const el = this.masonry.firstChild.children.namedItem(this.itemAddedScrollToAnim.itemId);
      this.removeStyle(el, this.itemAddedScrollToAnim.anim);
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
    this.masonry.scrollTo(0, top);
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
    this.estimateTotalHeight = this.oldEstimateTotalHeight + difference;
    this.oldEstimateTotalHeight = this.estimateTotalHeight;
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
    this.viewModel.getCache().updateItemHeight(itemId, newHeight, isRendered);
    this.viewModel.updateItemsPositionFromSpecifiedItem(itemId);
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
    if (!!data.length) {
      if (positionTop >= this.estimateTotalHeight) {
        return itemCache.getItemId(data.length - 1);
      }

      // for (let key of itemCache.getItemsMap.keys()) {
      //   if (positionTop >= itemCache.getPosition(key) &&
      //     positionTop < itemCache.getPosition(key) + itemCache.getHeight(key)) {
      //     return key;
      //   }
      // }

      return this._ternarySearch(0, data.length, positionTop);
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

    if (!!data.length) {
      const currentItemId = this._getItemIdFromPosition(scrollTop);
      const currentIndex = this.viewModel.getCache().getIndex(currentItemId);
      const numOfItemInViewport = this._getItemsInViewport(scrollTop, height, currentItemId).length;

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
   *  @param {string} firstItemIdInViewport
   *
   *  @return {Array<string>} - Stores all items' id in viewport. Can be empty.
   */
  _getItemsInViewport(scrollTop: number, viewportHeight: number, firstItemIdInViewport: string): Array<string> {
    const dataLength = this.viewModel.getDataUnfreeze().length;
    const results = [];

    if (!!dataLength) {
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
