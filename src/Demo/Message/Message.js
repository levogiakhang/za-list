// @flow

import React from 'react';
import '../scss/index.scss';
import isFunction from "../../vendors/isFunction";
import Image from "./Image";
import NormalMessage from "./NormalMessage";
import GConst from "../utils/values";
import reactImg from '../resources/img/emoji.png';

type OnRemoveItemCallback = any;

type MessageProps = {
  itemId: number,
  userId: number,
  userName: string,
  userAva: string,
  msgInfo: {
    msgType: number,
    msgContent: {
      message?: string,
      params?: {
        width: 123,
        height: 123,
      },
      thumbUrl?: string,
      oriUrl?: string,
    }
  },
  sentTime: number, // Epoch
  isMine: boolean,
  sentStatus: number,
  onRemoveItem: OnRemoveItemCallback;
};

export default class Message extends React.PureComponent<MessageProps> {
  constructor(props) {
    super(props);

    this.state = {
      isExpanded: false,
    };

    this._onExpandHeight = this._onExpandHeight.bind(this);
    this._onRemove = this._onRemove.bind(this);
  }

  renderAvatar = () => {
    const {userAva} = this.props;
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        minWidth: '40px',
        height: '100%',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'white',
          minWidth: '36px',
          maxWidth: '36px',
          minHeight: '36px',
          maxHeight: '36px',
          borderRadius: '50%',
        }}>
          <img src={`${userAva}`}
               alt={"Avatar"}
               style={{
                 minWidth: '34px',
                 maxWidth: '34px',
                 minHeight: '34px',
                 maxHeight: '34px',
                 borderRadius: '50%',
               }}
               onClick={this._onRemove}/>
        </div>
      </div>
    )
  };

  renderContent = () => {
    const {userName, msgInfo, sentTime, isMine, sentStatus} = this.props;
    switch (msgInfo.msgType) {
      case 1: {
        return (
          <NormalMessage userName={userName}
                         msg={msgInfo.msgContent.message}
                         sentTime={sentTime}
                         isMine={isMine}
                         sentStatus={sentStatus}/>
        );
      }
      case 2: {
        // Image without content
        return (
          <Image width={msgInfo.msgContent.params.width}
                 height={msgInfo.msgContent.params.height}
                 thumbUrl={msgInfo.msgContent.thumbUrl}
                 oriUrl={msgInfo.msgContent.oriUrl}
                 sentTime={sentTime}
                 isMine={isMine}
                 sentStatus={sentStatus}/>
        );
      }
      case 3: {
        return (
          <Image message={msgInfo.msgContent.message}
                 width={msgInfo.msgContent.params.width}
                 height={msgInfo.msgContent.params.height}
                 thumbUrl={msgInfo.msgContent.thumbUrl}
                 oriUrl={msgInfo.msgContent.oriUrl}
                 sentTime={sentTime}
                 isMine={isMine}
                 sentStatus={sentStatus}/>
        );
      }
      case 4: {
        return (<div>Webview</div>);
      }
      default: {
        return;
      }
    }
  };

  render() {
    const {
      itemId,
      isMine
    } = this.props;


    return (
      isMine ?
        <div id={itemId}
             key={itemId}
             style={{
               display: 'flex',
               justifyContent: 'flex-end',
               paddingTop: GConst.Spacing["0.5"],
               paddingBottom: GConst.Spacing["0.5"],
             }}>
          {this.renderContent()}
          <div style={{
            paddingLeft: GConst.Spacing["0.5"],
          }}>
            {this.renderAvatar()}
          </div>
        </div>
        :
        <div id={itemId}
             key={itemId}
             style={{
               display: 'flex',
               paddingTop: GConst.Spacing["0.5"],
               paddingBottom: GConst.Spacing["0.5"],
             }}>
          {this.renderAvatar()}
          <div style={{
            paddingLeft: GConst.Spacing["0.5"],
          }}>
            {this.renderContent()}
          </div>
        </div>
    );
  }

  _onExpandHeight() {
    const {isExpanded} = this.state;
    isExpanded ?
      this.setState({isExpanded: false}) :
      this.setState({isExpanded: true})
  }

  _onRemove() {
    const {itemId, onRemoveItem} = this.props;
    if (isFunction(onRemoveItem)) {
      onRemoveItem(itemId);
    }
  }
}