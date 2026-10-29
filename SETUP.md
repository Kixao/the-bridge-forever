# The Bridge — Forever Launch Planner

A GitHub Pages website with a private Google Sheet and Discord member verification.

## What is ready

- Responsive Alliance-themed planner, with a clearly labeled fictional sample roster.
- One editable launch plan per verified Discord user: first and last name, race, class, preferred role, two primary professions, certainty, and a short note.
- Search, class filter, role totals, and profession coverage.
- Discord OAuth login, server membership checks on every protected request, optional role restriction.
- Private Sheet access through Google Apps Script, with concurrent writes locked and spreadsheet formula injection prevented.
- GitHub Actions workflow to publish the frontend to GitHub Pages.

The sample roster works immediately; real login and saving require the configuration below. Live Discord/Google end-to-end testing is still required after deployment. This is a first implementation, not an already connected service.

## 1. Create the Discord application

1. Open https://discord.com/developers/applications and click **New Application**.
2. Name it **The Bridge Guild Planner** and create it.
3. Open **OAuth2**. Copy the **Client ID** (safe to share).
4. Generate/copy the **Client Secret**. Keep it private; put it directly into Google Apps Script properties later, never in GitHub, website configuration, or chat.
5. The OAuth redirect will be added after choosing the GitHub repository. No bot is needed.

To get your Discord server ID: Discord Settings → Advanced → enable Developer Mode; right-click The Bridge server → Copy Server ID. An optional role ID is obtained by right-clicking the member role with Developer Mode enabled.

## 2. Create a GitHub repository and enable Pages

Create a dedicated repository, for example `the-bridge-forever`. Do not reuse either Emberwild repository. A public repository works with GitHub Free. Do not commit secrets.

Upload the extracted project contents to the repository root, including `.github/workflows/pages.yml`. The important public files are `index.html`, `style.css`, `app.js`, and `config.js`. `backend/` holds templates only, never real secrets.

In **Settings → Pages → Build and deployment**, select **GitHub Actions**. The included workflow deploys on pushes to `main`; if your default branch differs, change the workflow. Run the workflow if needed.

Record the Pages URL, normally `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`. It must end in `/`. Custom domains also work, provided the same exact URL is used everywhere.

## 3. Configure Discord OAuth

In the Discord application, **OAuth2 → Redirects → Add Redirect**, enter the exact Pages URL including trailing `/`, then save. The frontend handles the callback at its root; no callback subpage is needed.

Requested permissions are only `identify` and `guilds.members.read`. We do not request email, messages, or the ability to join servers.

## 4. Create the private Google Sheet and backend

1. Create a Google Sheet named **The Bridge — Forever Launch Plans**. Keep its sharing **Restricted**.
2. Copy the spreadsheet ID from its URL: the text between `/d/` and `/edit`.
3. Open **Extensions → Apps Script**.
4. Replace `Code.gs` with the contents of `backend/Code.gs`.
5. Add an HTML file named **Bridge** and paste `backend/Bridge.html` into it.
6. In Project Settings, enable **Show appsscript.json manifest file in editor**. Replace that manifest with `backend/appsscript.json`.
7. Under **Project Settings → Script properties**, add:

| Property | Value |
| --- | --- |
| `SHEET_ID` | The spreadsheet ID |
| `DISCORD_CLIENT_ID` | Discord OAuth Client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth Client Secret — private |
| `DISCORD_GUILD_ID` | The Bridge Discord server ID |
| `SITE_URL` | Exact Pages URL, ending in `/` |
| `DISCORD_ROLE_ID` | Optional: required guild member role ID. Omit to allow all server members. |

8. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Authorize the script under the Sheet owner account. Some Workspace policies prevent anonymous web apps; use a suitable account if yours does.
9. Copy the deployment URL ending in `/exec`, not the `/dev` test URL.

The public web-app endpoint still requires a verified session for all roster reads and edits. The Sheet stays private. The backend creates a `LaunchPlans` tab on the first authenticated roster request. Do not rename its columns or add formulas to that data tab; put your own analysis in separate tabs.

