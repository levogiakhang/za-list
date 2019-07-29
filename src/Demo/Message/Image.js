import React from 'react';
import {
  convertTime,
  getDisplaySentStatus,
  getDisplayTime
} from "../utils/Converter";
import GConst from "../utils/values";

type ImageType = {
  message?: string,
  width: number,
  height: number,
  thumbUrl: string,
  oriUrl: string,
  sentTime: number,
  isMine: boolean,
  sentStatus?: number,
};

class Image extends React.PureComponent<ImageType> {
  render() {
    const {
      message,
      width,
      height,
      thumbUrl,
      sentTime,
      isMine,
      sentStatus
    } = this.props;

    let dStatus = getDisplaySentStatus(sentStatus);

    return (
      <div style={{
        maxWidth: '300px',
        border: `${isMine ? 'none' : GConst.Border.Style + " " + GConst.Border.Width + " " + GConst.Border.TheirColor}`,
        borderRadius: `${GConst.Border.Radius}`,
        backgroundColor: `${isMine ?
          GConst.BackgroundMessage.Mine :
          GConst.BackgroundMessage.Their}`,
      }}>
        <div style={{
          minWidth: width,
          maxWidth: "100%",
          minHeight: height,
          maxHeight: height,
        }}>
          <img src={`${thumbUrl}`}
               alt={"Could not load!"}
               width={"100%"}
               height={height}
               style={{
                 borderTopLeftRadius: `${GConst.Border.Radius}`,
                 borderTopRightRadius: `${GConst.Border.Radius}`,
                 borderBottomLeftRadius: `${message ? 0 : GConst.Border.Radius}`,
                 borderBottomRightRadius: `${message ? 0 : GConst.Border.Radius}`,
               }}/>
        </div>

        {message ?
          <div style={{
            width: '100%',
          }}>
            <div style={{
              padding: `${GConst.Padding.MsgContent.Top} 
                        ${GConst.Padding.MsgContent.Left}
                        ${GConst.Padding.MsgContent.Bottom}`,
              fontSize: `${GConst.Font.Size.Medium}`,
              color: `${GConst.Color.Black}`,
            }}>
              {message}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: `${GConst.Spacing[0.5]} 
                        ${GConst.Padding.MsgContent.Left}
                        ${GConst.Spacing[0.5]}`,
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
          </div> :
          null
        }
      </div>
    );
  }
}

export default Image;