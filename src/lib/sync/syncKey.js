// 同期キー（各ユーザーの合言葉）と暗号化。
//
// 同期キーは 120 ビットのランダムな値（24 文字）。ここから 2 つの鍵を作る：
//   - 認証トークン：サーバーに送り、「どのユーザーのデータか」を見分けるのに使う
//   - 暗号鍵：記録を端末側で暗号化する。サーバーには暗号文しか送らないので、
//             同期キーを知らない人（サーバーの管理者を含む）は記録を読めない

// 読み間違えやすい文字（I, L, O, U）を除いた 32 文字
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const KEY_LENGTH = 24;
const KEY_PATTERN = new RegExp(`^[${ALPHABET}]{${KEY_LENGTH}}$`);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** 新しい同期キーを作る（区切りなしの 24 文字） */
export function generateSyncKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
  return Array.from(bytes, (b) => ALPHABET[b % 32]).join("");
}

/** 表示用に 4 文字ずつハイフンで区切る。例：7KQ2-M9XD-... */
export function formatSyncKey(key) {
  return key.match(/.{1,4}/g).join("-");
}

/** 入力された同期キーを正規化する。形式が正しくなければ null */
export function normalizeSyncKey(input) {
  const key = input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  return KEY_PATTERN.test(key) ? key : null;
}

/** 同期キーから認証トークン（16 進文字列）と暗号鍵を作る */
export async function deriveSyncSecrets(syncKey) {
  const base = await crypto.subtle.importKey("raw", encoder.encode(syncKey), "HKDF", false, [
    "deriveBits",
    "deriveKey",
  ]);
  const params = (info) => ({
    name: "HKDF",
    hash: "SHA-256",
    salt: encoder.encode("study-reminder-sync"),
    info: encoder.encode(info),
  });

  const authBits = await crypto.subtle.deriveBits(params("auth"), base, 256);
  const cryptoKey = await crypto.subtle.deriveKey(params("encrypt"), base, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  return { authToken: toHex(new Uint8Array(authBits)), cryptoKey };
}

/** 値を JSON にして暗号化し、base64 文字列にする */
export async function encryptJson(cryptoKey, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, encoder.encode(JSON.stringify(value)));
  const out = new Uint8Array(iv.length + cipher.byteLength);
  out.set(iv);
  out.set(new Uint8Array(cipher), iv.length);
  return toBase64(out);
}

/** encryptJson の逆。改ざんされていたり鍵が違ったりするとエラーになる */
export async function decryptJson(cryptoKey, payload) {
  const bytes = fromBase64(payload);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, cryptoKey, bytes.slice(12));
  return JSON.parse(decoder.decode(plain));
}

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function toBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
