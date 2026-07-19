import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const campaigns = sqliteTable("campaigns", {
  campid: integer("campid").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sites = sqliteTable("sites", {
  siteid: integer("siteid").primaryKey(),
  name: text("name").notNull(),
  // Optional platform click-ID template (e.g. "{campaignid}_{adgroupid}_{creative}"
  // for Google, "{{ad.id}}" for Facebook). Appended as `&vkclkid=...` when set.
  vkclkidTemplate: text("vkclkid_template"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const mediums = sqliteTable("mediums", {
  meid: integer("meid").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const tids = sqliteTable("tids", {
  tid: integer("tid").primaryKey(),
  note: text("note"),
  campid: integer("campid")
    .notNull()
    .references(() => campaigns.campid),
  siteid: integer("siteid")
    .notNull()
    .references(() => sites.siteid),
  meid: integer("meid")
    .notNull()
    .references(() => mediums.meid),
  baseUrl: text("base_url").notNull(),
  generatedUrl: text("generated_url").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const TID_START_KEY = "tid_start";
