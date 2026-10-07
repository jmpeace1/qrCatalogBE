---
name: ship
description: Commit current changes, merge them to main via a PR, watch the Heroku deploy with the Heroku CLI, then provide the live link. Use when asked to ship, publish, or deploy changes.
disable-model-invocation: true
---

Ship the current changes to production. App: `qrcatalog`. Live URL: https://qrcatalog-d574ec87dce6.herokuapp.com/

## 1. Commit
- Work on the designated feature branch (never commit to `main` directly).
- `git add` the changed files and commit with a short descriptive message, then `git push -u origin <branch>`.

## 2. Merge
- Create a PR into `main` (GitHub MCP tools; no `gh` CLI), then merge it with a merge commit.
- Note the merge commit SHA.

## 3. Watch the Heroku deploy
Heroku auto-deploys `main`. Requires the Heroku CLI and `HEROKU_API_KEY` in the environment.
In the cloud container, Node ignores the proxy by default, so export these before any `heroku` command:
`export NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`

- Poll until a release for the merge SHA appears and succeeds:
  `until heroku releases -a qrcatalog -n 1 | grep -q "Deploy <sha7>"; do sleep 10; done`
- Then confirm status: `heroku releases -a qrcatalog -n 3` (look for `succeeded`).
- Confirm the dyno is up: `heroku ps -a qrcatalog` (state `up`).
- On failure, show `heroku builds:output -a qrcatalog` / `heroku logs -a qrcatalog -n 100` and stop; do not give the link as live.
- If the CLI is missing, fall back to the Heroku Platform API with `curl` and `$HEROKU_API_KEY`
  (`https://api.heroku.com/apps/qrcatalog/releases`, headers `Accept: application/vnd.heroku+json; version=3`).

## 4. Provide the live link
Only after the release succeeded and the dyno is `up`:
- Verify with `curl -s -o /dev/null -w "%{http_code}" <url>` (expect 200).
- Do not try to open a browser; just give the user the link.

Report briefly: commit, PR, release version, dyno state, and the URL.
