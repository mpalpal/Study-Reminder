import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadLogs, saveLogs } from "../lib/storage.js";
import { removeEntry, setReviewed, upsertEntry } from "../lib/logs.js";
import { createCognitoClient } from "../lib/auth/cognito.js";
import { createAuthSession } from "../lib/auth/session.js";
import { createSyncEngine } from "../lib/sync/engine.js";
import { CLOUD, CLOUD_ENABLED } from "../config.js";

const SYNC_DELAY_MS = 800; // 連続した操作（チェックを続けて付けるなど）をまとめて送るための待ち時間
const noopSubscribe = () => () => {};
const OFFLINE_ONLY = { auth: { loggedIn: false, username: null, expired: false }, sync: { active: false } };

/**
 * 学習記録データと、その変更操作をまとめたもの。
 * 変更するたびに localStorage へ保存し、画面も自動で更新される。
 * ログインしていれば、アプリを開いたとき・画面に戻ったとき・保存したときに自動で同期する。
 */
export function useStudyLogs() {
  const [logs, setLogs] = useState(loadLogs);
  const latest = useRef(logs); // 非同期の同期処理からも最新の記録を読めるように
  const syncTimer = useRef();

  const show = (next) => {
    latest.current = next;
    saveLogs(next);
    setLogs(next);
  };

  // ログインと同期（AWS の設定がなければ作らない）
  const [cloud] = useState(() => {
    if (!CLOUD_ENABLED) return null;
    const cognito = createCognitoClient({
      region: CLOUD.region,
      clientId: CLOUD.userPoolClientId,
      endpoint: CLOUD.cognitoEndpoint,
    });
    const auth = createAuthSession({ cognito });
    const engine = createSyncEngine({
      getLogs: () => latest.current,
      applyLogs: (next) => show(next),
      getAccessToken: () => auth.getAccessToken(),
      onUnauthorized: () => auth.markExpired(),
      endpoint: CLOUD.syncUrl,
    });
    return { auth, engine };
  });
  const authStatus = useSyncExternalStore(cloud?.auth.subscribe ?? noopSubscribe, () =>
    cloud ? cloud.auth.getSnapshot() : OFFLINE_ONLY.auth,
  );
  const syncStatus = useSyncExternalStore(cloud?.engine.subscribe ?? noopSubscribe, () =>
    cloud ? cloud.engine.getSnapshot() : OFFLINE_ONLY.sync,
  );

  const commit = (update) => {
    const next = update(latest.current);
    cloud?.engine.recordChanges(latest.current, next);
    show(next);
    if (cloud) {
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => cloud.engine.sync(), SYNC_DELAY_MS);
    }
  };

  useEffect(() => {
    if (!cloud) return;
    const syncIfVisible = () => document.visibilityState === "visible" && cloud.engine.sync();
    cloud.engine.sync(); // アプリを開いたとき
    document.addEventListener("visibilitychange", syncIfVisible); // ホーム画面から戻ったとき
    window.addEventListener("online", syncIfVisible); // 電波が戻ったとき
    return () => {
      document.removeEventListener("visibilitychange", syncIfVisible);
      window.removeEventListener("online", syncIfVisible);
      clearTimeout(syncTimer.current);
    };
  }, [cloud]);

  /** ログイン（新規登録）したあと、この端末の記録を送り、アカウントの記録を受け取る */
  const afterSignIn = async (username) => {
    // 前に別のユーザーでログインしていた端末なら、その人の記録を持ち込まない
    const previous = authStatus.username;
    if (previous && previous.toLowerCase() !== username.toLowerCase()) show({});
    await cloud.engine.start();
  };

  return {
    logs,
    saveEntry: (dateKey, entry) => commit((cur) => upsertEntry(cur, dateKey, entry)),
    deleteEntry: (dateKey, id) => commit((cur) => removeEntry(cur, dateKey, id)),
    setReviewed: (dateKey, id, stage, checked) => commit((cur) => setReviewed(cur, dateKey, id, stage, checked)),
    replaceAll: (data) => commit(() => data),
    clearAll: () => commit(() => ({})),

    account: cloud && {
      auth: authStatus,
      sync: syncStatus,
      async signIn(username, password) {
        await cloud.auth.signIn(username, password);
        await afterSignIn(username);
      },
      async signUp(username, password) {
        await cloud.auth.signUp(username, password);
        await afterSignIn(username);
      },
      /** 送り残しがないか確かめるため、ログアウトの前に一度同期する。未送信の件数を返す */
      async flush() {
        await cloud.engine.sync();
        return cloud.engine.getSnapshot().pendingCount;
      },
      /** ログアウト。この端末の記録は消す（アカウントには残っている） */
      async signOut() {
        cloud.engine.stop();
        show({});
        await cloud.auth.signOut();
      },
      syncNow: () => cloud.engine.sync(),
    },
  };
}
