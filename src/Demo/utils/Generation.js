// @flow

import idGen from './IdentificationGenerator';
import type { DataType } from './type';
import GConst from './values';
import {
  FakeMessage,
  FakeUserName,
} from './FakeData';
import {
  randomInclusive,
  repetition,
} from './math';

class Generation {
  constructor() {
    this.id = idGen;

    this.generateItems = this.generateItems.bind(this);
  }

  //#region Special Item
  generateDataOfMessage = (isMine: false) => {
    const msgId = this.id.generateId();
    const message: DataType = {
      itemId: 'itemId_' + msgId,
      userId: 'userId_' + msgId,
      userName: `${isMine ?
        FakeUserName[0] :
        FakeUserName[randomInclusive(1, FakeUserName.length)]}`,
      userAva: `${isMine ?
        GConst.MyAva :
        GConst.AvatarBaseUrl + `thumb/men/${repetition(msgId, 99)}.jpg`}`,
      msgInfo: {
        msgType: GConst.MessageTypes.Message,
        msgContent: {
          message: FakeMessage[randomInclusive(0, FakeMessage.length - 1)],
        },
      },
      sentTime: Date.now(),
      isMine: isMine,
      sentStatus: randomInclusive(1, 3),
    };

    return message;
  };

  generateDataOfImageWithoutContent = ({width, height}, isMine: false) => {
    const imgId = this.id.generateId();
    const img: DataType = {
      itemId: 'itemId_' + imgId,
      userId: 'userId_' + imgId,
      userName: `${isMine ?
        FakeUserName[0] :
        FakeUserName[randomInclusive(1, FakeUserName.length)]}`,
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
        },
      },
      sentTime: Date.now(),
      isMine: isMine,
      sentStatus: randomInclusive(1, 3),
    };
    return img;
  };

  generateDataOfImage = ({width, height}, isMine: false) => {
    const imgId = this.id.generateId();
    const img: DataType = {
      itemId: 'itemId_' + imgId,
      userId: 'userId_' + imgId,
      userName: `${isMine ?
        FakeUserName[0] :
        FakeUserName[randomInclusive(1, FakeUserName.length)]}`,
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
        },
      },
      sentTime: Date.now(),
      isMine: isMine,
      sentStatus: randomInclusive(1, 3),
    };
    return img;
  };

  generateDataOfUserMessage = () => {
    const userMsgId = this.id.generateId();
    const userMsg = {
      itemId: 'itemId_' + userMsgId,
      userName: FakeUserName[randomInclusive(1, FakeUserName.length)],
      userAva: GConst.AvatarBaseUrl + `thumb/men/${repetition(userMsgId, 99)}.jpg`,
      sentTime: Date.now(),
      msgInfo: {
        msgType: GConst.MessageTypes.UserMessage,
        msgContent: {
          message: FakeMessage[randomInclusive(0, FakeMessage.length - 1)],
        },
      },
    };

    return userMsg;
  };

  generateAlphabetUserMsg = (num) => {
	  const userMsgId = this.convertNumToChar(num);
	  const userMsg = {
		  itemId: 'itemId_' + userMsgId,
		  userName: userMsgId,
		  userAva: GConst.AvatarBaseUrl + `thumb/men/${repetition(num, 99)}.jpg`,
		  sentTime: Date.now(),
		  msgInfo: {
			  msgType: GConst.MessageTypes.UserMessage,
			  msgContent: {
				  message: userMsgId,
			  },
		  },
	  };

	  return userMsg;
  };

	convertNumToChar(num) {
		switch (num) {
			case 0:
				return 'A';
			case 1:
				return 'B';
			case 2:
				return 'C';
			case 3:
				return 'D';
			case 4:
				return 'E';
			case 5:
				return 'F';
			case 6:
				return 'G';
			case 7:
				return 'H';
			case 8:
				return 'I';
			case 9:
				return 'J';
			case 10:
				return 'K';
			case 11:
				return 'L';
			case 12:
				return 'M';
			case 13:
				return 'N';
			case 14:
				return 'O';
			case 15:
				return 'P';
			case 16:
				return 'Q';
			case 17:
				return 'R';
			case 18:
				return 'S';
			case 19:
				return 'T';
			case 20:
				return 'U';
			case 21:
				return 'V';
			case 22:
				return 'W';
			case 23:
				return 'X';
			case 24:
				return 'Y';
			case 25:
				return 'Z';
			default:
				return 'A';
		}
	}
  //#endregion


  generateItem = (type, isMine, width?: number, height?: number, num) => {
    switch (type) {
      case GConst.MessageTypes.Message: {
        return this.generateDataOfMessage(isMine);
      }
      case GConst.MessageTypes.ImageWithoutContent: {
        return this.generateDataOfImageWithoutContent({
          width: width,
          height: height,
        }, isMine);
      }
      case GConst.MessageTypes.Image: {
        return this.generateDataOfImage({
          width: width,
          height: height,
        }, isMine);
      }
      case GConst.MessageTypes.UserMessage: {
        return this.generateDataOfUserMessage();
      }
	    case GConst.MessageTypes.Alphabet: {
	    	return this.generateAlphabetUserMsg(num);
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
            randomInclusive(0, 1) === 0,
          ));
      }
      else {
        arrayItems.push(
          this.generateItem(
            msgType,
            randomInclusive(0, 1) === 0,
            174,
            368,
          ));
      }
    }
    return arrayItems;
  }

  generateIdenticalItems(num: number) {
    let arrayItems = [];
    for (let i = 0; i < num; i++) {
      arrayItems.push(
        this.generateItem(
          5,
        ));
    }
    return arrayItems;
  }

  generateAlphabetItems(num) {
	  let arrayItems = [];
	  for (let i = 0; i < num; i++) {
		  arrayItems.push(
		    this.generateItem(
			  6,
		      null,
		      null,
		      null,
		      i,
		    ));
	  }
	  return arrayItems;
  }

  generateId() {
    return this.id.generateId();
  }
}

const generation = new Generation();
export default generation;