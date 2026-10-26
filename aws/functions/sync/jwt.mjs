// Cognito が発行したアクセストークン（JWT）を確かめる。外部ライブラリを使わず Web Crypto で検証する。

const encoder = new TextEncoder();
let jwksCache = null; // { url, keys: Map<kid, CryptoKey> }

const base64UrlDecode = (text) => Buffer.from(text, "base64url");

async function getKey(issuer, kid, fetchImpl) {
  const url = `${issuer}/.well-known/jwks.json`;
  if (!jwksCache || jwksCache.url !== url || !jwksCache.keys.has(kid)) {
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error("jwks");
    const { keys } = await response.json();
    const imported = new Map();
    for (const jwk of keys) {
      const key = await crypto.subtle.importKey(
        "jwk",
        { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );
      imported.set(jwk.kid, key);
    }
    jwksCache = { url, keys: imported };
  }
  return jwksCache.keys.get(kid);
}

/**
 * トークンが正しければ中身（claims）を返し、だめなら null を返す。
 * 確かめること：署名・発行元（自分のユーザープール）・種類（アクセストークン）・アプリ・有効期限
 */
export async function verifyAccessToken(token, { issuer, clientId, now = Date.now(), fetchImpl = fetch }) {
  try {
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    const header = JSON.parse(base64UrlDecode(headerPart));
    const claims = JSON.parse(base64UrlDecode(payloadPart));
    if (header.alg !== "RS256") return null;

    const key = await getKey(issuer, header.kid, fetchImpl);
    if (!key) return null;
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlDecode(signaturePart),
      encoder.encode(`${headerPart}.${payloadPart}`),
    );
    if (!valid) return null;

    if (claims.iss !== issuer) return null;
    if (claims.token_use !== "access") return null;
    if (claims.client_id !== clientId) return null;
    if (typeof claims.exp !== "number" || claims.exp * 1000 < now) return null;
    if (typeof claims.sub !== "string" || !claims.sub) return null;
    return claims;
  } catch {
    return null;
  }
}
