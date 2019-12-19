const MessageTypes = Object.freeze({
  Message: 1,
  ImageWithoutContent: 2,
  Image: 3,
  WebView: 4,
  UserMessage: 5,
	Alphabet: 6,
});

const Color = Object.freeze({
  Black: '#000',
  White: '#fff',
  Gray: '#808080',
  Accent: "#0068ff",
  Normal: "#DAE9FF",
});

const Spacing = Object.freeze({
  0: '0',
  0.25: '0.25rem',
  0.5: '0.5rem',
  0.75: '0.75rem',
  1: '1rem',
  1.25: '1.25rem',
  1.5: '1.5rem',
  1.75: '1.75rem',
  2: '2rem',
  3: '3rem',
});

const Padding = Object.freeze({
  MsgContent: {
    Top: Spacing["0.25"],
    Left: Spacing["0.75"],
    Right: Spacing["0.75"],
    Bottom: Spacing["0.25"]
  }
});

const Margin = Object.freeze({});

const Border = Object.freeze({
  Style: 'solid',
  Width: '1px',
  TheirColor: '#0068ff',
  MineColor: 'transparent',
  Radius: '7px',
});

const BackgroundMessage = Object.freeze({
  Their: Color.White,
  Mine: Color.Normal,
});

const BackgroundChat = 'black';

const Font = {
  Style: {
    Normal: 'normal',
    Italic: 'italic',
  },
  Size: {
    ExtraLarge: '2rem',
    Large: '1.5rem',
    Medium: '1rem',
    Small: '0.75rem',
    ExtraSmall: '0.5rem'
  },
  Weight: {
    ExtraBold: 700,
    Bold: 500,
    Light: 300
  }
};

const MyAva = "https://s120-ava-talk.zadn.vn/f/5/6/d/5/120/96602a809eeeac6317c1f1a499aff48b.jpg";
const AvatarBaseUrl = "https://randomuser.me/api/portraits/";
const ImageBaseUrl = "https://picsum.photos/id/";

const SentStatus = Object.freeze({
  1: "Đã gửi",
  2: "Đã nhận",
  3: "Đã xem"
});

const GConst = Object.freeze({
  MessageTypes,
  Spacing,
  Margin,
  Padding,
  Border,
  BackgroundMessage,
  BackgroundChat,
  Font,
  Color,
  SentStatus,
  AvatarBaseUrl,
  ImageBaseUrl,
  MyAva,
});

export default GConst;