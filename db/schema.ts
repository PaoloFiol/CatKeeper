import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const workspace = sqliteTable("rescue_workspace", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  revision: integer("revision").notNull().default(0),
});
