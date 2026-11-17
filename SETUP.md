# Setting up your own Cottage

This moves the Cottage off claude.ai and onto your own server (a Cloudflare Worker), so it works as an app on your PC and phone, and Claude connects to it from any chat. Everything is free on Cloudflare's free plan. Plan on about 20 minutes. Do the steps in order.

## 1. Put the code on GitHub (GitHub Desktop)
1. Open GitHub Desktop. If MyBrain isn't listed yet: File > Add local repository > choose `Documents\GitHub\MyBrain`. If it says the folder isn't a Git repository yet, click **create a repository** right there and keep the name MyBrain.
2. Commit everything that's changed (summary: "The Cottage v5 and server").
3. Click **Publish repository**. Leave **Keep this code private** checked.

## 2. Create the Worker (Cloudflare dashboard)
1. Go to dash.cloudflare.com > **Workers & Pages** > **Create application** > **GitHub**. Sign in to GitHub if it asks, and let Cloudflare see the MyBrain repo.
2. Pick **MyBrain**.
3. Set up the project:
   - **Project name:** `the-cottage` (it has to match the name in the code, or the build fails)
   - **Root directory:** `server`
   - **Build command:** `npm ci`
   - **Deploy command:** leave it as `npx wrangler deploy`
4. Click **Save and Deploy** and wait for the green check (a minute or two). The first deploy creates your database (D1) and key store (KV) by itself.

## 3. Set your passphrase
This is the one password for your Cottage. Pick something long that you don't use anywhere else, and keep it in your password manager. Nobody else needs it, including Claude.
1. In the dashboard, open the **the-cottage** Worker > **Settings** > **Variables and Secrets** > **Add**.
2. Type: **Secret**. Name: `COTTAGE_PASSPHRASE`. Value: your passphrase. **Deploy**.

Until this is set, the Cottage turns every sign-in away.

## 4. Open your Cottage
1. On the Worker's page, copy its address. It looks like `https://the-cottage.<your-name>.workers.dev`.
2. Open it and type your passphrase at the door.
3. **Install it as an app:**
   - PC (Chrome or Edge): the install icon at the right of the address bar.
   - iPhone (Safari): Share > Add to Home Screen.
   - Android (Chrome): menu > Install app.

## 5. Move your notes in
1. Open the old Cottage on claude.ai (the pinned artifact) > menu (Cottage keeping) > **Download backup**.
2. In your new Cottage: menu > **Restore from a backup** > choose that file.
3. Check that the rooms look right. From now on, the new one is the real Cottage.

## 6. Connect Claude (Munin in every chat)
1. In Claude: **Settings** > **Connectors** > **Add custom connector**.
2. Name: `The Cottage`. URL: your address with `/mcp` on the end, like `https://the-cottage.<your-name>.workers.dev/mcp`. **Add**.
3. Click **Connect**. Your Cottage opens a page asking "Let Claude into the cottage?". Type your passphrase and press **Allow**.
4. It shows up in the Claude app on your phone too. In a chat, turn it on from the tools menu if it isn't already.

From then on, any chat can read your Cottage and write runes into the Book of Shadows, and Munin sorts them.

## If something goes wrong
- **The build fails on the name:** the project name in step 2 must be exactly `the-cottage`.
- **The build fails about D1 or KV (database or key store):** make them by hand. Dashboard > **Storage & Databases** > **D1** > Create, named `the-cottage-db`. Then **KV** > Create, named `the-cottage-oauth`. Send me (Claude) the two IDs; they're safe to share and they go in `server/wrangler.jsonc`.
- **"Couldn't reach the cottage":** check that the address is right and the last deploy succeeded.
- **Munin can't sort or answer:** Workers AI has a daily free limit. It resets the next day, and nothing is lost in the meantime.
- **Signing out:** menu > **Lock the door (sign out)**. It only signs out that one device.

## Every update after this
I change the code and commit it to MyBrain, and you push in GitHub Desktop. Cloudflare rebuilds and redeploys on every push to `main`. Your notes live in the database, so updates never touch them.
