import React from 'react';
import './scss/Demo.scss';
import Masonry from '../View/Masonry.js';
import { fakeData, MessageTypes } from "./utils/FakeData";
import { ListMessageExample } from "./utils/ListMessageExample";
import MasonryViewModel from "../ViewModel/MasonryViewModel";
import Message from "./Message";
import DataViewModel from "../ViewModel/DataViewModel";
import ItemCache from "../utils/ItemCache";

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

  _fakeDataList() {
    let _fakeDataList = [];
    for (let i = 0; i < DATA_NUMBER; i++) {
      _fakeDataList.push(this._randomItem(i));
    }
    return _fakeDataList;
  }

  loadMoreTop() {
    if (this.loadTopCount > 0) {
      const res = this._generateMoreItems(10);
      for (let i = 0; i < res.length; i++) {
        this.viewModel.addTop(res[i]);
      }
      this.loadTopCount--;
    }
  }

  loadMoreBottom() {
    if (this.loadBottomCount > 0) {
      const res = this._generateMoreItems(10, false);
      for (let i = 0; i < res.length; i++) {
        this.viewModel.addBottom(res[i]);
      }
      this.loadBottomCount--;
    }
  }

  onAddItem() {
    const {moreIndex} = this.state;
    const item = this._randomItem(this.itemCount);
    this.itemCount++;
    if (this._isInRange(moreIndex, 0, this.dataViewModel.getDataList.length)) {
      this.viewModel.onAddItem(moreIndex, item);
    }
  };

  static cellRender({item, index, removeCallback}) {
    return (
      <Message id={item.itemId}
               key={item.itemId}
               index={index}
               userAvatarUrl={item.avatar}
               userName={item.userName}
               msgType={item.msgType}
               msgContent={item.msgContent}
               sentTime={item.timestamp}
               isMine={item.isMine}
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

  _randomItem = function (index): Object {
    const result = {...fakeData};
    result.itemId = result.itemId + index;
    result.userName = result.userName + index;
    const imgUrl = result.avatar;
    const imgNum = Math.floor(Math.random() * 99) + ".jpg";
    result.avatar = imgUrl + "thumb/men/" + Math.floor(Math.random() * 99) + ".jpg";
    result.msgType = Math.random() > 0.5 ?
      MessageTypes.MESSAGE :
      MessageTypes.IMAGE;
    result.msgContent = result.msgType === MessageTypes.MESSAGE ?
      ListMessageExample[Math.floor(Math.random() * 20)] :
      imgUrl + "men/" + imgNum;
    return result;
  };

  _generateMoreItems(num: number) {
    let arrayItems = [];
    for (let i = 0; i < num; i++) {
      arrayItems.push(this._randomItem(this.itemCount + i));
    }

    this.itemCount += num;
    return arrayItems;
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