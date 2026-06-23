import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL"); process.exit(1); }

const conn = await mysql.createConnection(url);
const tables = ['applications','resume_versions','resume_profiles','scraping_logs','notifications','user_preferences','jobs','companies','local_users'];
for (const t of tables) {
  try { await conn.execute(`DROP TABLE IF EXISTS \`${t}\``); console.log('Dropped', t); } catch(e) { console.log('Skip', t, e.message); }
}
await conn.end();
console.log('Done');
