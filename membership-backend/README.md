# Game Editor VIP V21 — Spark only

Active services: Authentication and Cloud Firestore Rules. No Functions, Storage, Gateway or Billing configuration. Production remains disabled until the owner approves activation.

See [คู่มือตั้งค่า Spark ภาษาไทย](../docs/membership/SPARK-V21-SETUP.md) and [ผลทดสอบ](../docs/membership/SPARK-V21-REPORT.md).

Admin roles are Console-managed documents under editorAdmins, never browser-assigned roles/custom claims. firebase-admin is a devDependency for seeding demo emulator test data only; no Admin SDK is imported by the website.

Local tests: Node.js 22 + Java 21 + Chrome + Python 3; npm ci; npm test; npm run test:emulator. To test all 31 preview/ZIP packages set EDITOR_ALL_GAME_PACKAGES=1 before npm run test:full. .firebaserc points only to demo-game-editor-membership. No production deploy has been performed.

Legacy Functions/Storage/Gateway operator scripts have been removed from the active repository. Prior preparation is backed up outside the repository under work/legacy-paid-v21 and is not a deployment artifact. Never restore it as part of Spark setup.
