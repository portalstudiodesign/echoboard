import "dotenv/config";
import { createMigratedDb, databaseUrl } from "../src/db/client";

const url = databaseUrl();
createMigratedDb(url).then(
  () => {
    console.log(`Migrations applied (${url.split("://")[0]}).`);
    process.exit(0);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
