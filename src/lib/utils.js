import { CANDY_COLORS } from "./constants.js";

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function decorRand(min, max) {
  return min + Math.random() * (max - min);
}

export function shade(hex, amt) {
  var n = parseInt(hex.slice(1), 16);
  var r = Math.min(255, Math.max(0, (n >> 16) + amt));
  var g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
  var b = Math.min(255, Math.max(0, (n & 0xff) + amt));
  return "rgb(" + r + "," + g + "," + b + ")";
}

/* 蝴蝶状糖果：中间椭圆糖体 + 两端锯齿扭结包装纸 */
export function candySvg(c) {
  var dark = shade(c, -45);
  var light = shade(c, 55);
  return '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M16 18 L4 14 L2 19 L7 23 L2 27 L7 31 L2 35 L7 39 L4 44 L16 42 Z" fill="' + dark + '"/>' +
    '<rect x="16" y="18" width="68" height="24" rx="12" fill="' + c + '" stroke="' + dark + '" stroke-width="1"/>' +
    '<rect x="32" y="18" width="5" height="24" fill="rgba(255,255,255,0.40)"/>' +
    '<rect x="63" y="18" width="5" height="24" fill="rgba(255,255,255,0.40)"/>' +
    '<rect x="46" y="18" width="8" height="24" fill="' + light + '" opacity="0.45"/>' +
    '<ellipse cx="50" cy="21" rx="25" ry="5" fill="rgba(255,255,255,0.55)"/>' +
    '<path d="M84 18 L96 14 L98 19 L93 23 L98 27 L93 31 L98 35 L93 39 L96 44 L84 42 Z" fill="' + dark + '"/>' +
    "</svg>";
}

export function candyBurst(scale) {
  if (typeof confetti === "undefined") return;
  confetti({
    particleCount: Math.round(70 * (scale || 1)),
    spread: 80,
    startVelocity: 40,
    origin: { y: 0.6 },
    colors: CANDY_COLORS,
    disableForReducedMotion: true
  });
}

/* 姓名框 SVG 的头像槽是 <image>，需要把 emoji 头像画成图片数据 */
export function emojiToDataUrl(emoji) {
  try {
    var size = 120;
    var c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    var ctx = c.getContext("2d");
    ctx.font = size * 0.75 + "px system-ui, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(emoji || "🐱"), size / 2, size / 2 + size * 0.04);
    return c.toDataURL("image/png");
  } catch (e) {
    return "";
  }
}

export function fileToDataThumb(file, cb) {
  function compress(img) {
    try {
      var MAX = 240;
      var scale = Math.min(1, MAX / Math.max(img.width, img.height));
      var w = Math.max(1, Math.round(img.width * scale));
      var h = Math.max(1, Math.round(img.height * scale));
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL("image/jpeg", 0.82));
    } catch (e) {
      alert("图片处理失败：" + e.message);
    }
  }
  function fallbackRead() {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () { compress(img); };
      img.onerror = function () { alert("图片读取失败，请换一张图片。"); };
      img.src = reader.result;
    };
    reader.onerror = function () { alert("图片读取失败，请换一张图片。"); };
    reader.readAsDataURL(file);
  }
  if (window.createImageBitmap) {
    /* createImageBitmap 会自动应用 EXIF 方向，避免手机竖拍图被旋转 */
    createImageBitmap(file, { imageOrientation: "from-image" })
      .then(compress)
      .catch(fallbackRead);
  } else {
    fallbackRead();
  }
}

export function sha256Hex(str) {
  if (!window.crypto || !crypto.subtle) {
    return Promise.resolve(null);
  }
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
    var bytes = new Uint8Array(buf);
    var hex = "";
    for (var i = 0; i < bytes.length; i++) {
      hex += ("0" + bytes[i].toString(16)).slice(-2);
    }
    return hex;
  });
}
