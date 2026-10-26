// Amazon Cognito（ログイン）の API を直接呼ぶ。SDK を使わず fetch だけで済ませている。
// 使う API：SignUp（新規登録）・InitiateAuth（ログイン、ログイン状態の更新）・RevokeToken（ログアウト）

/** ログインまわりの失敗。code は文言辞書の "account.error.〇〇" に対応 */
export class AuthError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const ERROR_CODES = {
  UsernameExistsException: "usernameExists",
  InvalidPasswordException: "invalidPassword",
  NotAuthorizedException: "wrongCredentials",
  UserNotFoundException: "wrongCredentials",
  TooManyRequestsException: "tooManyRequests",
  LimitExceededException: "tooManyRequests",
  TooManyFailedAttemptsException: "tooManyRequests",
  InvalidParameterException: "invalidInput",
};

export function createCognitoClient({ region, clientId, endpoint, fetch = (...args) => globalThis.fetch(...args) }) {
  const url = endpoint || `https://cognito-idp.${region}.amazonaws.com/`;

  async function call(action, body) {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": `AWSCognitoIdentityProviderService.${action}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AuthError("network");
    }
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const type = (json.__type ?? "").split("#").pop();
      throw new AuthError(ERROR_CODES[type] ?? "unknown");
    }
    return json;
  }

  const tokensFrom = ({ AuthenticationResult: r }, now) => ({
    accessToken: r.AccessToken,
    accessTokenExpiresAt: now + r.ExpiresIn * 1000,
    refreshToken: r.RefreshToken,
  });

  return {
    signUp: (username, password) => call("SignUp", { ClientId: clientId, Username: username, Password: password }),

    async signIn(username, password, now = Date.now()) {
      const result = await call("InitiateAuth", {
        ClientId: clientId,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: { USERNAME: username, PASSWORD: password },
      });
      return tokensFrom(result, now);
    },

    async refresh(refreshToken, now = Date.now()) {
      const result = await call("InitiateAuth", {
        ClientId: clientId,
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      });
      return tokensFrom(result, now); // refreshToken は返ってこない（今のものを使い続ける）
    },

    revoke: (refreshToken) => call("RevokeToken", { ClientId: clientId, Token: refreshToken }),
  };
}
