// テスト用の Cognito の代わり。ユーザー名とパスワードの登録・ログイン・トークンの更新と無効化だけを再現する。
// 本物と同じ形の JWT（RS256）を発行し、/.well-known/jwks.json で公開鍵を配る。

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

export async function startFakeCognito({ port = 0, clientId = "test-client", accessTokenSeconds = 3600 } = {}) {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const jwk = { ...(await crypto.subtle.exportKey("jwk", publicKey)), kid: "test-key", alg: "RS256", use: "sig" };
  const users = new Map(); // username(小文字) → { sub, username, password }
  const refreshTokens = new Map(); // token → username
  const state = { accessTokenSeconds, issued: 0 };

  const b64 = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
  let issuer;

  async function issueAccessToken(user) {
    state.issued += 1;
    const now = Math.floor(Date.now() / 1000);
    const header = b64({ alg: "RS256", kid: "test-key" });
    const payload = b64({
      sub: user.sub,
      iss: issuer,
      client_id: clientId,
      token_use: "access",
      username: user.username,
      exp: now + state.accessTokenSeconds,
      iat: now,
    });
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(`${header}.${payload}`));
    return `${header}.${payload}.${Buffer.from(signature).toString("base64url")}`;
  }

  const fail = (type, message) => ({ status: 400, body: { __type: type, message } });

  const actions = {
    SignUp({ Username, Password, ClientId }) {
      if (ClientId !== clientId) return fail("ResourceNotFoundException", "client");
      if (users.has(Username.toLowerCase())) return fail("UsernameExistsException", "User already exists");
      if (Password.length < 8) return fail("InvalidPasswordException", "Password did not conform with policy");
      const user = { sub: randomUUID(), username: Username, password: Password };
      users.set(Username.toLowerCase(), user);
      return { status: 200, body: { UserConfirmed: true, UserSub: user.sub } };
    },
    async InitiateAuth({ AuthFlow, AuthParameters }) {
      if (AuthFlow === "USER_PASSWORD_AUTH") {
        const user = users.get(AuthParameters.USERNAME.toLowerCase());
        if (!user || user.password !== AuthParameters.PASSWORD)
          return fail("NotAuthorizedException", "Incorrect username or password.");
        const refreshToken = randomUUID();
        refreshTokens.set(refreshToken, user.username.toLowerCase());
        return {
          status: 200,
          body: {
            AuthenticationResult: {
              AccessToken: await issueAccessToken(user),
              ExpiresIn: state.accessTokenSeconds,
              RefreshToken: refreshToken,
              TokenType: "Bearer",
            },
          },
        };
      }
      if (AuthFlow === "REFRESH_TOKEN_AUTH") {
        const name = refreshTokens.get(AuthParameters.REFRESH_TOKEN);
        if (!name) return fail("NotAuthorizedException", "Refresh Token has been revoked");
        const user = users.get(name);
        return {
          status: 200,
          body: { AuthenticationResult: { AccessToken: await issueAccessToken(user), ExpiresIn: state.accessTokenSeconds } },
        };
      }
      return fail("InvalidParameterException", "flow");
    },
    RevokeToken({ Token }) {
      refreshTokens.delete(Token);
      return { status: 200, body: {} };
    },
  };

  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type,x-amz-target,x-amz-user-agent",
    "access-control-allow-methods": "POST,GET,OPTIONS",
  };

  const server = createServer(async (req, res) => {
    if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
    if (req.method === "GET" && req.url === "/pool/.well-known/jwks.json") {
      res.writeHead(200, { ...cors, "content-type": "application/json" });
      return res.end(JSON.stringify({ keys: [jwk] }));
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const target = req.headers["x-amz-target"]?.split(".")[1];
    const action = actions[target];
    const result = action ? await action(JSON.parse(raw)) : fail("UnknownOperationException", target);
    res.writeHead(result.status, { ...cors, "content-type": "application/x-amz-json-1.1" });
    res.end(JSON.stringify(result.body));
  });

  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  issuer = `${url}/pool`;
  return {
    url,
    issuer,
    clientId,
    users,
    state,
    issueAccessToken: (username) => issueAccessToken(users.get(username.toLowerCase())),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
