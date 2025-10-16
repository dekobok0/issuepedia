// Database schema for Issuepedia platform - from blueprint javascript_log_in_with_replit and javascript_database
import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  varchar, 
  text, 
  uuid, 
  timestamp, 
  jsonb, 
  integer,
  index,
  serial,
  primaryKey
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - Required for Replit Auth with reputation field for gamification
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique(), // Nullable - some login methods don't provide email
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  username: varchar("username", { length: 50 }).unique().notNull(),
  reputation: integer("reputation").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Prompts table - Core content with both text and visual JSON representations
export const prompts = pgTable("prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  promptBodyText: text("prompt_body_text"), // Final executable prompt text (nullable until compiled)
  promptBodyJson: jsonb("prompt_body_json"), // Visual composer graph structure (nullable)
  rationale: text("rationale").notNull(), // Why this prompt works explanation
  version: integer("version").default(1).notNull(),
  parentPromptId: uuid("parent_prompt_id").references((): any => prompts.id), // For forking
  status: varchar("status", { length: 20 }).notNull(), // draft, pending_review, approved, rejected
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// PromptTechniques table - Catalog of prompting techniques
export const promptTechniques = pgTable("prompt_techniques", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: text("description").notNull(),
  parentId: integer("parent_id").references((): any => promptTechniques.id), // For technique tree hierarchy
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Prompt_Technique_Links - Many-to-many relationship with composite primary key
export const promptTechniqueLinks = pgTable(
  "prompt_technique_links", 
  {
    promptId: uuid("prompt_id").references(() => prompts.id).notNull(),
    techniqueId: integer("technique_id").references(() => promptTechniques.id).notNull(),
  }, 
  (table) => ({
    pk: primaryKey({ columns: [table.promptId, table.techniqueId] })
  })
);

// Reviews table - Peer review system
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  promptId: uuid("prompt_id").references(() => prompts.id).notNull(),
  reviewerId: varchar("reviewer_id").references(() => users.id).notNull(),
  vote: varchar("vote", { length: 10 }).notNull(), // approve, reject
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ReputationEvents table - Audit log for reputation changes
export const reputationEvents = pgTable("reputation_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // prompt_upvoted, review_approved, etc.
  changeAmount: integer("change_amount").notNull(),
  relatedPromptId: uuid("related_prompt_id").references(() => prompts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Badges table - Achievement badges
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: text("description").notNull(),
  iconUrl: varchar("icon_url", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// UserBadges table - Many-to-many for user badge awards with composite primary key
export const userBadges = pgTable(
  "user_badges", 
  {
    userId: varchar("user_id").references(() => users.id).notNull(),
    badgeId: integer("badge_id").references(() => badges.id).notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).defaultNow().notNull(),
  }, 
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.badgeId] })
  })
);

// Comments table - Discussion on prompts
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  promptId: uuid("prompt_id").references(() => prompts.id).notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  parentCommentId: uuid("parent_comment_id").references((): any => comments.id), // For threaded comments
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Votes table - Upvote/downvote system with user-prompt uniqueness
export const votes = pgTable(
  "votes", 
  {
    promptId: uuid("prompt_id").references(() => prompts.id).notNull(),
    userId: varchar("user_id").references(() => users.id).notNull(),
    voteType: varchar("vote_type", { length: 10 }).notNull(), // upvote, downvote
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.promptId] })
  })
);

// Relations for better query capabilities
export const usersRelations = relations(users, ({ many }) => ({
  prompts: many(prompts),
  reviews: many(reviews),
  reputationEvents: many(reputationEvents),
  userBadges: many(userBadges),
  comments: many(comments),
  votes: many(votes),
}));

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  author: one(users, {
    fields: [prompts.authorId],
    references: [users.id],
  }),
  parentPrompt: one(prompts, {
    fields: [prompts.parentPromptId],
    references: [prompts.id],
  }),
  forks: many(prompts),
  techniques: many(promptTechniqueLinks),
  reviews: many(reviews),
  comments: many(comments),
  votes: many(votes),
  reputationEvents: many(reputationEvents),
}));

export const promptTechniquesRelations = relations(promptTechniques, ({ one, many }) => ({
  parent: one(promptTechniques, {
    fields: [promptTechniques.parentId],
    references: [promptTechniques.id],
  }),
  children: many(promptTechniques),
  prompts: many(promptTechniqueLinks),
}));

export const promptTechniqueLinksRelations = relations(promptTechniqueLinks, ({ one }) => ({
  prompt: one(prompts, {
    fields: [promptTechniqueLinks.promptId],
    references: [prompts.id],
  }),
  technique: one(promptTechniques, {
    fields: [promptTechniqueLinks.techniqueId],
    references: [promptTechniques.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  prompt: one(prompts, {
    fields: [reviews.promptId],
    references: [prompts.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
}));

export const reputationEventsRelations = relations(reputationEvents, ({ one }) => ({
  user: one(users, {
    fields: [reputationEvents.userId],
    references: [users.id],
  }),
  relatedPrompt: one(prompts, {
    fields: [reputationEvents.relatedPromptId],
    references: [prompts.id],
  }),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  prompt: one(prompts, {
    fields: [comments.promptId],
    references: [prompts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  parentComment: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
  }),
  replies: many(comments),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  prompt: one(prompts, {
    fields: [votes.promptId],
    references: [prompts.id],
  }),
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected']).default('draft'),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
}).extend({
  vote: z.enum(['approve', 'reject']),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  createdAt: true,
}).extend({
  voteType: z.enum(['upvote', 'downvote']),
});

export const insertReputationEventSchema = createInsertSchema(reputationEvents).omit({
  id: true,
  createdAt: true,
});

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export const insertPromptTechniqueSchema = createInsertSchema(promptTechniques).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;

export type ReputationEvent = typeof reputationEvents.$inferSelect;
export type InsertReputationEvent = z.infer<typeof insertReputationEventSchema>;

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;

export type PromptTechnique = typeof promptTechniques.$inferSelect;
export type InsertPromptTechnique = z.infer<typeof insertPromptTechniqueSchema>;

export type PromptTechniqueLink = typeof promptTechniqueLinks.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;

// Extended types for joined queries
export type PromptWithTechniques = Prompt & { techniques: PromptTechnique[] };
