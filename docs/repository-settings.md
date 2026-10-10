# Repository settings

How the public repository is set up, and the exact steps to apply it. These settings live on GitHub, not in the code, so a maintainer has to click them through once. The two files in `.github/rulesets/` hold the branch and tag protection, so they can be imported instead of typed in.

The goals: nobody pushes straight to `main`, outside contributors work through pull requests from forks, and nobody but the maintainer can publish a release.

## 1. Branch and tag protection (rulesets)

**Settings → Rules → Rulesets → New ruleset → Import a ruleset**, then import each file:

| File | What it does |
| --- | --- |
| `.github/rulesets/protect-main.json` | On the default branch: no direct pushes, no force pushes, no deletion, linear history. Changes must come through a pull request with one approval from a code owner and all review threads resolved. New pushes dismiss earlier approvals. |
| `.github/rulesets/protect-release-tags.json` | Only a repository admin can create, move or delete a `v*` tag. The release workflow runs on those tags, so this keeps others from publishing a release. |

Notes on how it behaves:

- **The maintainer is not exempt from pull requests.** The bypass is set to *pull request only*: an admin cannot push to `main` either, but can merge their own pull request without a second approver (GitHub does not let you approve your own pull request, so a solo maintainer would otherwise be stuck). Everyone else needs the maintainer's review.
- There are no required status checks, because the project has no hosted CI. Checks run locally (`npm run check`; see [contributing](../contributing.md)). If CI is added later, add a "Require status checks" rule.
- Only `main` is protected. Branches you push to the repository are not, so do work on a branch and open a pull request, and delete the branch after merging.
- The ruleset JSON uses the format GitHub exports. If an import is rejected after a GitHub change, create the rules by hand with the same options as the table above.

## 2. General

**Settings → General**

- Visibility: make the repository public only after the checklist in [Releasing](releasing.md#first-release-checklist) is done.
- Features: keep **Issues** and **Discussions** on (the issue chooser links to Discussions). Turn **Wikis**, **Projects** and **Sponsorships** off until you need them.
- Pull requests: allow **squash** and **rebase** merging, turn **merge commits** off, turn on **Automatically delete head branches**, and turn on **Always suggest updating pull request branches**.
- Add a description (`Offline API client for exploring and testing APIs`) and topics such as `api-client`, `rest`, `graphql`, `electron`, `offline`.

## 3. Security

**Settings → Code security**

- **Private vulnerability reporting**: on. `security.md` points reporters to it.
- **Dependabot alerts**: on. Leave automatic pull requests (version updates) off; the project removed them on purpose.
- **Secret scanning** and **push protection**: on.

## 4. Actions

**Settings → Actions → General**

- Actions permissions: **Allow actions created by GitHub** (the release workflow only uses `actions/*`).
- Fork pull request workflows: **Require approval for all outside collaborators**. No workflow runs on pull requests today, but this keeps it safe if one is added.
- Workflow permissions: **Read repository contents permission**. The release workflow asks for `contents: write` itself.
- **Secrets**: signing keys (`CSC_LINK`, `APPLE_*`; see [Releasing](releasing.md#code-signing)) go in repository secrets, never in files. Workflows started from a fork cannot read them.

## 5. People and accounts

- **Settings → Collaborators**: nobody else needs write access. Outside contributors use forks.
- Turn on two-factor authentication on your GitHub account, ideally with a passkey or hardware key, since the account can publish releases.
- Use your GitHub no-reply address for commits (**Settings → Emails → Keep my email addresses private**, then `git config user.email <id>+jakahann@users.noreply.github.com`), so your real address is not in new commits.

## What contributors see

| File | Purpose |
| --- | --- |
| `readme.md` | what Ferret is, how to install it, license and branding |
| `contributing.md` | how to set up, test and open a pull request |
| `security.md` | how to report a vulnerability privately |
| `.github/CODEOWNERS` | who reviews what; the maintainer owns everything |
| `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/` | the forms for pull requests and issues |
| `license.md`, `THIRD_PARTY_NOTICES.md` | the MIT license and the licenses of bundled software |
