# SoujiMate Web App

Vue 3 and Firebase portal for SoujiMate Users, Admins, and SuperAdmins.

## User Receipt Submission

Active Firebase users with a Firestore `role` of `User` are routed to
`/user/receipt`. The page supports rear-camera capture on compatible mobile
browsers, gallery selection, client-side compression, and a maximum of three
photos per 8:00 AM shift.

Images upload directly from the browser to Firebase Storage under:

```text
users/{uid}/receipts/{shiftDate}/{fileName}.jpg
```

Submission metadata is stored under:

```text
cleaning/{uid}/submissions/{shiftDate}
```

The deployed Firebase Authentication token must provide the `role`, `division`,
and `isActive` custom claims required by the project's Firestore and Storage
rules. Users must have `isActive: true`, and the profile document should include
`assignedArea` before they can submit.

Cloud Storage for Firebase must be enabled. The deployed Storage rules must
permit an active authenticated user to write image files below 10 MB only under
their own `users/{uid}/...` path. Do not make the bucket public.

## Vercel Environment Variables

Configure these variables for Preview and Production deployments:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Firebase web configuration is client configuration, not a service-account
secret. Authorization is enforced by Firebase Authentication and Security
Rules. Consider enabling Firebase App Check for the production domain.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Run Focused Tests

```sh
npm test
```
