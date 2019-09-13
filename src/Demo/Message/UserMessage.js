// @flow

import React from 'react';
import GConst from '../utils/values';

type UserMessageProps = {
  userAvatarSrc: string,
  userName: string,
  timestamp: string,
  msgContent: string,
};

class UserMessage extends React.PureComponent<UserMessageProps> {
  static defaultProps = {
    userAvatarSrc: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/1200px-Liverpool_FC.svg.png',
    userName: 'Jaka',
    timestamp: '1568363819',
    msgContent: 'I love you',
  };

  _getDisplayTime(time) {
    return time;
  }

  _renderAvatar({userAvatarSrc}) {
    return (
      <div className={'avatar-container'}
           style={{
             minWidth: '52px',
             maxWidth: '52px',
             minHeight: '52px',
             maxHeight: '52px',
           }}>
        <img className={'avatar'}
             src={userAvatarSrc}
             alt={'Avatar'}
             style={{
               borderRadius: '50%',
             }}/>
      </div>
    );
  };

  _renderContent({userName, timestamp, msgContent}) {
    return (
      <div className={'item-content-container'}
           style={{
             width: '90%',
             padding: `
          ${GConst.Spacing[0]}
          ${GConst.Spacing[0]}
          ${GConst.Spacing[0]}
          ${GConst.Spacing[1]}
          `,
           }}>
        <div className={'item-title'}
             style={{
               minHeight: '33px',
               maxHeight: '33px',
               display: 'flex',
               justifyContent: 'space-between',
             }}>
          <div className={'item-title-name'}
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 lineHeight: '1.3',
                 whiteSpace: 'nowrap',
               }}>
            {userName}
          </div>
          <div className={'item-timestamp'}
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 right: 0,
                 lineHeight: '1.3',
                 margin: `
            ${GConst.Spacing[0]}
            ${GConst.Spacing[0]}
            ${GConst.Spacing[0]}
            ${GConst.Spacing[0.25]}`,
                 color: '#899098',
                 fontSize: GConst.Font.Size.Small,
               }}>
            <span style={{marginTop: '4px'}}>
            {this._getDisplayTime(timestamp)}
            </span>
          </div>
        </div>

        <div className={'item-msg'}
             style={{
               display: 'flex',
               maxWidth: '100%',
               alignItems: 'center',
               whiteSpace: 'nowrap',
             }}>
          <div style={{
            color: '#899098',
            maxWidth: '100%',
            fontSize: GConst.Font.Size.Small,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}>
            {msgContent.message}
          </div>
        </div>
      </div>
    );
  }

  render() {
    const {userAvatarSrc, userName, timestamp, msgContent} = this.props;
    return (
      <div className={'msg-item'}
           style={{
             minHeight: '74px',
             maxHeight: '74px',
             overflow: 'hidden',
             backgroundColor: 'transparent',
           }}>
        <div className={'msg-item-container'}
             style={{
               display: 'flex',
               padding: GConst.Spacing[0.75],
             }}>
          {this._renderAvatar({userAvatarSrc})}
          {this._renderContent({
            userName,
            timestamp,
            msgContent,
          })}
        </div>
      </div>
    );
  }
}

export default UserMessage;