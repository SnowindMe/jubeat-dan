export const MODES = { easy: "EASY", normal: "NORMAL", hard: "HARD" };

export const DIFF_LABEL = { bsc: "BSC", adv: "ADV", ext: "EXT" };

export const DAN_PALETTE = [
  "#4FC3F7", "#38B6F2", "#2FA8F0", "#2E8BF0", "#3B72F5", "#5B62F4",
  "#7C58F0", "#9A56EC", "#B45AEA", "#CF5CE8", "#E056D4", "#F04A9E"
];

export const CANDY_COLORS = ["#FF7EB6", "#35E0FF", "#FFD166", "#7BE0A0", "#A46BFF", "#FF9F5C"];

export const DECOR_COLORS = ["#FF7EB6", "#35E0FF", "#FFD166", "#7BE0A0", "#A46BFF", "#FF9F5C"];

/* 玩家头像（emoji 预设） */
export const AVATARS = [
  "🐱", "🐶", "🐰", "🐻", "🦊", "🐼", "🐨", "🦁",
  "🐯", "🐸", "🐵", "🐷", "🦄", "🐙", "🦋", "🐢",
  "🐳", "🦉", "⭐", "🔥", "🌙", "🎧", "🎮", "🎵",
  "⚡", "🌸", "🍀", "💎"
];

/* 姓名框预设（边框颜色） */
export const FRAMES = [
  { id: "none", label: "无框", color: "transparent" },
  { id: "cyan", label: "冰蓝", color: "#38B6F2" },
  { id: "gold", label: "鎏金", color: "#E8A33D" },
  { id: "pink", label: "樱粉", color: "#F06292" },
  { id: "green", label: "翠绿", color: "#43B581" },
  { id: "purple", label: "星紫", color: "#9A56EC" }
];

/* 段位姓名框（主页 ME 横幅，按 860×220 的 SVG 设计稿展示） */
export const NAME_PLATES = [
  { id: "base", label: "jubeat 音乐魔方", src: "assets/nameplate/nameplate-base.svg" },
  { id: "prop", label: "jubeat prop", src: "assets/nameplate/nameplate-prop.svg" },
  { id: "clan", label: "jubeat clan", src: "assets/nameplate/nameplate-clan.svg" },
  { id: "festo", label: "jubeat festo", src: "assets/nameplate/nameplate-festo.svg" },
  { id: "none", label: "无", src: "" }
];

export const POOLS = {
  all:  { label: "全曲池",    match: (s) => true },
  low:  { label: "入門 Lv≤7",  match: (s) => s.level <= 7 },
  mid:  { label: "上級 Lv8-9", match: (s) => s.level >= 8 && s.level < 10 },
  high: { label: "超上級 Lv10", match: (s) => s.level >= 10 }
};

export const VERSION_LOGOS = {
  "festo": "assets/version-festo.svg",
  "jubeat prop": "assets/version-prop.svg",
  "clan": "assets/version-clan.svg"
};

export const CUSTOM_KEY = "jubeat-dan-custom-v1";
export const PLAYER_KEY = "jubeat-dan-player-v1";
export const RANDOM_KEY = "jubeat-dan-random-v1";
export const ADMIN_KEY = "jubeat-dan-admin-session";
export const ADMIN_PASS_KEY = "jubeat-dan-admin-pass";
