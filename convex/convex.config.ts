import auth from "@convex-dev/auth/convex.config.js";
import authPasskey from "@convex-dev/auth/components/passkey/convex.config.js";
import authUsername from "@convex-dev/auth/components/username/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(auth);
app.use(authPasskey);
app.use(authUsername);

export default app;
