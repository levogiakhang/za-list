import GConst from "./values";

export function convertTime(time) {
  let date = new Date(time);

  let year = date.getFullYear();
  let month = date.getMonth();
  let _date = date.getDate();
  let day = date.getDay();
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let seconds = date.getSeconds();
  let milliseconds = date.getMilliseconds();

  //let formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);

  return {
    year,
    month,
    date: _date,
    day,
    hours,
    minutes,
    seconds,
    milliseconds
  };
}

export function getDisplaySentStatus(sentStatus) {
  switch (sentStatus) {
    case 1: {
      return  GConst.SentStatus["1"];
    }
    case 2: {
      return  GConst.SentStatus["2"];
    }
    case 3: {
      return  GConst.SentStatus["3"];
    }
    default: {
      return null;
    }
  }
}

export function getDisplayTime({hours, minutes}) {
  let hour = hours < 10 ? "0" + hours : hours;
  let minute = minutes < 10 ? "0" + minutes : minutes;
  return hour + ":" + minute;
}