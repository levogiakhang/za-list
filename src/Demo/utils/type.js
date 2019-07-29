// @flow
export type DataType = {
  itemId: string,
  userId: string,
  userName: string,
  userAva: string,
  msgInfo: {
    msgType: number,
    msgContent: {
      message: string,
      params: {
        width: number,
        height: number,
      },
      thumbUrl: string,
      oriUrl: string,
    }
  },
  sentTime: number, // Epoch
  isMine: boolean,
  sentStatus: number,
};
