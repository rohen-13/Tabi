import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
export const trips = sqliteTable("trips", {
 id: text("id").primaryKey(),
 owner: text("owner").notNull(),
 name: text("name").notNull(),
 data: text("data").notNull(),
 createdAt: text("created_at").notNull(),
}, (table)=>[index("idx_trips_owner_created").on(table.owner,table.createdAt)]);
