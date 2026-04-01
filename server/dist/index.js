"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const db_1 = require("./lib/db");
const app_1 = require("./app");
const start = async () => {
    await (0, db_1.connectToDatabase)();
    const app = (0, app_1.createApp)();
    app.listen(env_1.env.port, () => {
        console.log(`Server listening on http://localhost:${env_1.env.port}`);
    });
};
void start();
