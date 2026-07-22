import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The client/business unit a campaign belongs to (e.g. "VKB", "AOK NW").
// Admin-managed like campaigns/sites/mediums; see the "Mandanten" admin tab.
export const mandanten = sqliteTable("mandanten", {
  mandantid: integer("mandantid").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const campaigns = sqliteTable("campaigns", {
  campid: integer("campid").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  // Nullable at the DB level only so pre-existing rows from before this
  // column existed don't break; create/update actions require a value.
  mandantid: integer("mandantid").references(() => mandanten.mandantid),
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

// Restricts which mediums are selectable for a given site. A medium with no
// rows here is unrestricted and stays selectable for every site.
export const siteMediums = sqliteTable(
  "site_mediums",
  {
    siteid: integer("siteid")
      .notNull()
      .references(() => sites.siteid),
    meid: integer("meid")
      .notNull()
      .references(() => mediums.meid),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.siteid, table.meid] }),
  }),
);

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
