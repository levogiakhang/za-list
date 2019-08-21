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
    this.isLoadDone = false; // Prevent load more on zoom to item when item is not rendered
    this.preventLoadTop = true;
    this.preventLoadBottom = true;
    this.firstItemInViewportBeforeLoadTop = {};
    this.curItemInViewPort = undefined;
    this.firstItemInViewportBeforeAddMore = {};

    this.isAddMore = true;
    this.isAddFirst = false;
    this.needScrollTop = false;
    this.isAddLast = false;
    this.needScrollBottom = false;
    this.newLastItemHeight = 0;
    this.needScrollBack = false;
    this.loadDone = false;
    this.initItemCount = 0;

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
    };

    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
    this.onChildrenChangeHeight = this.onChildrenChangeHeight.bind(this);
    this.onRemoveItem = this.onRemoveItem.bind(this);
    this.scrollToSpecialItem = this.scrollToSpecialItem.bind(this);
    this.scrollToTopAtCurrentUI = this.scrollToTopAtCurrentUI.bind(this);
    this.scrollToBottomAtCurrentUI = this.scrollToBottomAtCurrentUI.bind(this);
    this.scrollToTop = this.scrollToTop.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);
    this._addStaticItemToChildren = this._addStaticItemToChildren.bind(this);
    this.zoomToItem = this.zoomToItem.bind(this);

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
    const data = this.viewModel.getDataOnList;
    this.children = [];
    this._updateOldData();

    if (Array.isArray(data)) {
      // eslint-disable-next-line array-callback-return
      data.map((item, index) => {
        this._addStaticItemToChildren(index, item);
      });
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
    if (this.parentRef !== undefined) {
      this.btnScrollBottomPos.top = this.parentRef.current.offsetTop + height - 50;
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);
  }

  updateUIWhenScrollToItem() {
    const data = this.viewModel.getDataOnList;
    this.children = [];
    this._updateOldData();

    if (Array.isArray(data)) {
      // eslint-disable-next-line array-callback-return
      data.map((item, index) => {
        this._addStaticItemToChildren(index, item);
      });
    }
    else {
      console.error('Data list is not an array');
    }

    this.estimateTotalHeight = (function () {
      let totalHeight = 0;
      for (let key of this.viewModel.itemCache.getItemsMap.keys()) {
        totalHeight += this.viewModel.itemCache.getHeight(key);
      }
      return totalHeight;
    }).call(this);
    this.oldEstimateTotalHeight = this.estimateTotalHeight;

    this.setState(this.state);
  }

  onChildrenChangeHeight(itemId: string, oldHeight: number, newHeight: number) {
    const itemCache = this.viewModel.getItemCache;
    if (itemCache.getHeight(itemId) !== newHeight) {
      // For load more top
      if (!itemCache.isRendered(itemId) && itemCache.getIndex(itemId) < itemCache.getIndex(this.oldData.firstItem)) {
        this.needScrollBack = true;
      }

      // Scroll back to old position when add an item above
      if (!itemCache.isRendered(itemId) && itemCache.getIndex(itemId) < itemCache.getIndex(this.curItemInViewPort)) {
        this.needScrollBack = true;
      }

      // Scroll to top when add an item in top && scrollTop is near top
      if (this.isAddFirst) {
        this.isAddFirst = false;
        this.needScrollTop = true;
      }

      // Scroll to bottom when add an item in bottom && scrollTop is near bottom
      if (this.isAddLast) {
        this.isAddLast = false;
        this.needScrollBottom = true;
        this.newLastItemHeight = newHeight;
      }

      if (!itemCache.isRendered(itemId) && this.isFirstLoadingDone) {
        const {additionAnim, timingResetAnimation} = this.props;
        this.appendStyle(this.getElementFromId(itemId), additionAnim);
        setTimeout(() => {
          this.removeStyle(this.getElementFromId(itemId), additionAnim);
        }, timingResetAnimation);
      }

      this._updateItemsOnChangedHeight(itemId, newHeight, true);

      if (this.initItemCount < this.viewModel.getDataOnList.length - 1) {
        this.initItemCount++;
      }
      else if (this.initItemCount === this.viewModel.getDataOnList.length - 1) {
        this.loadDone = true;
      }

      const isDone = !(this.scrollToSpecialItemCount < this.numOfNewLoading - 1);
      if (!isDone) {
        this.scrollToSpecialItemCount++;
      }
      else if (isDone && this.numOfNewLoading !== 0) {
        if (this.isFirstLoadingDone) {
          this.scrollToSpecialItemCount = 0;
          this.numOfNewLoading = 0;
          if (this.isScrollToSpecialItem) {
            this.needScrollToSpecialItem = true;
          }
          this.isLoadDone = true;
        }
      }

      this._updateEstimatedHeight(newHeight - oldHeight);

      this.setState(this.state); // instead of this.forceUpdate();
    }
  }

  onAddItem(index, item) {
    this.isAddMore = true;

    this._removeStyleOfSpecialItem();

    if (parseInt(index) === 0) {
      this.isAddFirst = true;
    }
    if (parseInt(index) === this.viewModel.getDataOnList.length) {
      this.isAddLast = true;
    }
    this.firstItemInViewportBeforeAddMore = {
      itemId: this.curItemInViewPort,
      disparity: this.state.scrollTop - this.viewModel.getItemCache.getPosition(this.curItemInViewPort),
    };
    this.viewModel._insertItem(index, item);
    this._addStaticItemToChildren(index, item);
    this._updateEstimatedHeight(this.viewModel.itemCache.defaultHeight);
  }

  onRemoveItem(itemId: string) {
    const {height} = this.props;
    const {scrollTop} = this.state;
    const itemCache = this.viewModel.getItemCache;
    const itemIndex = itemCache.getIndex(itemId);

    const {scrollToAnim, removalAnim} = this.props;

    this._removeStyleOfSpecialItem();

    if (itemIndex !== NOT_FOUND) {
      const itemHeight = itemCache.getHeight(itemId);

      const el = document.getElementById(itemId);
      el.style.position = 'absolute';
      el.style.top = itemCache.getPosition(itemId) + 'px';
      this.removeStyle(el, scrollToAnim);

      const parent = el.parentElement;

      const stuntman = document.createElement('DIV');
      stuntman.id = itemId + '_fake';
      stuntman.setAttribute('style', `height: ${itemHeight}px; width:100%; clear:both; position: relative`);

      parent.insertBefore(stuntman, el);

      this.appendStyle(el, removalAnim);
      el.addEventListener('animationend', () => {
        // clear real el from dataOnList, itemCache
        this.viewModel._deleteItem(itemId);
        this._updateOldData();

        // remove from UI
        this.children.splice(itemIndex, 1);
        this._updateEstimatedHeight(-itemHeight);
        this.setState(this.state);
      });

      if (this.estimateTotalHeight > height &&
        scrollTop >= itemHeight &&
        this.estimateTotalHeight - itemHeight > height &&
        scrollTop >= this.estimateTotalHeight - height - itemHeight) {

        const topEl = document.createElement('DIV');
        topEl.setAttribute('style', `height: 0px; width:100%; clear:both; position: relative`);
        topEl.style.setProperty('--itemHeight', itemHeight + 'px');
        parent.prepend(topEl);

        this.appendStyle(topEl, 'makeBigger');
        topEl.addEventListener('animationend', () => {
          parent.removeChild(topEl);
        });
      }
      else if (this.estimateTotalHeight - itemHeight < height) {
        this._scrollTopWithAnim();
      }

      stuntman.style.setProperty('--itemHeight', itemHeight + 'px');
      this.appendStyle(stuntman, 'makeInvisible');
      stuntman.addEventListener('animationend', () => {
        // remove from UI
        parent.removeChild(stuntman);
      });

    }
  }

  onLoadMore(index, item) {
    this.numOfNewLoading++;

    // Conflict with trigger load more when scroll to first | last item on UI
    clearInterval(this.scrUpTimeOutId);
    clearInterval(this.scrDownTimeOutId);

    this._removeStyleOfSpecialItem();
    this.viewModel.insertItemWhenLoadMore(index, item);
    this._addStaticItemToChildren(index, item);
    this._updateEstimatedHeight(this.viewModel.itemCache.defaultHeight);
  }

  zoomToItem(itemId: string) {
    if (itemId === this.itemIdToScroll && this.isStableAfterScrollToSpecialItem) {
      // Re-active animation without scroll.
      this.isScrollToSpecialItem = false;
      if (itemId && this.props.scrollToAnim) {
        const curEl = this.getElementFromId(itemId);
        const newEl = curEl.cloneNode(true);
        const parentNode = curEl.parentNode;
        parentNode.replaceChild(newEl, curEl);
        parentNode.replaceChild(curEl, newEl);
      }
    }
    else {
      this.itemIdToScroll = itemId;
      this.isScrollToSpecialItem = true;
      this.scrollToSpecialItem(this.itemIdToScroll);
    }
  }

  scrollToSpecialItem(itemId: string) {
    const {
      height,
      isItemScrollToInBottom,
      scrollToAnim,
    } = this.props;

    const itemCache = this.viewModel.getItemCache;

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

    if (scrollTop < this.state.scrollTop) {
      this._scrollToItemWithAnimUp(scrollTop, itemId, scrollToAnim);
    }
    else {
      this._scrollToItemWithAnimDown(scrollTop, itemId, scrollToAnim);
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
    this._scrollToOffset(0);
  };

  scrollToBottomAtCurrentUI() {
    this.preventLoadBottom = true;
    this._scrollToOffset(this.estimateTotalHeight);
  };

  scrollToTop() {

  }

  scrollToBottom() {

  }

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

    return (
      <Scrollbars
        key="scroller"
        ref={this._scrollBar}
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
                willChange: 'transform',
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
    const data = this.viewModel.getDataOnList;
    const {height} = this.props;
    const {scrollTop} = this.state;

    if (
      scrollTop < LOAD_MORE_TOP_TRIGGER_POS &&
      this.isFirstLoadingDone &&
      !this.isLoadingTop &&
      !this.preventLoadTop
    ) {
      this.viewModel.enableLoadMoreTop();
    }

    // trigger load more bottom
    LOAD_MORE_BOTTOM_TRIGGER_POS = this.estimateTotalHeight - height - 2;
    if (
      scrollTop >= LOAD_MORE_BOTTOM_TRIGGER_POS &&
      this.isFirstLoadingDone &&
      !this.preventLoadBottom
    ) {
      this.viewModel.enableLoadMoreBottom();
    }

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
    }
    else if (!this.props.isStartAtBottom && !this.isFirstLoadingDone) {
      this.preventLoadTop = true;
      this.isFirstLoadingDone = true;
    }

    // Notify if viewport is not full.
    if (this.isFirstLoadingDone && this.estimateTotalHeight < height) {
      //this.viewModel.enableLoadMoreTop();
    }

    // Check scroll to old position when load more top.
    if (this.needScrollBack) {
      if (this.isAddMore) {
        this.isAddMore = false;
        this._scrollToItem(
          this.firstItemInViewportBeforeAddMore.itemId,
          this.firstItemInViewportBeforeAddMore.disparity,
        );
      }
      else {
        if (!this.isScrollToSpecialItem) {
          this._scrollToItem(
            this.firstItemInViewportBeforeLoadTop.itemId,
            this.firstItemInViewportBeforeLoadTop.disparity,
          );
        }
      }
      this.needScrollBack = false;
    }

    if (this.needScrollTop) {
      this.needScrollTop = false;
      if (scrollTop <= NEED_TO_SCROLL_TOP_POS) {
        this._scrollToOffset(0);
      }
    }

    if (this.needScrollBottom) {
      this.needScrollBottom = false;
      if (scrollTop >= this.estimateTotalHeight - this.newLastItemHeight - height - NEED_TO_SCROLL_BOTTOM_POS) {
        //TODO: conflict with "resize" after add bottom
        this.scrollToBottomAtCurrentUI();
      }
    }

    if (this.needScrollToSpecialItem) {
      this.needScrollToSpecialItem = false;
      this.scrollToSpecialItem(this.itemIdToScroll);
    }

    if (this.oldData.oldLength !== data.length && !this.isLoadingTop) {
      this._updateOldData();
    }
  }

  onLoadMoreTop() {
    this.isLoadingTop = true;
    this.firstItemInViewportBeforeLoadTop = {
      itemId: this.curItemInViewPort,
      disparity: this.state.scrollTop - this.viewModel.getItemCache.getPosition(this.curItemInViewPort),
    };
  }

  pendingScrollToSpecialItem(numOfItems, itemId) {
    if (numOfItems === 0) {
      this.zoomToItem(itemId);
    }
    this.numOfNewLoading = numOfItems;
    this.isScrollToSpecialItem = true;
    this.itemIdToScroll = itemId;
  }

  _scrollTopWithAnim(
    stepInPixel: number = 30,
    msDelayInEachStep: number = 16.66) {

    this.scrTopTimeOutId = setInterval(() => {
      this.masonry.scrollTo(0, this.state.scrollTop - stepInPixel);
      if (this.state.scrollTop <= 0) {
        clearInterval(this.scrTopTimeOutId);
        this.isScrollToSpecialItem = false;
        this._scrollToOffset(0);
      }
    }, msDelayInEachStep);
  }

  _scrollToItemWithAnimUp(
    offset: number,
    itemId: string,
    animationName: string,
    stepInPixel: number = 70,
    msDelayInEachStep: number = 16.66) {

    this.jumpBeforeScroll(offset);

    this.scrUpTimeOutId = window.setInterval(() => {
      this.masonry.scrollTo(0, this.state.scrollTop - stepInPixel);
      if (this.state.scrollTop <= offset) {
        clearInterval(this.scrUpTimeOutId);
        this.isScrollToSpecialItem = false;
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
    stepInPixel: number = 70,
    msDelayInEachStep: number = 16.66) {

    this.jumpBeforeScroll(offset);

    this.scrDownTimeOutId = window.setInterval(() => {
      this.masonry.scrollTo(0, this.state.scrollTop + stepInPixel);
      if (this.state.scrollTop >= offset) {
        clearInterval(this.scrDownTimeOutId);
        this.isScrollToSpecialItem = false;
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
    if (this.masonry !== undefined && this.loadDone) {
      this.isFirstLoadingDone = true;
      this.masonry.firstChild.scrollIntoView(false);
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
    const {height} = this.props;

    this._removeStyleOfSpecialItem();

    const eventScrollTop = this.masonry.scrollTop;
    const scrollTop = Math.min(
      Math.max(0, this.estimateTotalHeight - height),
      eventScrollTop,
    );

    if (Math.round(eventScrollTop) !== Math.round(scrollTop)) {
      return;
    }

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
    const data = this.viewModel.getDataOnList;
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
    const data = this.viewModel.getDataOnList;
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
    const data = this.viewModel.getDataOnList;
    const itemCache = this.viewModel.getItemCache;
    if (!!data.length) {
      if (positionTop >= this.estimateTotalHeight) {
        return itemCache.getItemId(data.length - 1);
      }

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
      this._scrollBar.getScrollLeft();
    }
  }

  getScrollTop() {
    if (this._scrollBar && isFunction(this._scrollBar.getScrollTop)) {
      this._scrollBar.getScrollTop();
    }
  }

  getScrollWidth() {
    if (this._scrollBar && isFunction(this._scrollBar.getScrollWidth)) {
      this._scrollBar.getScrollWidth();
    }
  }

  getScrollHeight() {
    if (this._scrollBar && isFunction(this._scrollBar.getScrollHeight)) {
      this._scrollBar.getScrollHeight();
    }
  }

  getClientWidth() {
    if (this._scrollBar && isFunction(this._scrollBar.getClientWidth)) {
      this._scrollBar.getClientWidth();
    }
  }

  getClientHeight() {
    if (this._scrollBar && isFunction(this._scrollBar.getClientHeight)) {
      this._scrollBar.getClientHeight();
    }
  }

  getValues() {
    if (this._scrollBar && isFunction(this._scrollBar.getValues)) {
      this._scrollBar.getValues();
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
