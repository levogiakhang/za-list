import React from 'react';
import './scss/Demo.scss';
import Masonry from '../View/Masonry.js';
import MasonryViewModel from "../ViewModel/MasonryViewModel";
import Message from "./Message/Message";
import DataViewModel from "../ViewModel/DataViewModel";
import ItemCache from "../utils/ItemCache";
import generation from "./utils/Generation";
import { randomInclusive } from "./utils/math";
import GConst from "./utils/values";

const DATA_NUMBER = 10;

class Demo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      moreIndex: 0,
    };

    this.loadTopCount = 2;
    this.loadBottomCount = 5;

    this.itemCount = DATA_NUMBER;

    this.dataViewModel = new DataViewModel(this._fakeDataList());

    this.handleChangeIndex = this.handleChangeIndex.bind(this);
    this.loadMoreTop = this.loadMoreTop.bind(this);
    this.loadMoreBottom = this.loadMoreBottom.bind(this);
    this.onAddItem = this.onAddItem.bind(this);
  }

  componentDidMount(): void {
    this.initList();
    this.setState({isLoading: false});
  }

  initList() {
    this.masonry = React.createRef();
    this.itemCache = new ItemCache(150);

    this.viewModel = new MasonryViewModel({
      dataViewModel: this.dataViewModel,
      node: this.masonry,
      itemCache: this.itemCache
    });

    this.dataViewModel.addEventListener('onDataChanged', this.viewModel.onDataChanged);
    this.viewModel.onLoadMoreTop(this.loadMoreTop);
    this.viewModel.onLoadMoreBottom(this.loadMoreBottom);
  };

  _fakeDataList = () => {
    let _fakeDataList = [];
    for (let i = 0; i < DATA_NUMBER; i++) {
      const msgType = randomInclusive(1, 3);
      let item = undefined;
      if (msgType === GConst.MessageTypes.Message) {
        item = generation.generateItem(msgType, randomInclusive(0, 1) === 0);
      } else {
        item = generation.generateItem(msgType, randomInclusive(0, 1) === 0, 174, 368);
      }
      _fakeDataList.push(item);
    }
    return _fakeDataList;
  };

  loadMoreTop() {
    if (this.loadTopCount > 0) {
      const res = generation.generateItems(10);
      for (let i = 0; i < res.length; i++) {
        this.viewModel.addTop(res[i]);
      }
      this.loadTopCount--;
    }
  }

  loadMoreBottom() {
    if (this.loadBottomCount > 0) {
      const res = generation.generateItems(10, false);
      for (let i = 0; i < res.length; i++) {
        this.viewModel.addBottom(res[i]);
      }
      this.loadBottomCount--;
    }
  }

  onAddItem() {
    const {moreIndex} = this.state;
    const msgType = randomInclusive(1, 3);
    let item = undefined;
    if (msgType === GConst.MessageTypes.Message) {
      item = generation.generateItem(msgType, randomInclusive(0, 1) === 0);
    } else {
      item = generation.generateItem(msgType, randomInclusive(0, 1) === 0, 174, 368);
    }
    this.itemCount++;
    if (this._isInRange(moreIndex, 0, this.dataViewModel.getDataList.length)) {
      this.viewModel.onAddItem(moreIndex, item);
    }
  };

  static cellRender({item, index, removeCallback}) {
    return (
      <Message itemId={item.itemId}
               key={item.itemId}
               index={index}
               userId={item.userId}
               userName={item.userName}
               userAva={item.userAva}
               msgInfo={item.msgInfo}
               sentTime={item.sentTime}
               isMine={item.isMine}
               sentStatus={item.sentStatus}
               onRemoveItem={removeCallback}/>
    );
  }

  handleChangeIndex(e) {
    if (this._isInRange(e.target.value, 0, this.dataViewModel.getDataList.length)) {
      this.setState({moreIndex: e.target.value});
    } else {
      alert('OUT OF RANGE');
    }
  };

  _isInRange = function (index: number, startIndex: number, endIndex: number): boolean {
    return index >= startIndex && index <= endIndex;
  };

  _renderControlView = () => {
    const {moreIndex} = this.state;
    return (
      <div className={'control-view'}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
        }}>
          <input className={'input-demo input-index'}
                 type={'number'}
                 placeholder={`Index`}
                 value={moreIndex}
                 onChange={this.handleChangeIndex}/>

          <button className={'btn-control btn-add'}
                  onClick={this.onAddItem}>
            Add new item at
          </button>
        </div>
        <div style={{
          display: 'flex',
          margin: '20px',
          justifyContent: 'space-around'
        }}>
          <button onClick={() => {
            this.viewModel.scrollToSpecialItem('id_' + this.state.moreIndex)
          }}> Scroll To
          </button>

          <button onClick={() => {
            this.viewModel.scrollToTop()
          }}> Scroll Top
          </button>

          <button onClick={() => {
            this.viewModel.scrollToBottom()
          }}> Scroll Bottom
          </button>

          <button onClick={() => {
            this.dataViewModel.insertItem(1, this._randomItem(this.itemCount));
            this.itemCount++;
          }}> Insert Item
          </button>

          <button onClick={() => {
            console.log(this.dataViewModel.getDataList);
            console.log(this.viewModel.itemCache.getItemsMap);
            console.log(this.viewModel.itemCache.getIndexMap);
          }}> Show Data
          </button>

          <button onClick={() => {
            this.dataViewModel.onDataChanged();
          }}> Show Data VM
          </button>

        </div>
      </div>
    );
  };

  _renderList = () => {
    return (
      <Masonry ref={this.masonry}
               style={{marginTop: "10px", borderRadius: '5px'}}
               id={'Masonry'}
               viewModel={this.viewModel}
               cellRenderer={Demo.cellRender}
               isStartAtBottom={true}
               isItemScrollToInBottom={true}
               animationName={'highlighted zoomIn'}
               timingResetAnimation={500}/>
    )
  };

  render() {
    const {isLoading} = this.state;
    return (
      isLoading ?
        <div>Loading...</div>
        :
        <div className={'container'}>
          <div
            style={{display: 'flex', justifyContent: 'space-around'}}>
            <div style={{width: '100%'}}>
              {this._renderControlView()}
              {this._renderList()}
            </div>
          </div>
        </div>
    );
  }
}

export default Demo;