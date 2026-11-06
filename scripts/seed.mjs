// Seed 50,000 rows into 90plus3-rows + the cached aggregate.
// Usage: cd scripts && npm install && node seed.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const TABLE = process.env.ROWS_TABLE || '90plus3-rows';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }), {
  marshallOptions: { removeUndefinedValues: true }
});

const N = 50000;
const TARGET_I = N - 1;

function row(i) {
  const isTarget = i === TARGET_I;
  const item = {
    pk: 'match#' + (i % 256),
    sk: 'row#' + i,
    player: isTarget ? 'p-target' : 'p' + (i % 997),
    value: (i * 2654435761) % 100000,
    score: (i * 7919) % 100000
  };
  if (isTarget) {
    item.gsi1pk = 'player#p-target';
    item.gsi1sk = 'row#' + i;
  }
  return item;
}

const items = Array.from({ length: N }, (_, i) => row(i));
let sum = 0;
for (const it of items) sum += it.score;

const batches = [];
for (let i = 0; i < items.length; i += 25) {
  batches.push(items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })));
}

console.log(`rows=${items.length} batches=${batches.length} sum=${sum}`);

let done = 0;
let cursor = 0;
async function worker() {
  while (cursor < batches.length) {
    const idx = cursor++;
    let pending = batches[idx];
    while (pending.length) {
      const res = await ddb.send(new BatchWriteCommand({
        RequestItems: { [TABLE]: pending }
      }));
      pending = (res.UnprocessedItems && res.UnprocessedItems[TABLE]) || [];
      if (pending.length) await new Promise((r) => setTimeout(r, 120));
    }
    done++;
    if (done % 40 === 0) console.log(`  ${done}/${batches.length}`);
  }
}

await Promise.all(Array.from({ length: 10 }, worker));

await ddb.send(new PutCommand({
  TableName: TABLE,
  Item: { pk: 'meta', sk: 'aggregate', sum, count: items.length, computedAt: Date.now() }
}));

console.log('seed complete');
