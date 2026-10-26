// ログイン状態の管理。ログアウトしない限り、ログインしたままにする。
//
// - ログインすると「リフレッシュトークン」（有効期限 10 年）を端末に保存する。
// - サーバーに送る「アクセストークン」は 1 時間で切れるので、切れる前にリフレッシュトークンで取り直す。
// - リフレッシュトークンが無効になった（管理者がパスワードをリセットした等）ときは「再ログインが必要」にする。

import { AuthError } from "./cognito.js";

export const AUTH_STORAGE_KEY = "studyReminderAuth";
const REFRESH_MARGIN_MS = 60 * 1000; // 期限の 1 分前には取り直す
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 8;

/** ユーザー名とパスワードの形を確かめる。問題があれば AuthError を投げる */
export function validateCredentials(username, password) {
  if (!USERNAME_PATTERN.test(username)) throw new AuthError("invalidUsername");
  if (password.length < MIN_PASSWORD_LENGTH) throw new AuthError("invalidPassword");
}

/** アクセストークン（JWT）の中身からユーザー名を取り出す（署名の確認はサーバー側で行う） */
function usernameFromToken(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).username ?? null;
  } catch {
    return null;
  }
}

export function createAuthSession({ cognito, storage = globalThis.localStorage, now = Date.now }) {
  let state = load(); // { username, refreshToken, accessToken, accessTokenExpiresAt, expired }
  let refreshing = null;
  let snapshot = makeSnapshot();
  const listeners = new Set();

  function load() {
    try {
      return JSON.parse(storage.getItem(AUTH_STORAGE_KEY) ?? "null");
    } catch {
      return null;
    }
  }

  function save(next) {
    state = next;
    if (state) storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    else storage.removeItem(AUTH_STORAGE_KEY);
    snapshot = makeSnapshot();
    listeners.forEach((listener) => listener());
  }

  function makeSnapshot() {
    return {
      loggedIn: Boolean(state?.refreshToken),
      username: state?.username ?? null,
      expired: Boolean(state?.expired),
    };
  }

  /** ログインし直しが必要な状態にする（ユーザー名は残す） */
  function markExpired() {
    if (state) save({ username: state.username, expired: true });
  }

  async function signIn(username, password) {
    const tokens = await cognito.signIn(username, password, now());
    // 表示には、入力した文字ではなくアカウントに登録されているユーザー名を使う
    save({ username: usernameFromToken(tokens.accessToken) ?? username, ...tokens, expired: false });
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,

    signIn(username, password) {
      validateCredentials(username, password);
      return signIn(username, password);
    },

    async signUp(username, password) {
      validateCredentials(username, password);
      await cognito.signUp(username, password);
      await signIn(username, password);
    },

    /** ログアウト。サーバー側でもリフレッシュトークンを無効にする（失敗しても端末からは消す） */
    async signOut() {
      const token = state?.refreshToken;
      save(null);
      if (token) await cognito.revoke(token).catch(() => {});
    },

    /**
     * サーバーに送るアクセストークン。必要なら取り直す。
     * ログインしていない・再ログインが必要なら null。通信できなければ AuthError("network")。
     */
    async getAccessToken() {
      if (!state?.refreshToken) return null;
      if (state.accessToken && state.accessTokenExpiresAt - REFRESH_MARGIN_MS > now()) return state.accessToken;

      refreshing ??= cognito
        .refresh(state.refreshToken, now())
        .then(({ accessToken, accessTokenExpiresAt }) => {
          save({ ...state, accessToken, accessTokenExpiresAt });
          return accessToken;
        })
        .catch((err) => {
          if (err.code === "network" || err.code === "tooManyRequests") throw err;
          markExpired();
          return null;
        })
        .finally(() => {
          refreshing = null;
        });
      return refreshing;
    },

    markExpired,
  };
}
