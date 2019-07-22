import { NOT_FOUND } from "../utils/value";
import isFunction from "../vendors/isFunction";

class MasonryViewModel {
  constructor({dataViewModel, node, itemCache}) {
    this.dataViewModel = dataViewModel;
    this.masonry = node;
    this.itemCache = itemCache;

    this.loadMoreTopCallback = undefined;
    this.loadMoreBottomCallback = undefined;

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

  onLoadMoreTop(fn) {
    if (typeof fn === 'function') {
      this.loadMoreTopCallback = fn;
    }
  }

  onLoadMoreBottom(fn) {
    if (typeof fn === 'function') {
      this.loadMoreBottomCallback = fn;
    }
  }

  scrollToSpecialItem(itemId) {
    if (this.masonry &&
    this.masonry.current) {
      this.masonry.current.scrollToSpecialItem(itemId);
    }
  }

  scrollToTop() {
    if (this.masonry) {
      this.masonry.current.scrollToTop();
    }
  }

  scrollToBottom() {
    if (this.masonry) {
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
    if (this.masonry && this.isIdAlready(itemId)) {
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

  insertItem(index: number, item) {
    this.dataViewModel.insertItem(index, item);
  }

  deleteItem(index: number, deleteCount: number = 1) {
    this.dataViewModel.deleteItem(index, deleteCount);
  }

  updateData(data) {
    if (this.masonry) {
      this.clear();
      this.setData(data);
      this.masonry.current.initialize();
      this.masonry.current.reRender();
    }
  }

  appendStyle(el, animationNames) {
    if (this.masonry) {
      this.masonry.current.appendStyle(el, animationNames);
    }
  }

  removeStyle(el, animationNames) {
    if (this.masonry) {
      this.masonry.current.removeStyle(el, animationNames);
    }
  }

  // region GET-SET
  get getDataList() {
    return this.dataViewModel.getDataList;
  }

  get getMasonry() {
    return this.masonry;
  }

  get getItemCache() {
    return this.itemCache;
  }

  get getLoadMoreTopCallBack() {
    return this.loadMoreTopCallback;
  }

  get getLoadMoreBottomCallBack() {
    return this.loadMoreBottomCallback;
  }

  setData(data) {
    this.dataViewModel = [];
    this.dataViewModel = data;
  }

  setMasonry(masonry) {
    this.masonry = masonry;
  }

  setCellCache(cache) {
    this.cellCache = cache;
  }

  // endregion
}

export default MasonryViewModel;