## 5. Connect the frontend

Edit `config.js`, setting `backendUrl` to your Apps Script `/exec` URL. This is a public endpoint URL, not a secret. Commit the change and wait for the Pages workflow to finish.

The frontend communicates with the Apps Script HTML bridge through an embedded frame, avoiding unsupported cross-origin JSON fetch assumptions. The bridge accepts messages only from the exact configured site origin. Do not host untrusted apps on that same origin.

When backend code changes, use **Deploy → Manage deployments → Edit → New version → Deploy**, retaining the same deployment URL. Changing Script properties does not require committing anything to GitHub.

## 6. Live acceptance checks

- Log in with a Discord account that belongs to The Bridge. Confirm your Discord nickname appears.
- Save a valid Alliance character and confirm a row appears in the private Sheet.
- Reload, log in again if needed, edit that plan and confirm it updates the existing row.
- Use a second member account to confirm it can only edit its own entry.
- Use a nonmember account; it must be refused access to both roster and saving.
- If a required role is set, test a server member without that role.
- Confirm invalid race/class combinations and duplicate professions are rejected.
- Remove your plans and confirm your row disappears.
- Check desktop and mobile layouts in your actual browser.

## Operation and limits

Sessions live in Apps Script's cache for at most six hours and may expire earlier if Google evicts them. Users simply log in again. Tokens stay server-side; only an opaque session key is kept in the current browser tab's sessionStorage. Logging out invalidates that session; it does not remove the member's saved plan.

All roster reads require current Discord server membership (and the configured role, if any). Anyone who can view the roster can copy it. Google Sheet owners/editors can see the stored Discord user IDs; ordinary roster responses omit other members' IDs.

Google Apps Script and Discord enforce quotas/rate limits. This is intended for a small guild, not high-volume traffic. The public OAuth-start endpoint can consume quotas if abused. Apps Script is not a general-purpose hardened hosting platform; revisit the architecture if usage or abuse grows.

The Apps Script HTML bridge depends on browsers allowing Google's embedded script service. If blocked by privacy settings, visitors may need to allow it. There is no claim of tested live compatibility until the real deployed endpoints have passed the acceptance checks above.

No background synchronization or bot hosting is required. Google Sheets is the persistent store. Race/class and profession rules are validated on both client and server; update both copies together if Blizzard changes them.

## Game rules and references

Checked October 29, 2026:
- Alliance races: Human, Dwarf, Gnome, Night Elf, Skyborne (High Order).
- Nine classes with race restrictions, including Human Hunter, Dwarf Shaman and Gnome Priest.
- Nine primary professions; up to two, with undecided choices supported.
- Roles are a planning preference, not a guarantee about endgame specialization viability.

Sources:
- https://www.wowhead.com/forever
- https://worldofwarcraft.blizzard.com/en-us/news/24304075/erschafft-den-helden-der-ihr-sein-wollt-in-world-of-warcraft-forever
- https://worldofwarcraft.blizzard.com/en-us/news/24301516/gather-around-the-campfire-in-world-of-warcraft-forever
- https://developers.google.com/apps-script/guides/web
- https://github.com/discord/discord-api-docs/blob/main/developers/topics/oauth2.mdx
- https://github.com/discord/discord-api-docs/blob/main/developers/resources/user.mdx

## Local checks

Run `node tests/backend.test.cjs` and `node --check app.js`. The automated suite exercises backend authorization, OAuth state consumption, owner-derived writes, validation, formula protection, and deletion using mocks. It cannot replace the live OAuth/Apps Script deployment checks.

## First and last names update

The form collects first and last names separately (2–24 characters per part as a planner limit). The Sheet retains its existing `name` column and stores the full name separated by a space, so no schema change is needed. Existing single names remain intact and load into the first-name field; add a surname when next editing. This limit is a planner validation rule, not a claim about the game's naming policy.

After updating the website, replace Code.gs from this repository in Apps Script, then Deploy → Manage deployments → Edit → New version → Deploy. Keep the same deployment URL. This allows full names longer than the old 24-character total limit. Bridge.html and Script properties do not need changes.
