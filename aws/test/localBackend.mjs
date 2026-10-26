// テスト・ローカル開発用に、AWS 側（Cognito・DynamoDB・同期 Lambda）を手元で動かす。
//   Cognito  → fakeCognito.mjs
//   DynamoDB → dynalite（DynamoDB 互換のメモリ上のデータベース）
//   Lambda   → 関数 URL と同じ形のイベントで handler を呼ぶ HTTP サーバー

import { createServer } from "node:http";
import dynalite from "dynalite";
import { CreateTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { startFakeCognito } from "./fakeCognito.mjs";

const TABLE_NAME = "study-reminder-items";

export async function startLocalBackend({ lambdaPort = 0, cognitoPort = 0 } = {}) {
  const cognito = await startFakeCognito({ port: cognitoPort });

  const dynamo = dynalite({ createTableMs: 0 });
  await new Promise((resolve) => dynamo.listen(0, "127.0.0.1", resolve));
  const dynamoUrl = `http://127.0.0.1:${dynamo.address().port}`;

  Object.assign(process.env, {
    AWS_REGION: "ap-northeast-1",
    AWS_ACCESS_KEY_ID: "local",
    AWS_SECRET_ACCESS_KEY: "local",
    TABLE_NAME,
    USER_POOL_CLIENT_ID: cognito.clientId,
    COGNITO_ISSUER: cognito.issuer,
    DYNAMODB_ENDPOINT: dynamoUrl,
  });

  // テンプレート（template.yaml）と同じキー構成のテーブルを作る
  const client = new DynamoDBClient({ endpoint: dynamoUrl });
  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [
        { AttributeName: "userId", AttributeType: "S" },
        { AttributeName: "itemId", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "userId", KeyType: "HASH" },
        { AttributeName: "itemId", KeyType: "RANGE" },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 25, WriteCapacityUnits: 25 },
    }),
  );

  const { handler } = await import("../functions/sync/index.mjs");

  // Lambda 関数 URL の代わり（CORS もテンプレートの設定と同じにする）
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "POST",
  };
  const lambda = createServer(async (req, res) => {
    if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
    let body = "";
    for await (const chunk of req) body += chunk;
    const result = await handler({
      requestContext: { http: { method: req.method } },
      headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), v])),
      body,
      isBase64Encoded: false,
    });
    res.writeHead(result.statusCode, { ...cors, ...result.headers });
    res.end(result.body);
  });
  await new Promise((resolve) => lambda.listen(lambdaPort, "127.0.0.1", resolve));

  return {
    cognito,
    handler,
    syncUrl: `http://127.0.0.1:${lambda.address().port}/`,
    async close() {
      client.destroy();
      await Promise.all([
        cognito.close(),
        new Promise((resolve) => dynamo.close(resolve)),
        new Promise((resolve) => lambda.close(resolve)),
      ]);
    },
  };
}
