import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const API_URL = "https://api.x.com/2/tweets/search/recent";
const DEFAULT_QUEUE_PATH = "data/review-queue.json";
const DEFAULT_INTERVAL_SECONDS = 300;

function parseHandles(value) {
  const handles = value
    .split(",")
    .map((handle) => handle.trim().replace(/^@/, ""))
    .filter(Boolean);

  if (handles.length === 0 || handles.some((handle) => !/^[A-Za-z0-9_]{1,15}$/.test(handle))) {
    throw new Error("X_HANDLES must contain comma-separated X usernames (without URLs).");
  }

  return [...new Set(handles)];
}

async function readQueue(path) {
  try {
    const contents = await readFile(path, "utf8");
    const queue = JSON.parse(contents);
    if (!Array.isArray(queue)) {
      throw new Error("Review queue must contain a JSON array.");
    }
    return queue;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function saveQueue(path, queue) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
}

export async function fetchRecentPosts({ token, handles, fetchImpl = fetch }) {
  const query = handles.map((handle) => `from:${handle}`).join(" OR ");
  const url = new URL(API_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", "100");
  url.searchParams.set("tweet.fields", "author_id,created_at");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username,name");

  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`X API request failed (${response.status}): ${details}`);
  }

  const result = await response.json();
  const usernamesById = new Map(
    (result.includes?.users ?? []).map((user) => [user.id, user.username]),
  );
  return (result.data ?? []).map((post) => ({
    id: post.id,
    username: usernamesById.get(post.author_id) ?? "unknown",
    text: post.text,
    createdAt: post.created_at ?? null,
    url: `https://x.com/${usernamesById.get(post.author_id) ?? "i"}/status/${post.id}`,
  }));
}

export async function collectNewPosts({ token, handles, queuePath, fetchImpl = fetch }) {
  const posts = await fetchRecentPosts({ token, handles, fetchImpl });
  const queue = await readQueue(queuePath);
  const knownIds = new Set(queue.map((item) => item.postId));
  const newItems = posts
    .filter((post) => !knownIds.has(post.id))
    .map((post) => ({
      postId: post.id,
      username: post.username,
      postText: post.text,
      postUrl: post.url,
      createdAt: post.createdAt,
      status: "needs_review",
      commentDraft: "",
      foundAt: new Date().toISOString(),
    }));

  if (newItems.length > 0) {
    await saveQueue(queuePath, [...newItems, ...queue]);
  }
  return newItems;
}

async function main() {
  const token = process.env.X_BEARER_TOKEN;
  const handlesValue = process.env.X_HANDLES;
  if (!token || !handlesValue) {
    throw new Error("Set X_BEARER_TOKEN and X_HANDLES before starting the monitor.");
  }

  const handles = parseHandles(handlesValue);
  const intervalSeconds = Number(process.env.POLL_INTERVAL_SECONDS ?? DEFAULT_INTERVAL_SECONDS);
  if (!Number.isInteger(intervalSeconds) || intervalSeconds < 60) {
    throw new Error("POLL_INTERVAL_SECONDS must be an integer of at least 60.");
  }
  const queuePath = resolve(process.env.REVIEW_QUEUE_PATH ?? DEFAULT_QUEUE_PATH);

  console.log(`Monitoring ${handles.length} X account(s); review queue: ${queuePath}`);
  while (true) {
    const newPosts = await collectNewPosts({ token, handles, queuePath });
    console.log(`Found ${newPosts.length} new post(s) for review.`);
    await sleep(intervalSeconds * 1000);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
