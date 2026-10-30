# Digital Bot

Digital Bot monitors configured X accounts and adds new posts to a local review queue. It does not publish comments or request write access. Review each post and write an appropriate, relevant reply yourself.

## Requirements

- Node.js 18 or newer
- An X API bearer token with access to recent search

## Configure

Set these environment variables in your terminal:

- `X_BEARER_TOKEN`: your X API bearer token. Keep it private; do not commit it.
- `X_HANDLES`: comma-separated usernames to monitor, such as `account_one,account_two`.
- `POLL_INTERVAL_SECONDS`: optional polling interval; defaults to 300 and must be at least 60.
- `REVIEW_QUEUE_PATH`: optional queue file path; defaults to `data/review-queue.json`.

On Windows PowerShell:

```powershell
$env:X_BEARER_TOKEN = "your-token"
$env:X_HANDLES = "account_one,account_two"
npm start
```

The X API plan and permissions determine whether recent search is available and any applicable rate limits. The monitor reports API errors rather than silently skipping them.

## Review posts

New posts are added to the JSON queue with `status: "needs_review"`, post context, a direct link, and an empty `commentDraft` field. The queue is local and is not posted anywhere. You can edit `commentDraft` as a reminder of what you may want to say, then manually review and post it through X if appropriate.

## Tests

```powershell
npm test
```
