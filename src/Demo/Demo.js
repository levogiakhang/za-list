import React from 'react';
import './scss/Demo.scss';
import Masonry from '../View/Masonry.js';
import MasonryViewModel from '../ViewModel/MasonryViewModel';
import Message from './Message/Message';
import DataViewModel from '../ViewModel/DataViewModel';
import ItemCache from '../utils/ItemCache';
import generation from './utils/Generation';
import { randomInclusive } from './utils/math';
import GConst from './utils/values';

const DATA_TOTAL_NUMBER = 100;
const DATA_UI_NUMBER = 20;

class Demo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      indexToAddMore: 0,
      itemIdToScroll: 0,
    };

    this.loadTopCount = 5;
    this.loadBottomCount = 5;

    this.dataTotal = this._fakeDataList();
    this.dataTotalMap = new Map();
    this.dataTotal.forEach((item) => {
      this.dataTotalMap.set(item.itemId, this.dataTotal.indexOf(item));
    });

    this.dataViewModel = new DataViewModel(this._getDataFromDataTotal(DATA_TOTAL_NUMBER - DATA_UI_NUMBER, DATA_TOTAL_NUMBER, DATA_TOTAL_NUMBER));

    this.handleChangeIndex = this.handleChangeIndex.bind(this);
    this.handleChangeItemIdToScroll = this.handleChangeItemIdToScroll.bind(this);
    this.loadMoreTop = this.loadMoreTop.bind(this);
    this.loadMoreBottom = this.loadMoreBottom.bind(this);
    this.enableLoadMoreTop = this.enableLoadMoreTop.bind(this);
    this.enableLoadMoreBottom = this.enableLoadMoreBottom.bind(this);
    this.lookUpItem = this.lookUpItem.bind(this);
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
      itemCache: this.itemCache,
    });

    //this.dataViewModel.addEventListener('onDataChanged', this.viewModel.onDataChanged);
    this.viewModel.addEventListener('loadTop', this.enableLoadMoreTop);
    this.viewModel.addEventListener('loadBottom', this.enableLoadMoreBottom);
    this.viewModel.addEventListener('lookUpItemToScroll', this.lookUpItem);
  };


  /* ========================================================================
   Handle Changes
   ======================================================================== */
  handleChangeIndex(e) {
    if (this._isInRange(e.target.value, 0, this.dataViewModel.getDataList.length)) {
      this.setState({indexToAddMore: e.target.value});
    }
    else {
      alert('OUT OF RANGE');
    }
  };

  handleChangeItemIdToScroll(e) {
    this.setState({itemIdToScroll: e.target.value});
  }


  /* ========================================================================
   Events Listener Callback
   ======================================================================== */
  enableLoadMoreTop() {
    this.viewModel.onLoadMoreTop(this.loadMoreTop);
  }

  enableLoadMoreBottom() {
    this.viewModel.onLoadMoreBottom(this.loadMoreBottom);
  }

  lookUpItem(itemId: string) {
    if (!this.dataTotalMap.has(itemId)) {
      alert('Dont have this item');
    }
    else {
      const itemIndex = this.dataTotalMap.get(itemId);
      const newData = this._getDataFromDataTotal(itemIndex - DATA_UI_NUMBER / 2, itemIndex + DATA_UI_NUMBER / 2 - 1, DATA_TOTAL_NUMBER);
      const newArrItemId = [];
      newData.forEach(item => {
        newArrItemId.push(item.itemId);
      });
      const oldArrItemId = [];
      this.viewModel.getDataList.forEach(item => {
        oldArrItemId.push(item.itemId);
      });
      this.viewModel.updateData(newData);
      this.viewModel.pendingScrollToSpecialItem(this._getDiff(newArrItemId, oldArrItemId).length, itemId);
    }
  }


  /* ========================================================================
   Get & Check
   ======================================================================== */
  _getDiff = (a, b) => {
    return a.filter(function (i) {
      return b.indexOf(i) < 0;
    });
  };

  _getDataFromDataTotal = (startIndex: number, endIndex: number, dataLength: number) => {
    let start = startIndex;
    let end = endIndex;
    let results = [];

    if (startIndex < 0) {
      start = 0;
    }
    if (startIndex >= dataLength) {
      start = dataLength - 1;
    }
    if (endIndex >= dataLength) {
      end = dataLength - 1;
    }
    if (endIndex < start) {
      end = start;
    }
    if (endIndex < 0) {
      end = start;
    }

    for (let i = start; i <= end; i++) {
      results.push(this.dataTotal[i]);
    }

    return results;
  };

  _isInRange = function (index: number, startIndex: number, endIndex: number): boolean {
    return index >= startIndex && index <= endIndex;
  };


  /* ========================================================================
   Create Data & Items
   ======================================================================== */
  _fakeDataList = () => {
    return generation.generateItems(DATA_TOTAL_NUMBER);
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

  onAddItem = () => {
    const {indexToAddMore} = this.state;
    let item = generation.generateItems(1)[0];
    if (this._isInRange(indexToAddMore, 0, this.dataViewModel.getDataList.length)) {
      this.viewModel.onAddItem(indexToAddMore, item);
    }
  };

  onAddItemTop = () => {
    let item = generation.generateItems(1)[0];
    this.viewModel.onAddItem(0, item);
  };

  onAddItemBottom = () => {
    let item = generation.generateItems(1)[0];
    this.viewModel.onAddItem(this.dataViewModel.getDataList.length, item);
  };


  /* ========================================================================
   Graphics User Interface
   ======================================================================== */
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

  _renderHeader = () => {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: GConst.Spacing['0.5'],
        }}>
        <h1 style={{
          margin: GConst.Spacing['1'],
        }}>React List Demo</h1>
      </div>
    );
  };

  _renderControlView = () => {
    return (
      <div style={{
        minWidth: '400px',
        width: '400px',
        minHeight: '100%',
        height: '100%',
        padding: `0 ${GConst.Spacing[0.5]}`,
      }}>
        {this._renderAddControl()}
        {this._renderScrollControl()}
        {this._renderDevTool()}
      </div>
    );
  };

  _renderAddControl = () => {
    const {indexToAddMore} = this.state;
    return (
      <div className={'card'}
           style={{
             marginTop: 0,
             borderRadius: '5px',
             padding: `
         ${GConst.Spacing['0.25']}
         ${GConst.Spacing['0.75']}
         ${GConst.Spacing['0.5']}
         ${GConst.Spacing['0.75']}`,
           }}>
        <div style={{
          fontStyle: GConst.Font.Style.Italic,
          fontSize: GConst.Font.Size.Medium,
          marginBottom: GConst.Spacing['0.5'],
        }}>
          Add Controller
        </div>

        <div style={{
          display: 'flex',
          margin: GConst.Spacing['0'],
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '50%',
          }}>
            <button
              style={{
                minWidth: '100px',
                width: '100%',
                minHeight: '40px',
                height: 'auto',
                maxHeight: '40px',
                margin: GConst.Spacing[0],
                fontSize: GConst.Font.Size.Medium,
              }}
              onClick={this.onAddItem}>
              Add new item at:
            </button>
          </div>
          <div style={{
            display: 'flex',
            width: '50%',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <div style={{
              display: 'flex',
              maxWidth: '180px',
              alignItems: 'center',
            }}>
              <input style={{
                minWidth: '100px',
                width: '50%',
                minHeight: '34px',
                height: 'auto',
                maxHeight: '34px',
                borderRadius: '5px',
                outline: 'none',
                fontSize: '1rem',
                textAlign: 'center',
                paddingLeft: GConst.Spacing['0.5'],
              }}
                     type={'number'}
                     placeholder={`Index`}
                     value={indexToAddMore}
                     onChange={this.handleChangeIndex}/>

              <div style={{
                display: 'flex',
                width: '100%',
                justifyContent: 'center',
              }}>
                <p
                  style={{margin: 0}}>(index)</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: GConst.Spacing['0.75'],
          border: '0.5px dashed #000',
        }}/>

        <div style={{
          display: 'flex',
          marginTop: GConst.Spacing['0.75'],
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '50%',
          }}>
            <button
              style={{
                minWidth: '100px',
                width: '100%',
                minHeight: '40px',
                height: 'auto',
                maxHeight: '40px',
                margin: GConst.Spacing[0],
                fontSize: GConst.Font.Size.Medium,
              }}
              onClick={this.onAddItemTop}>
              Add Top
            </button>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '50%',
          }}>
            <button
              style={{
                minWidth: '100px',
                width: '100%',
                minHeight: '40px',
                height: 'auto',
                maxHeight: '40px',
                margin: GConst.Spacing[0],
                fontSize: GConst.Font.Size.Medium,
              }}
              onClick={this.onAddItemBottom}>
              Add Bottom
            </button>
          </div>
        </div>
      </div>
    );
  };

  _renderScrollControl = () => {
    const {itemIdToScroll} = this.state;
    return (
      <div className={'card'}
           style={{
             marginTop: GConst.Spacing['3'],
             borderRadius: '5px',
             padding: `
         ${GConst.Spacing['0.25']}
         ${GConst.Spacing['0.75']}
         ${GConst.Spacing['0.5']}
         ${GConst.Spacing['0.75']}`,
           }}>
        <div style={{
          fontStyle: GConst.Font.Style.Italic,
          fontSize: GConst.Font.Size.Medium,
          marginBottom: GConst.Spacing['0.5'],
        }}>
          Scroll Controller
        </div>

        <div style={{
          display: 'flex',
          margin: GConst.Spacing['0'],
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '50%',
          }}>
            <button
              className={'other-hover'}
              style={{
                minWidth: '100px',
                width: '100%',
                minHeight: '40px',
                height: 'auto',
                maxHeight: '40px',
                margin: GConst.Spacing[0],
                fontSize: GConst.Font.Size.Medium,
              }}
              onClick={() => {
                this.viewModel.scrollToSpecialItem('itemId_' + itemIdToScroll);
              }}>
              Scroll to item ID:
            </button>
          </div>
          <div style={{
            display: 'flex',
            width: '50%',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <div style={{
              display: 'flex',
              maxWidth: '180px',
              alignItems: 'center',
            }}>
              <input style={{
                minWidth: '100px',
                width: '50%',
                minHeight: '34px',
                height: 'auto',
                maxHeight: '34px',
                borderRadius: '5px',
                outline: 'none',
                fontSize: '1rem',
                textAlign: 'center',
                paddingLeft: GConst.Spacing['0.5'],
              }}
                     type={'number'}
                     placeholder={`Item ID`}
                     value={itemIdToScroll}
                     onChange={this.handleChangeItemIdToScroll}/>

              <div style={{
                display: 'flex',
                width: '100%',
                justifyContent: 'center',
              }}>
                <p
                  style={{margin: 0}}>(ID)</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: GConst.Spacing['0.75'],
          border: '0.5px dashed #000',
        }}/>

        <div style={{
          display: 'flex',
          marginTop: GConst.Spacing['0.75'],
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '50%',
          }}>
            <button
              className={'other-hover'}
              style={{
                minWidth: '100px',
                width: '100%',
                minHeight: '40px',
                height: 'auto',
                maxHeight: '40px',
                margin: GConst.Spacing[0],
                fontSize: GConst.Font.Size.Medium,
              }}
              onClick={() => {
                this.viewModel.scrollToTop();
              }}>
              Scroll To Top UI
            </button>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '50%',
          }}>
            <button
              className={'other-hover'}
              style={{
                minWidth: '100px',
                width: '100%',
                minHeight: '40px',
                height: 'auto',
                maxHeight: '40px',
                margin: GConst.Spacing[0],
                fontSize: GConst.Font.Size.Medium,
              }}
              onClick={() => {
                this.viewModel.scrollToBottomAtCurrentUI();
              }}>
              Scroll To Bottom UI
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          marginTop: GConst.Spacing['0.75'],
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
          }}>
            <button
              className={'other-hover'}
              style={{
                minWidth: '370px',
                width: '100%',
                minHeight: '40px',
                height: 'auto',
                maxHeight: '40px',
                margin: GConst.Spacing[0],
                fontSize: GConst.Font.Size.Medium,
              }}
              onClick={() => {
                this.viewModel.scrollToBottomAtCurrentUI();
              }}>
              Scroll To Bottom (Last Item)
            </button>
          </div>
        </div>
      </div>
    );
  };

  _renderDevTool = () => {
    return (
      <div className={'card'}
           style={{
             marginTop: GConst.Spacing['3'],
             borderRadius: '5px',
             padding: `
         ${GConst.Spacing['0.25']}
         ${GConst.Spacing['0.75']}
         ${GConst.Spacing['0.5']}
         ${GConst.Spacing['0.75']}`,
           }}>
        <div style={{
          fontStyle: GConst.Font.Style.Italic,
          fontSize: GConst.Font.Size.Medium,
          marginBottom: GConst.Spacing['0.5'],
        }}>
          Dev tools
        </div>

        <div style={{
          display: 'flex',
          margin: GConst.Spacing['0'],
        }}>
          <button
            style={{
              minWidth: '370px',
              width: '100%',
              minHeight: '40px',
              height: 'auto',
              maxHeight: '40px',
              margin: GConst.Spacing[0],
              fontSize: GConst.Font.Size.Medium,
            }}
            onClick={() => {
              console.log('total data: ', this.dataTotal);
              console.log('data on VM: ', this.dataViewModel.getDataList);
              console.log('items map: ', this.viewModel.itemCache.getItemsMap);
              console.log('index map: ', this.viewModel.itemCache.getIndexMap);
            }}>
            Log data
          </button>
        </div>
      </div>
    );
  };

  _renderList = () => {
    return (
      <Masonry ref={this.masonry}
               style={{
                 marginTop: '0px',
                 borderRadius: '5px',
               }}
               id={'Masonry'}
               viewModel={this.viewModel}
               height={700}
               cellRenderer={Demo.cellRender}
               isStartAtBottom={true}
               isItemScrollToInBottom={true}
               scrollToAnim={'highlighted zoomScaling'}
               additionAnim={'zoomIn'}
               removalAnim={'zoomOut'}
               timingResetAnimation={300}/>
    );
  };

  render() {
    const {isLoading} = this.state;
    return (
      isLoading ?
        <div>Loading...</div>
        :
        <div className={'container'}>
          {this._renderHeader()}

          <div style={{
            display: 'flex',
            height: '870px',
          }}>
            {this._renderControlView()}
            {this._renderList()}
          </div>
        </div>
    );
  }
}

export default Demo;