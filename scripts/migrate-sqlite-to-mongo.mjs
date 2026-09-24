// One-off: copy every real row out of data/metus-zalo.db into MongoDB
// (metus-zalo-be's database), then SQLite is no longer read from anywhere.
// Run once: node scripts/migrate-sqlite-to-mongo.mjs
import Database from "better-sqlite3";
import { MongoClient } from "mongodb";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dbFile = path.join(root, "data", "metus-zalo.db");
const MONGO_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/metus-zalo";

const sqlite = new Database(dbFile, { readonly: true });
const client = new MongoClient(MONGO_URI);
await client.connect();
const mongo = client.db();

async function nextSeq(name, n = 1) {
  const counters = mongo.collection("counters");
  const doc = await counters.findOneAndUpdate(
    { name },
    { $inc: { seq: n } },
    { upsert: true, returnDocument: "after" },
  );
  return doc.seq - n + 1; // first id in this batch
}

async function migrateCampaigns() {
  const rows = sqlite.prepare("SELECT * FROM campaigns ORDER BY id").all();
  if (rows.length === 0) return console.log("campaigns: nothing to migrate");
  const col = mongo.collection("campaigns");
  const docs = rows.map((r) => ({
    seq: r.id,
    name: r.name,
    kind: r.kind,
    status: r.status,
    config: r.config,
    accountIds: JSON.parse(r.account_ids),
    targets: JSON.parse(r.targets),
    sentOk: r.sent_ok,
    sentFail: r.sent_fail,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  for (const d of docs) {
    await col.updateOne({ seq: d.seq }, { $set: d }, { upsert: true });
  }
  await mongo
    .collection("counters")
    .updateOne(
      { name: "campaigns" },
      { $max: { seq: Math.max(...docs.map((d) => d.seq)) } },
      { upsert: true },
    );
  console.log(`campaigns: migrated ${docs.length}`);
}

async function migrateCampaignLogs() {
  const rows = sqlite.prepare("SELECT * FROM campaign_logs ORDER BY id").all();
  if (rows.length === 0) return console.log("campaign_logs: nothing to migrate");
  const col = mongo.collection("campaign_logs");
  const docs = rows.map((r) => ({
    seq: r.id,
    campaignId: r.campaign_id,
    target: r.target,
    accountId: r.account_id,
    ok: r.ok === 1,
    message: r.message,
    ts: r.ts,
  }));
  for (const d of docs) {
    await col.updateOne({ seq: d.seq }, { $set: d }, { upsert: true });
  }
  await mongo
    .collection("counters")
    .updateOne(
      { name: "campaign_logs" },
      { $max: { seq: Math.max(...docs.map((d) => d.seq)) } },
      { upsert: true },
    );
  console.log(`campaign_logs: migrated ${docs.length}`);
}

async function migrateSchedules() {
  const rows = sqlite.prepare("SELECT * FROM schedules ORDER BY id").all();
  if (rows.length === 0) return console.log("schedules: nothing to migrate");
  const col = mongo.collection("schedules");
  const docs = rows.map((r) => ({
    seq: r.id,
    name: r.name,
    campaignId: r.campaign_id,
    repeat: r.repeat,
    timeOfDay: r.time_of_day,
    intervalDays: r.interval_days,
    fromDate: r.from_date,
    toDate: r.to_date,
    enabled: r.enabled === 1,
    skipFailed: r.skip_failed === 1,
    skipSucceeded: r.skip_succeeded === 1,
    lastRun: r.last_run,
    nextRun: r.next_run,
    createdAt: r.created_at,
  }));
  for (const d of docs) {
    await col.updateOne({ seq: d.seq }, { $set: d }, { upsert: true });
  }
  await mongo
    .collection("counters")
    .updateOne(
      { name: "schedules" },
      { $max: { seq: Math.max(...docs.map((d) => d.seq)) } },
      { upsert: true },
    );
  console.log(`schedules: migrated ${docs.length}`);
}

async function migrateChatMessages() {
  const rows = sqlite.prepare("SELECT * FROM chat_messages").all();
  if (rows.length === 0) return console.log("chat_messages: nothing to migrate");
  const col = mongo.collection("chat_messages");
  let n = 0;
  for (const r of rows) {
    const m = JSON.parse(r.body);
    await col.updateOne(
      { zaloId: r.zalo_id, threadId: r.thread_id, msgId: r.msg_id },
      {
        $setOnInsert: {
          zaloId: r.zalo_id,
          threadId: r.thread_id,
          msgId: r.msg_id,
          threadType: m.threadType,
          isSelf: m.isSelf,
          fromId: m.fromId ?? "",
          fromName: m.fromName ?? "",
          content: m.content ?? "",
          ts: m.ts,
          attachment: m.attachment,
          stickerId: m.stickerId,
        },
      },
      { upsert: true },
    );
    n++;
  }
  console.log(`chat_messages: migrated ${n}`);
}

async function migrateThreadNames() {
  const rows = sqlite.prepare("SELECT * FROM thread_names").all();
  if (rows.length === 0) return console.log("thread_names: nothing to migrate");
  const col = mongo.collection("thread_names");
  for (const r of rows) {
    await col.updateOne(
      { zaloId: r.zalo_id, threadId: r.thread_id },
      { $set: { name: r.name, avatar: r.avatar, updatedAt: r.updated_at } },
      { upsert: true },
    );
  }
  console.log(`thread_names: migrated ${rows.length}`);
}

async function migrateNotificationState() {
  const row = sqlite.prepare("SELECT * FROM notification_state WHERE id = 1").get();
  if (!row) return console.log("notification_state: nothing to migrate");
  await mongo
    .collection("notification_state")
    .updateOne(
      { key: "global" },
      { $set: { lastReadAt: row.last_read_at } },
      { upsert: true },
    );
  console.log(`notification_state: migrated (lastReadAt=${row.last_read_at})`);
}

async function migrateLeads() {
  const rows = sqlite.prepare("SELECT * FROM leads ORDER BY id").all();
  if (rows.length === 0) return console.log("leads: nothing to migrate");
  const col = mongo.collection("leads");
  const docs = rows.map((r) => ({
    seq: r.id,
    fullName: r.full_name,
    phone: r.phone,
    scale: r.scale,
    createdAt: r.created_at,
  }));
  for (const d of docs) {
    await col.updateOne({ seq: d.seq }, { $set: d }, { upsert: true });
  }
  await mongo
    .collection("counters")
    .updateOne(
      { name: "leads" },
      { $max: { seq: Math.max(...docs.map((d) => d.seq)) } },
      { upsert: true },
    );
  console.log(`leads: migrated ${docs.length}`);
}

try {
  await migrateCampaigns();
  await migrateCampaignLogs();
  await migrateSchedules();
  await migrateChatMessages();
  await migrateThreadNames();
  await migrateNotificationState();
  await migrateLeads();
  console.log("Done.");
} finally {
  await client.close();
  sqlite.close();
}
