// @flow

import idGen from "./IdentificationGenerator";
import type { DataType } from './type';
import GConst from "./values";
import { FakeMessage, FakeUserName } from "./FakeData";
import { randomInclusive, repetition } from "./math";

class Generation {
  constructor() {
    this.id = idGen;

    this.generateItems = this.generateItems.bind(this);
  }

  //#region Special Item
  generateMessage = (isMine: false) => {
    const msgId = this.id.generateId();
    const message: DataType = {
      itemId: "itemId_" + msgId,
      userId: "userId_" + msgId,
      userName: `${isMine ? FakeUserName[0] : FakeUserName[randomInclusive(1, FakeUserName.length)]}`,
      userAva: `${isMine ?
        GConst.MyAva :
        GConst.AvatarBaseUrl + `thumb/men/${repetition(msgId, 99)}.jpg`}`,
      msgInfo: {
        msgType: GConst.MessageTypes.Message,
        msgContent: {
          message: FakeMessage[randomInclusive(0, FakeMessage.length - 1)],
        }
      },
      sentTime: Date.now(),
      isMine: isMine,
      sentStatus: randomInclusive(1, 3),
    };

    return message;
  };

  generateImageWithoutContent = ({width, height}, isMine: false) => {
    const imgId = this.id.generateId();
    const img: DataType = {
      itemId: "itemId_" + imgId,
      userId: "userId_" + imgId,
      userName: `${isMine ? FakeUserName[0] : FakeUserName[randomInclusive(1, FakeUserName.length)]}`,
      userAva: `${isMine ?
        GConst.MyAva :
        GConst.AvatarBaseUrl + `thumb/men/${repetition(imgId, 99)}.jpg`}`,
      msgInfo: {
        msgType: GConst.MessageTypes.ImageWithoutContent,
        msgContent: {
          message: FakeMessage[randomInclusive(0, FakeMessage.length - 1)],
          params: {
            width: width,
            height: height,
          },
          thumbUrl: GConst.ImageBaseUrl + repetition(imgId, 1010) + `/${width}/${height}`,
          oriUrl: GConst.ImageBaseUrl + repetition(imgId, 1010) + `/1920/1080`,
        }
      },
      sentTime: Date.now(),
      isMine: isMine,
      sentStatus: randomInclusive(1, 3),
    };
    return img;
  };

  generateImage = ({width, height}, isMine: false) => {
    const imgId = this.id.generateId();
    const img: DataType = {
      itemId: "itemId_" + imgId,
      userId: "userId_" + imgId,
      userName: `${isMine ? FakeUserName[0] : FakeUserName[randomInclusive(1, FakeUserName.length)]}`,
      userAva: `${isMine ?
        GConst.MyAva :
        GConst.AvatarBaseUrl + `thumb/men/${repetition(imgId, 99)}.jpg`}`,
      msgInfo: {
        msgType: GConst.MessageTypes.Image,
        msgContent: {
          message: FakeMessage[randomInclusive(0, FakeMessage.length - 1)],
          params: {
            width: width,
            height: height,
          },
          thumbUrl: GConst.ImageBaseUrl + repetition(imgId, 1010) + `/${width}/${height}`,
          oriUrl: GConst.ImageBaseUrl + repetition(imgId, 1010) + `/1920/1080`,
        }
      },
      sentTime: Date.now(),
      isMine: isMine,
      sentStatus: randomInclusive(1, 3),
    };
    return img;
  };
  //#endregion


  generateItem = (type, isMine, width?: number, height?: number) => {
    switch (type) {
      case GConst.MessageTypes.Message: {
        return this.generateMessage(isMine);
      }
      case GConst.MessageTypes.ImageWithoutContent: {
        return this.generateImageWithoutContent({
          width: width,
          height: height
        }, isMine);
      }
      case GConst.MessageTypes.Image: {
        return this.generateImage({
          width: width,
          height: height
        }, isMine);
      }
      default: {
        return null;
      }
    }
  };

  generateItems(num: number) {
    let arrayItems = [];
    for (let i = 0; i < num; i++) {
      const msgType = randomInclusive(1, 3);
      if (msgType === GConst.MessageTypes.Message) {
        arrayItems.push(
          this.generateItem(
            msgType,
            randomInclusive(0, 1) === 0
          ));
      } else {
        arrayItems.push(
          this.generateItem(
            msgType,
            randomInclusive(0, 1) === 0,
            174,
            368
          ));
      }
    }
    return arrayItems;
  }
}

const generation = new Generation();
export default generation;