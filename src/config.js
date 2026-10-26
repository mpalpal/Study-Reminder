// AWS（ログインと同期）の接続先。aws/ を構築したときの出力（Outputs）の値を書く。
// どれも公開されて問題ない値（パスワードや秘密鍵ではない）。
// 空のままなら、ログインと同期の機能は表示されず、これまでどおり端末の中だけで動く。
// テストやローカル開発では VITE_ で始まる環境変数で上書きできる。

const env = import.meta.env;

export const CLOUD = {
  region: env.VITE_AWS_REGION || "",
  userPoolClientId: env.VITE_COGNITO_CLIENT_ID || "",
  syncUrl: env.VITE_SYNC_URL || "",
  cognitoEndpoint: env.VITE_COGNITO_ENDPOINT || "", // 空なら region から作る
};

export const CLOUD_ENABLED = Boolean(CLOUD.region && CLOUD.userPoolClientId && CLOUD.syncUrl);
