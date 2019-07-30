// @flow

import React from 'react';
import GConst from "../utils/values";
import {
  convertTime,
  getDisplaySentStatus,
  getDisplayTime
} from "../utils/Converter";

type NormalMessageType = {
  userName: string,
  msg: string,
  isMine: boolean,
  sentTime: number,
  sentStatus: number,
};

class NormalMessage extends React.Component<NormalMessageType> {
  render() {
    const {
      userName,
      msg,
      isMine,
      sentTime,
      sentStatus
    } = this.props;

    let dStatus = getDisplaySentStatus(sentStatus);

    return (
      <div style={{
        maxWidth: '80%',
        padding: `${GConst.Spacing[0.5]} 
                  ${GConst.Padding.MsgContent.Left}
                  ${GConst.Spacing[0.5]}`,
        backgroundColor: `${isMine ?
          GConst.BackgroundMessage.Mine :
          GConst.BackgroundMessage.Their}`,
        borderRadius: `${GConst.Border.Radius}`,
      }}>
        {
          isMine ? null :
            <div style={{
              fontSize: `${GConst.Font.Size.Small}`,
              color: `${GConst.Color.Gray}`,
              paddingRight: GConst.Spacing[0.75],
            }}>
              {userName}
            </div>
        }

        <div style={{
          padding: `${isMine ? GConst.Spacing["0"]: GConst.Padding.MsgContent.Top} 
                    ${GConst.Spacing["0"]}
                    ${GConst.Padding.MsgContent.Bottom}`,
          fontSize: `${GConst.Font.Size.Medium}`,
          color: `${GConst.Color.Black}`
        }}>
          {msg}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: `${GConst.Font.Medium}`,
          color: `${GConst.Color.Gray}`,
        }}>
          <div style={{
            display: 'inline-block'
          }}>
            {getDisplayTime(convertTime(sentTime))}
          </div>

          {
            isMine ?
              <div style={{
                display: 'inline-block',
                marginLeft: GConst.Spacing[1]
              }}>
                {dStatus}
              </div> :
              null
          }

        </div>
      </div>
    )
  }
}

export default NormalMessage;