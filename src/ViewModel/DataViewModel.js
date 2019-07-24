// @flow

import { NOT_FOUND } from "../utils/value";

type EventTypes = 'onDataChanged';
type Callback = (params: any) => any;

class DataViewModel {
  constructor(data) {
    this.data = data;

    // for purpose quick look-up
    this.dataMap = new Map();

    // stores storageEvent handler
    this.storageEvent = {};
    this.init();
  }

  init() {
    if (Array.isArray(this.data)) {
      this.data.forEach((item) => {
        this.dataMap.set(item.itemId, item);
      })
    } else {
      console.error('The initialized data is NOT an array');
    }
  }

  addEventListener(eventName: EventTypes, callback: Callback) {
    this.storageEvent.hasOwnProperty(eventName) ?
      this.storageEvent[eventName].push(callback) :
      this.storageEvent = {...this.storageEvent, [eventName]: [(callback)]};
  }

  onDataChanged() {
    if(Array.isArray(this.storageEvent['onDataChanged'])) {
      this.storageEvent['onDataChanged'].forEach((eventCallback) => {
        eventCallback();
      });
    }
  }

  clearData() {
    this.data = [];
    this.dataMap.clear();
  }

  updateNewData(data) {
    this.setData(data);
    this.init();
  }

  insertItem(index: number, item: Object) {
    if (
      Array.isArray(this.data) &&
      this._isValidIndex(index) &&
      !this._isIdAlready(item.itemId)
    ) {
      this.data.splice(index, 0, item);
      this.dataMap.set(item.itemId, item);
      this.onDataChanged();
    }
  }

  insertItems(index: number, arrItem: Array) {
    if (
      Array.isArray(arrItem) &&
      this._isValidIndex(index)
    ) {
      for (let i = arrItem.length - 1; i <= 0; i--) {
        this.insertItem(index, arrItem[i]);
      }
    }
  }

  deleteItem(index: number, deleteCount: number = 1) {
    if (
      Array.isArray(this.data) &&
      this._isValidIndex(index)
    ) {
      for (let i = index; i < index + deleteCount; i++) {
        this.dataMap.delete(this.data[i].itemId);
      }
      this.data.splice(index, deleteCount);
    }
  }

  addItemTop(item: Object) {
    this.insertItem(0, item);
  }

  appendTop(arrItem: Array) {
    this.insertItems(0, arrItem);
  }

  addItemBottom(item: Object) {
    this.data.length === 0 ?
      this.insertItem(0, item) :
      this.insertItem(this.data.length - 1, item);
  }

  appendBottom(arrItem: Array) {
    this.data.length === 0 ?
      this.insertItems(0, arrItem) :
      this.insertItems(this.data.length - 1, arrItem);
  }

  getItem(itemId: string): Object {
    return this.dataMap.has(itemId) ? this.dataMap.get(itemId) : NOT_FOUND;
  }

  _isValidIndex(index: number): boolean {
    const rsIndex = parseInt(index);
    return (
      typeof rsIndex === 'number' &&
      rsIndex <= this.data.length &&
      rsIndex >= 0
    );
  }

  _isIdAlready(id: string): boolean {
    return this.dataMap.has(id);
  };

  get getDataList() {
    return this.data;
  }

  setData(newData: Array) {
    this.data = newData;
  }
}

export default DataViewModel;