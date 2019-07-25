// @flow

import React from 'react';
import './scss/index.scss';
import isFunction from "../vendors/isFunction";
import { MessageTypes } from "./utils/FakeData";

type OnRemoveItemCallback = any;

type MessageProps = {
  id: string;
  userAvatarUrl: string;
  userName: string;
  msgType: number;
  msgContent: string;
  sentTime: string;
  isMine: boolean;
  onRemoveItem: OnRemoveItemCallback;
};

export default class Message extends React.PureComponent<MessageProps> {
  constructor(props) {
    super(props);

    this.state = {
      isExpanded: false,
    };

    this._onClick = this._onClick.bind(this);
    this._onRemove = this._onRemove.bind(this);
  }

  render() {
    const {id, index, userAvatarUrl, userName, msgType, msgContent, sentTime, isMine} = this.props;
    const {isExpanded} = this.state;

    return (
      isMine ?
        <div id={id} className="row">
          <div className={isExpanded ? "expand-height" : "none"}/>
          <div className={"my-message-container"}>

            <div className={"my-button-container"}>
              <button className={"red"} onClick={this._onClick}>
                {isExpanded ?
                  "Minimize" :
                  "Expand"
                }
              </button>
            </div>

            {/* MESSAGE CONTENT VIEW */}
            <div className="my-message-content-container">
              <div className="my-message-content-user-name">
                <p>{userName}</p>
                <p> Index in data: {index} </p>
              </div>

              <div className="my-message-content-content">
                <p>{msgContent}</p>
              </div>

              <div className="my-message-content-sent-time">
                <p>{this._getDisplayTime(new Date(sentTime))}</p>
              </div>
            </div>

            {/* AVATAR VIEW */}
            <div className="my-message-avatar-container">
              <div className="my-message-avatar-border">
                <img className="my-message-avatar"
                     src={userAvatarUrl}
                     alt="Avatar"/>
              </div>
            </div>
          </div>
        </div>

        :

        <div id={id} className={"their-message-container"}>
          <div className={isExpanded ? "expand-height" : "none"}/>

          {/* AVATAR VIEW */}
          <div className="their-message-avatar-container">
            <div className="their-message-avatar-border">
              <img className="their-message-avatar"
                   src={userAvatarUrl}
                   alt="Avatar"/>
            </div>
          </div>

          {/* MESSAGE CONTENT VIEW */}
          <div className="their-message-content-container">
            <div className="their-message-content-user-name">
              <p>{userName}</p>
              <p> Index in data: {index} </p>
            </div>

            <div className="their-message-content-content">
              {
                msgType === MessageTypes.MESSAGE ?
                  <p>{msgContent}</p> :
                  <img src={msgContent} alt={'myImg'}/>
              }
            </div>

            <div className="their-message-content-sent-time">
              <p>{this._getDisplayTime(new Date(sentTime))}</p>
            </div>
          </div>

          <div className={"their-button-container"}>
            <button className={"red"} onClick={this._onClick}>
              {isExpanded ?
                "Minimize" :
                "Expand"
              }
            </button>

            <button style={{marginLeft: "10px"}}
                    onClick={this._onRemove}>
              Remove
            </button>
          </div>
        </div>
    );
  }

  _getDisplayTime = (time): string => {
    let minutes = time.getMinutes();
    if (time.getMinutes() < 10) {
      minutes = '0' + time.getMinutes();
    }
    let hours = time.getHours();
    if (time.getHours() < 10) {
      hours = '0' + time.getHours();
    }
    return hours + ':' + minutes;
  };

  _onClick() {
    const {isExpanded} = this.state;
    isExpanded ?
      this.setState({isExpanded: false}) :
      this.setState({isExpanded: true})
  }

  _onRemove() {
    const {id, onRemoveItem} = this.props;
    if (isFunction(onRemoveItem)) {
      onRemoveItem(id);
    }
  }
}