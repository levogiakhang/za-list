import React from 'react';
import './scss/Demo.scss';
import Masonry from '../View/Masonry.js';
import Message from './Message/Message';
import generation from './utils/Generation';
import GConst from './utils/values';
import throttle from '../vendors/throttle';
import createMasonryViewModel from '../ViewModel/MasonryViewModel';
import UserMessage from './Message/UserMessage';

const DATA_TOTAL_NUMBER = 40;
const DATA_UI_NUMBER = 15;

const lv1 = 'background-color: #3F51B5; color:#FFF; padding: 0 10px; border-radius: 5px; line-height: 26px; font-size: 1.1rem; font-weight: 700l; font-style: italic';
const lv2 = 'background-color: Maroon; color:#FFF; padding: 0 10px; border-radius: 5px; line-height: 26px; font-size: 1rem; font-weight: 700';
const lv3 = 'background: Gainsboro; color: navy; padding: 0 5px; border-radius: 5px; line-height: 20px; font-size: 0.9rem; font-weight: 700';

class Demo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      indexToAddMore: 0,
      raiseIndex: 0,
      itemIdToScroll: 0,
      indexToScroll: 0,
      removeId: 0,
      removeFrom: 0,
      removeTo: 0,
    };

    this.loadTopCount = 5;
    this.loadBottomCount = 5;

    this.dataTotal = this._fakeDataList();
    this.dataTotalMap = new Map();
    this.dataTotal.forEach((item) => {
      this.dataTotalMap.set(item.itemId, this.dataTotal.indexOf(item));
    });


    this.handleChangeIndex = this.handleChangeIndex.bind(this);
    this.handleChangeItemIdToScroll = this.handleChangeItemIdToScroll.bind(this);
    this.handleChangeIndexToScroll = this.handleChangeIndexToScroll.bind(this);
    this.handleChangeRaiseIndex = this.handleChangeRaiseIndex.bind(this);
    this.handleChangeRemoveId = this.handleChangeRemoveId.bind(this);
    this.handleChangeRemoveFrom = this.handleChangeRemoveFrom.bind(this);
    this.handleChangeRemoveTo = this.handleChangeRemoveTo.bind(this);
    this.loadMoreTop = this.loadMoreTop.bind(this);
    this.loadMoreBottom = this.loadMoreBottom.bind(this);
    this.onLoadMoreTop = this.onLoadMoreTop.bind(this);
    this.onLoadMoreBottom = this.onLoadMoreBottom.bind(this);
    this.lookUpItem = this.lookUpItem.bind(this);
    this.lookUpItemToScrollTop = this.lookUpItemToScrollTop.bind(this);
    this.lookUpItemToScrollBottom = this.lookUpItemToScrollBottom.bind(this);
    this.updateData = this.updateData.bind(this);
    this.raiseItemSucceed = this.raiseItemSucceed.bind(this);
  }

  componentDidMount(): void {
    this.initList();
    this.setState({isLoading: false});
  }

  initList() {
    this.masonry = React.createRef();

    this.viewModel = createMasonryViewModel({
      data: this._getDataFromDataTotal(0, DATA_UI_NUMBER, DATA_TOTAL_NUMBER),
      defaultHeight: 74,
    });

    //this.dataOnList.addEventListener('onDataChanged', this.viewModel.onDataChanged);
    this.viewModel.addEventListener('onAddItemsSucceed', this.addItemToDataTotal);
    this.viewModel.addEventListener('onRemoveItemByIdSucceed', this.removeItemFromDataTotal);
    this.viewModel.addEventListener('onRemoveItemsAtSucceed', this.removeItemsFromDataTotal);
    this.viewModel.addEventListener('onRemoveItemAtSucceed', this.removeItemFromDataTotal);
    this.viewModel.addEventListener('onLookForItemToScroll', this.lookUpItem);
    this.viewModel.addEventListener('onLookForItemToScrollTop', this.lookUpItemToScrollTop);
    this.viewModel.addEventListener('onLookForItemToScrollBottom', this.lookUpItemToScrollBottom);
    this.viewModel.addEventListener('raiseItemSucceed', this.raiseItemSucceed);
  };


  /* ========================================================================
   Handle Changes
   ======================================================================== */
  handleChangeIndex(e) {
    if (this._isInRange(e.target.value, 0, this.viewModel.getDataUnfreeze().length)) {
      this.setState({indexToAddMore: e.target.value});
    }
    else {
      alert('OUT OF RANGE');
    }
  };

  handleChangeItemIdToScroll(e) {
    this.setState({itemIdToScroll: e.target.value});
  }

  handleChangeIndexToScroll(e) {
    if (this._isInRange(e.target.value, 0, this.viewModel.getData().length - 1)) {
      this.setState({indexToScroll: e.target.value});
    }
    else {
      alert('OUT OF RANGE');
    }
  }

  handleChangeRaiseIndex(e) {
    if (this._isInRange(e.target.value, 0, this.viewModel.getDataUnfreeze().length - 1)) {
      this.setState({raiseIndex: e.target.value});
    }
    else {
      alert('OUT OF RANGE');
    }
  };

  handleChangeRemoveId(e) {
    this.setState({removeId: e.target.value});
  }

  handleChangeRemoveFrom(e) {
    this.setState({removeFrom: e.target.value});
  }

  handleChangeRemoveTo(e) {
    this.setState({removeTo: e.target.value});
  }

  /* ========================================================================
   Events Listener Callback
   ======================================================================== */
  onLoadMoreTop(firstItemId) {
    this.loadMoreTop(firstItemId);
  }

  onLoadMoreBottom(lastItemId) {
    this.loadMoreBottom(lastItemId);
  }

  lookUpItem(itemId: string) {
    if (!this.dataTotalMap.has(itemId)) {
      alert('Dont have this item');
    }
    else {
      const itemIndex = this.dataTotalMap.get(itemId);
      const newData = this._getDataFromDataTotal(itemIndex - DATA_UI_NUMBER / 2, itemIndex + DATA_UI_NUMBER / 2 - 1, this.dataTotal.length);
      this.viewModel.updateData(newData);
      this.viewModel.pendingScrollToSpecialItem(itemId);
    }
  }

  lookUpItemToScrollTop() {
    const newData = this._getDataFromDataTotal(0, DATA_UI_NUMBER - 1, this.dataTotal.length);
    this.viewModel.updateData(newData);
    this.viewModel.pendingScrollToSpecialItem(this.dataTotal[0].itemId, false);
    // pending load and scroll top
  }

  lookUpItemToScrollBottom() {
    const newData = this._getDataFromDataTotal(this.dataTotal.length - DATA_UI_NUMBER, this.dataTotal.length - 1, this.dataTotal.length);
    this.viewModel.updateData(newData);
    this.viewModel.pendingScrollToSpecialItem(this.dataTotal[this.dataTotal.length - 1].itemId, false);
    // pending load and scroll top
  }


  /* ========================================================================
   Get & Check
   ======================================================================== */
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
    // Dynamic height
    //return generation.generateItems(DATA_TOTAL_NUMBER);

    // Equal height
    return generation.generateIdenticalItems(DATA_TOTAL_NUMBER);
  };

  loadMoreTop(firstItemIdInCurrentUI) {
    let index = firstItemIdInCurrentUI === null ?
      0 :
      this.dataTotalMap.get(firstItemIdInCurrentUI);

    if (index <= 0 || index >= this.dataTotal.length - 1) {
      return;
    }

    const res = this._getDataFromDataTotal(index - 10, index - 1, this.dataTotal.length);
    this.viewModel.loadTop(res);
  }

  loadMoreBottom(lastItemIdInCurrentUI) {
    let index = lastItemIdInCurrentUI === null ?
      0 :
      this.dataTotalMap.get(lastItemIdInCurrentUI);

    if (index < 0 || index >= this.dataTotal.length - 1) {
      return;
    }

    const res = this._getDataFromDataTotal(index + 1, index + 10, this.dataTotal.length);
    this.viewModel.loadBottom(res);
  }

  onAddItem = () => {
    const {indexToAddMore} = this.state;
    let item = generation.generateIdenticalItems(1)[0];
    if (this._isInRange(indexToAddMore, 0, this.viewModel.getData().length)) {
      this.viewModel.onAddItem(indexToAddMore, item);
    }
  };

  onAddItemTop = () => {
    let items = generation.generateIdenticalItems(10);
    for (let i = 0; i < items.length; i++) {
      this.viewModel.addTop(items[i]);
    }
  };

  onAddItemBottom = () => {
    let item = generation.generateIdenticalItems(10);
    this.viewModel.addBottom(item);
  };

  addItemToDataTotal = ({startIndex, items, beforeItem, afterItem}) => {
    if (Array.isArray(this.dataTotal)) {
      const beforeItemId = beforeItem ?
        beforeItem.itemId :
        null;
      const afterItemId = afterItem ?
        afterItem.itemId :
        null;

      if (beforeItemId !== null) {
        this.dataTotal.splice(this.dataTotalMap.get(beforeItemId) + 1, 0, items);
        this.dataTotal = this.dataTotal.flat();
      }
      else {
        this.dataTotal.splice(this.dataTotalMap.get(afterItemId) - 1, 0, items);
        this.dataTotal = this.dataTotal.flat();
      }
      this.updateDataIndexMap();
    }
  };

  removeItemFromDataTotal = ({fromItemId, deletedItems, beforeItem, afterItem}) => {
    if (Array.isArray(this.dataTotal)) {
      const beforeItemId = beforeItem ?
        beforeItem.itemId :
        null;
      const afterItemId = afterItem ?
        afterItem.itemId :
        null;

      if (beforeItemId !== null) {
        this.dataTotal.splice(this.dataTotalMap.get(beforeItemId) + 1, deletedItems.length);
      }
      else {
        this.dataTotal.splice(this.dataTotalMap.get(afterItemId) - 1, deletedItems.length);
      }
      this.updateDataIndexMap();
      this.dataTotalMap.delete(fromItemId);
    }
  };

  removeItemsFromDataTotal = ({fromIndex, deletedItems, beforeItem, afterItem}) => {
    if (Array.isArray(this.dataTotal)) {
      const beforeItemId = beforeItem ?
        beforeItem.itemId :
        null;
      const afterItemId = afterItem ?
        afterItem.itemId :
        null;

      if (beforeItemId !== null) {
        this.dataTotal.splice(this.dataTotalMap.get(beforeItemId) + 1, deletedItems.length);
      }
      else {
        this.dataTotal.splice(this.dataTotalMap.get(afterItemId) - 1, deletedItems.length);
      }
      this.updateDataIndexMap();
      console.log(deletedItems);
      deletedItems.forEach(item => {
        this.dataTotalMap.delete(item);
      });
    }
  };

  raiseItemSucceed({oldIndex}) {
    if (Array.isArray(this.dataTotal)) {
      const validIndex = oldIndex === this.dataTotal.length ?
        this.dataTotal.length - 1 :
        oldIndex;
      this.dataTotal.unshift(this.dataTotal.splice(validIndex, 1)[0]);
      this.updateDataIndexMap();
    }
  }

  updateDataIndexMap() {
    // High cost :)
    this.dataTotal.forEach((item) => {
      this.dataTotalMap.set(item.itemId, this.dataTotal.indexOf(item));
    });
  }

  updateData() {
    let arr = this.dataTotal;
    [
      arr[0],
      arr[1],
    ] = [
      arr[1],
      arr[0],
    ];

    // const newArr = generation.generateIdenticalItems(30);
    this.viewModel.updateData([...arr]);
  }


  /* ========================================================================
   Graphics User Interface
   ======================================================================== */
  static cellRender({item, index, removeCallback, becomeSelectedItemCallback}) {
    if (
      item &&
      item.msgInfo &&
      item.msgInfo.msgType &&
      item.msgInfo.msgType === 5
    ) {
      return <UserMessage itemId={item.itemId}
                          index={index}
                          userAvatarSrc={item.userAva}
                          userName={item.userName}
                          timestamp={item.sentTime}
                          msgContent={item.msgInfo.msgContent}
                          onRemoveCallback={removeCallback}
                          setSelectedItem={becomeSelectedItemCallback}/>;
    }
    else {
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
        {this._renderUpdateDataControl()}
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
    const {itemIdToScroll, indexToScroll} = this.state;
    return (
      <div className={'card'}
           style={{
             marginTop: GConst.Spacing['2'],
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
                this.masonry.current.zoomToItem('itemId_' + itemIdToScroll);
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
          display: 'flex',
          margin: GConst.Spacing['0'],
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
                this.masonry.current.scrollTo(indexToScroll);
              }}>
              Scroll to index:
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
                     placeholder={`Index to Scroll`}
                     value={indexToScroll}
                     onChange={this.handleChangeIndexToScroll}/>

              <div style={{
                display: 'flex',
                width: '100%',
                justifyContent: 'center',
              }}>
                <p
                  style={{margin: 0}}>(Index)</p>
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
                this.viewModel.scrollToTopAtCurrentUI();
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
            width: '50%',
          }}>
            <button disabled
                    className={'other-hover'}
                    style={{
                      minWidth: '100px',
                      width: '100%',
                      minHeight: '50px',
                      height: 'auto',
                      maxHeight: '50px',
                      margin: GConst.Spacing[0],
                      fontSize: GConst.Font.Size.Medium,
                    }}
                    onClick={() => {
                      this.viewModel.scrollToTop(this.dataTotal[0].itemId);
                    }}>
              Scroll To Top (First Item)
            </button>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '50%',
          }}>
            <button disabled
                    className={'other-hover'}
                    style={{
                      minWidth: '100px',
                      width: '100%',
                      minHeight: '50px',
                      height: 'auto',
                      maxHeight: '50px',
                      margin: GConst.Spacing[0],
                      fontSize: GConst.Font.Size.Medium,
                    }}
                    onClick={() => {
                      this.viewModel.scrollToBottom(this.dataTotal[this.dataTotal.length - 1].itemId);
                    }}>
              Scroll To Bottom (Last Item)
            </button>
          </div>
        </div>
      </div>
    );
  };

  _renderUpdateDataControl = () => {
    const {raiseIndex, removeId, removeFrom, removeTo} = this.state;
    return (
      <div className={'card'}
           style={{
             marginTop: GConst.Spacing['2'],
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
          Update Data Controller
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
              onClick={() => {
                this.viewModel.raiseItemByIndex(raiseIndex);
              }}>
              Raise item at:
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
                     value={raiseIndex}
                     onChange={this.handleChangeRaiseIndex}/>

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
              onClick={() => {
                this.viewModel.onRemoveItemById('itemId_' + removeId);
              }}>
              Remove item id:
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
                     placeholder={`Id`}
                     value={removeId}
                     onChange={this.handleChangeRemoveId}/>

              <div style={{
                display: 'flex',
                width: '100%',
                justifyContent: 'center',
              }}>
                <p
                  style={{margin: 0}}>(id)</p>
              </div>
            </div>
          </div>
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
              onClick={() => {
                this.viewModel.onRemoveItemsAt(removeFrom, removeTo - removeFrom + 1);
              }}>
              Remove from - to:
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
                minWidth: '70px',
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
                     value={removeFrom}
                     onChange={this.handleChangeRemoveFrom}/>

              <input style={{
                minWidth: '70px',
                width: '50%',
                minHeight: '34px',
                height: 'auto',
                maxHeight: '34px',
                borderRadius: '5px',
                outline: 'none',
                fontSize: '1rem',
                textAlign: 'center',
                paddingLeft: GConst.Spacing['0.5'],
                marginLeft: '5px',
              }}
                     type={'number'}
                     placeholder={`Index`}
                     value={removeTo}
                     onChange={this.handleChangeRemoveTo}/>
            </div>
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
              onClick={() => {
                this.updateData();
              }}>
              Update Outer data
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
             marginTop: GConst.Spacing['2'],
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
              console.log('=====================================================================================');
              console.groupCollapsed('%cData Total', `${lv1}`);
              console.log('%cTotal data', `${lv3}`, this.dataTotal);
              console.log('%cTotal data map', `${lv3}`, this.dataTotalMap);
              console.groupEnd();
              console.log(`\n`);
              console.group('%cData On List', `${lv1}`);
              console.group('%cData', `${lv2}`);
              console.log('%cOld data', `${lv3}`, this.viewModel.getOldItems());
              console.log('%cData on List', `${lv3}`, this.viewModel.getData());
              console.log('%cData map', `${lv3}`, this.viewModel.getDataMap());
              console.groupEnd();
              console.group('%cCache', `${lv2}`);
              console.group('%cCurrent scrollTop', `${lv3}`);
              console.log(`%c${this.masonry.current.state.scrollTop}`, 'color: DarkSlateGray; font-size: 1.3rem; font-weight: 700');
              console.groupEnd();
              console.log('%cItems map:', `${lv3}`, this.viewModel.getCache().getItemsMap);
              console.log('%cIndex map:', `${lv3}`, this.viewModel.getCache().getIndexMap);
              console.groupEnd();
              console.groupEnd();
              console.log('=====================================================================================');
              console.log(`\n`);
              console.log(`\n`);
            }}>
            Log data
          </button>
        </div>

        <div style={{
          display: 'flex',
          margin: GConst.Spacing['0'],
          marginTop: GConst.Spacing['0.5'],
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
              console.clear();
            }}>
            Clear log
          </button>
        </div>

        <div style={{
          display: 'flex',
          margin: GConst.Spacing['0'],
          marginTop: GConst.Spacing['0.5'],
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
              const item = this.viewModel.getItemAt(1);
              const gId = generation.generateId();
              const newItem = {
                ...item,
                userName: gId,
              };
              console.log(this.viewModel.getSelectedItem());
              for (let i = 0; i < 29; i++) {
                if (i % 2) {
                  this.viewModel.onRemoveItemById('itemId_' + i);
                }
              }
            }}>
            Test xàm xàm
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
               isStartAtBottom={false}
               isItemScrollToInBottom={true}
               scrollToAnim={'highlighted zoomScaling'}
               additionAnim={'zoomIn'}
               removalAnim={'zoomOut'}
               timingResetAnimation={200}
               renderDirection={'BottomUp'}
               isVirtualized={true}
               numOfOverscan={3}
               forChatBoxView={false}
               onLoadTop={this.onLoadMoreTop}
               onLoadBottom={this.onLoadMoreBottom}
               noHScroll/>
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