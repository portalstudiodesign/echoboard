import "dotenv/config";
import { createMigratedDb, databaseUrl } from "../src/db/client";
import { demoSlug, seedDemo } from "../src/features/demo/seed";

// Resets the public demo workspace (/b/orbit). Safe to re-run; touches only demo data.
createMigratedDb(databaseUrl())
  .then(seedDemo)
  .then(
    (result) => {
      console.log(`Demo ready at /b/${demoSlug}: ${result.posts} posts, ${result.users} demo users.`);
      process.exit(0);
    },
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
