import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectNewPosts, fetchRecentPosts } from "../src/index.js";

test("fetchRecentPosts uses the read-only recent search API and maps usernames", async () => {
  let requestUrl;
  let authorization;
  const posts = await fetchRecentPosts({
    token: "read-token",
    handles: ["example"],
    fetchImpl: async (url, options) => {
      requestUrl = url;
      authorization = options.headers.Authorization;
      return {
        ok: true,
        json: async () => ({
          data: [{ id: "123", author_id: "user-1", text: "A new post", created_at: "2026-10-30T12:00:00Z" }],
          includes: { users: [{ id: "user-1", username: "example" }] },
        }),
      };
    },
  });

  assert.equal(requestUrl.pathname, "/2/tweets/search/recent");
  assert.equal(requestUrl.searchParams.get("query"), "from:example");
  assert.equal(authorization, "Bearer read-token");
  assert.deepEqual(posts, [{
    id: "123",
    username: "example",
    text: "A new post",
    createdAt: "2026-10-30T12:00:00Z",
    url: "https://x.com/example/status/123",
  }]);
});

test("collectNewPosts adds unseen posts to the manual review queue only once", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "digital-bot-"));
  const queuePath = path.join(directory, "queue.json");
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      data: [{ id: "123", author_id: "user-1", text: "A new post" }],
      includes: { users: [{ id: "user-1", username: "example" }] },
    }),
  });

  try {
    const first = await collectNewPosts({
      token: "read-token",
      handles: ["example"],
      queuePath,
      fetchImpl,
    });
    const second = await collectNewPosts({
      token: "read-token",
      handles: ["example"],
      queuePath,
      fetchImpl,
    });
    const queue = JSON.parse(await readFile(queuePath, "utf8"));

    assert.equal(first.length, 1);
    assert.equal(first[0].status, "needs_review");
    assert.equal(first[0].commentDraft, "");
    assert.equal(second.length, 0);
    assert.equal(queue.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("fetchRecentPosts reports API errors", async () => {
  await assert.rejects(
    fetchRecentPosts({
      token: "read-token",
      handles: ["example"],
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      }),
    }),
    /X API request failed \(401\): Unauthorized/,
  );
});
