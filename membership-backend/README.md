# Game Editor membership — preparation only

Read [คู่มือตั้งค่า Project ใหม่](../docs/membership/NEW-PROJECT-SETUP.md) first.

No deployment has occurred. The existing website does not import the new membership client yet. `krukung-game-hub` is forbidden by backend/client guards. Default CLI project is `demo-game-editor-membership` for local emulation only.

The Firestore and Storage rules here are for the **new isolated project only**. Never merge/deploy them to the old project. They intentionally contain no legacy `games` rules. Storage denies all access until protected delivery is implemented and tested. No public download token generation is included.

Backend policy and client lifecycle unit tests can run without dependencies:

```
node --test functions/test/*.test.cjs
```

Install dependencies, then run `npm run test:emulator` for integration testing. No deploy script is provided. Production will require reviewed project configuration, Firebase deployment authorization, App Check/abuse controls, a verified admin with server-managed claims, email worker setup and UI/31-game regression. The outbox queues notifications only; no emails are delivered by this starter.

Future admin UI must use returned revision and a stable requestId per action attempt, confirm with a modal, disable repeated clicks, and retry a failed request with the same ID. Display members with textContent, not HTML. Read pending count via getEditorMemberSummary; subscribe/poll only while admin view is active and dispose on exit. Backend search is prefix-based with explicit facebookName/email selector, not arbitrary substring matching.

Future website integration must replace all preview login paths together (index, direct editor and game-player) with server-approved membership, wait for initial Auth state and the server member result, clear tools on revocation, and retain the existing Editor working-copy/cleanup behavior. Do not treat productionReviewed in the example config as authorization; it is merely a setup guard. Real privileges are enforced in Backend/Rules, while public static game files remain public until migrated.
