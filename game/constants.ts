
export const TILE_SIZE = 64;

// 1 = Wall, 0 = Path
export const MAZE_DATA = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export interface RoomConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  isCorrect: boolean;
  color: number;
}

// Room positions templates to keep it consistent
const POSITIONS = [
  { x: 2, y: 2, w: 3, h: 3 },
  { x: 10, y: 2, w: 4, h: 3 },
  { x: 14, y: 5, w: 4, h: 4 },
  { x: 16, y: 12, w: 4, h: 3 }
];

const COLORS = [0x4f46e5, 0xdb2777, 0x10b981, 0x06b6d4];

export const GAME_LEVELS = [
  {
    question: "متى بدأت المرحلة الأولى من الحرب العالمية الأولى؟",
    rooms: [
      { ...POSITIONS[0], label: '1914م', isCorrect: true, color: COLORS[0] },
      { ...POSITIONS[1], label: '1917م', isCorrect: false, color: COLORS[1] },
      { ...POSITIONS[2], label: '1918م', isCorrect: false, color: COLORS[2] },
      { ...POSITIONS[3], label: '1919م', isCorrect: false, color: COLORS[3] }
    ]
  },
  {
    question: "أي طرف حقق انتصارات كبيرة خلال المرحلة الأولى (1914-1917)؟",
    rooms: [
      { ...POSITIONS[0], label: 'دول الوفاق', isCorrect: false, color: COLORS[0] },
      { ...POSITIONS[1], label: 'التحالف الثلاثي', isCorrect: true, color: COLORS[1] },
      { ...POSITIONS[2], label: 'الولايات المتحدة', isCorrect: false, color: COLORS[2] },
      { ...POSITIONS[3], label: 'عصبة الأمم', isCorrect: false, color: COLORS[3] }
    ]
  },
  {
    question: "ما هي المعاهدة التي فرضت شروطاً قاسية على ألمانيا عام 1919م؟",
    rooms: [
      { ...POSITIONS[0], label: 'معاهدة سيفر', isCorrect: false, color: COLORS[0] },
      { ...POSITIONS[1], label: 'معاهدة تريانون', isCorrect: false, color: COLORS[1] },
      { ...POSITIONS[2], label: 'معاهدة فرساي', isCorrect: true, color: COLORS[2] },
      { ...POSITIONS[3], label: 'عصبة الأمم', isCorrect: false, color: COLORS[3] }
    ]
  },
  {
    question: "بسبب ماذا انسحبت روسيا من الحرب عام 1917م؟",
    rooms: [
      { ...POSITIONS[0], label: 'نقص السلاح', isCorrect: false, color: COLORS[0] },
      { ...POSITIONS[1], label: 'قيام الثورة', isCorrect: true, color: COLORS[1] },
      { ...POSITIONS[2], label: 'معاهدة فرساي', isCorrect: false, color: COLORS[2] },
      { ...POSITIONS[3], label: 'دخول أمريكا', isCorrect: false, color: COLORS[3] }
    ]
  },
  {
    question: "ما هو الحدث الذي حسم الحرب لصالح دول الوفاق في المرحلة الثانية؟",
    rooms: [
      { ...POSITIONS[0], label: 'دخول أمريكا', isCorrect: true, color: COLORS[0] },
      { ...POSITIONS[1], label: 'انسحاب روسيا', isCorrect: false, color: COLORS[1] },
      { ...POSITIONS[2], label: 'الثورة الصناعية', isCorrect: false, color: COLORS[2] },
      { ...POSITIONS[3], label: 'سقوط ألمانيا', isCorrect: false, color: COLORS[3] }
    ]
  },
  {
    question: "ما هي النتيجة البشرية الأكثر تأثيراً للحرب على سكان أوروبا؟",
    rooms: [
      { ...POSITIONS[0], label: 'زيادة المواليد', isCorrect: false, color: COLORS[0] },
      { ...POSITIONS[1], label: 'هجرة العلماء', isCorrect: false, color: COLORS[1] },
      { ...POSITIONS[2], label: 'فقدان الفئة النشيطة', isCorrect: true, color: COLORS[2] },
      { ...POSITIONS[3], label: 'انتشار الأوبئة', isCorrect: false, color: COLORS[3] }
    ]
  },
  {
    question: "من هما القوتان الاقتصاديتان اللتان برزتا بعد تراجع مكانة أوروبا؟",
    rooms: [
      { ...POSITIONS[0], label: 'روسيا والصين', isCorrect: false, color: COLORS[0] },
      { ...POSITIONS[1], label: 'الولايات المتحدة واليابان', isCorrect: true, color: COLORS[1] },
      { ...POSITIONS[2], label: 'ألمانيا وإيطاليا', isCorrect: false, color: COLORS[2] },
      { ...POSITIONS[3], label: 'فرنسا وبريطانيا', isCorrect: false, color: COLORS[3] }
    ]
  },
  {
    question: "ماذا حدث للخريطة السياسية لأوروبا بعد الحرب؟",
    rooms: [
      { ...POSITIONS[0], label: 'بقاء الحدود', isCorrect: false, color: COLORS[0] },
      { ...POSITIONS[1], label: 'اندماج الدول', isCorrect: false, color: COLORS[1] },
      { ...POSITIONS[2], label: 'توسع ألمانيا', isCorrect: false, color: COLORS[2] },
      { ...POSITIONS[3], label: 'اختفاء الإمبراطوريات', isCorrect: true, color: COLORS[3] }
    ]
  },
  {
    question: "ماذا تضمنت معاهدة فرساي بخصوص القوة العسكرية لألمانيا؟",
    rooms: [
      { ...POSITIONS[0], label: 'تجريد السلاح', isCorrect: true, color: COLORS[0] },
      { ...POSITIONS[1], label: 'زيادة الجيش', isCorrect: false, color: COLORS[1] },
      { ...POSITIONS[2], label: 'صناعة الدبابات', isCorrect: false, color: COLORS[2] },
      { ...POSITIONS[3], label: 'بناء الأسطول', isCorrect: false, color: COLORS[3] }
    ]
  },
  {
    question: "ما هي المنظمة التي تأسست بناءً على مبادئ ويلسون لتحقيق السلم؟",
    rooms: [
      { ...POSITIONS[0], label: 'الأمم المتحدة', isCorrect: false, color: COLORS[0] },
      { ...POSITIONS[1], label: 'حلف الناتو', isCorrect: false, color: COLORS[1] },
      { ...POSITIONS[2], label: 'عصبة الأمم', isCorrect: true, color: COLORS[2] },
      { ...POSITIONS[3], label: 'صندوق النقد', isCorrect: false, color: COLORS[3] }
    ]
  }
];

export const ROOMS = GAME_LEVELS[0].rooms;
