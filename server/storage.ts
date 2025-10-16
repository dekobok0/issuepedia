// Storage interface implementation - from blueprint javascript_database and javascript_log_in_with_replit
import {
  users,
  prompts,
  reviews,
  votes,
  comments,
  reputationEvents,
  badges,
  userBadges,
  promptTechniques,
  promptTechniqueLinks,
  type User,
  type UpsertUser,
  type Prompt,
  type InsertPrompt,
  type Review,
  type InsertReview,
  type Vote,
  type InsertVote,
  type Comment,
  type InsertComment,
  type ReputationEvent,
  type InsertReputationEvent,
  type Badge,
  type InsertBadge,
  type PromptTechnique,
  type InsertPromptTechnique,
  type PromptTechniqueLink,
  type UserBadge,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUserReputation(userId: string, changeAmount: number): Promise<User>;
  
  // Prompt operations
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  getPrompt(id: string): Promise<Prompt | undefined>;
  getPrompts(filters?: { status?: string; authorId?: string; limit?: number; offset?: number }): Promise<Prompt[]>;
  getPromptsWithTechniques(filters?: { status?: string; authorId?: string; limit?: number; offset?: number }): Promise<(Prompt & { techniques: PromptTechnique[] })[]>;
  updatePrompt(id: string, data: Partial<InsertPrompt>): Promise<Prompt | undefined>;
  forkPrompt(promptId: string, authorId: string): Promise<Prompt>;
  
  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByPromptId(promptId: string): Promise<Review[]>;
  getReviewQueue(): Promise<Prompt[]>;
  
  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getVotesByPromptId(promptId: string): Promise<Vote[]>;
  getUserVoteForPrompt(userId: string, promptId: string): Promise<Vote | undefined>;
  deleteVote(userId: string, promptId: string): Promise<void>;
  
  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByPromptId(promptId: string): Promise<Comment[]>;
  
  // Reputation operations
  createReputationEvent(event: InsertReputationEvent): Promise<ReputationEvent>;
  getReputationHistory(userId: string): Promise<ReputationEvent[]>;
  
  // Badge operations
  createBadge(badge: InsertBadge): Promise<Badge>;
  getBadges(): Promise<Badge[]>;
  awardBadge(userId: string, badgeId: number): Promise<UserBadge>;
  getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]>;
  
  // Technique operations
  createTechnique(technique: InsertPromptTechnique): Promise<PromptTechnique>;
  getTechniques(): Promise<PromptTechnique[]>;
  getTechniqueTree(): Promise<PromptTechnique[]>;
  linkPromptToTechnique(promptId: string, techniqueId: number): Promise<PromptTechniqueLink>;
  getPromptTechniques(promptId: string): Promise<PromptTechnique[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations - Required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async updateUserReputation(userId: string, changeAmount: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        reputation: sql`${users.reputation} + ${changeAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Prompt operations
  async createPrompt(promptData: InsertPrompt): Promise<Prompt> {
    const [prompt] = await db
      .insert(prompts)
      .values(promptData)
      .returning();
    return prompt;
  }

  async getPrompt(id: string): Promise<Prompt | undefined> {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id));
    return prompt;
  }

  async getPrompts(filters?: { status?: string; authorId?: string; limit?: number; offset?: number }): Promise<Prompt[]> {
    let query = db.select().from(prompts);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(prompts.status, filters.status));
    }
    if (filters?.authorId) {
      conditions.push(eq(prompts.authorId, filters.authorId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(prompts.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async getPromptsWithTechniques(filters?: { status?: string; authorId?: string; limit?: number; offset?: number }): Promise<(Prompt & { techniques: PromptTechnique[] })[]> {
    // First, get the filtered prompts
    const filteredPrompts = await this.getPrompts(filters);
    
    if (filteredPrompts.length === 0) {
      return [];
    }
    
    // Get prompt IDs
    const promptIds = filteredPrompts.map(p => p.id);
    
    // Get all technique links for these prompts
    const techniquesData = await db
      .select({
        promptId: promptTechniqueLinks.promptId,
        technique: promptTechniques,
      })
      .from(promptTechniqueLinks)
      .innerJoin(promptTechniques, eq(promptTechniqueLinks.techniqueId, promptTechniques.id))
      .where(inArray(promptTechniqueLinks.promptId, promptIds));
    
    // Group techniques by prompt
    const techniquesByPrompt = new Map<string, PromptTechnique[]>();
    for (const { promptId, technique } of techniquesData) {
      if (!techniquesByPrompt.has(promptId)) {
        techniquesByPrompt.set(promptId, []);
      }
      techniquesByPrompt.get(promptId)!.push(technique);
    }
    
    // Combine prompts with their techniques
    return filteredPrompts.map(prompt => ({
      ...prompt,
      techniques: techniquesByPrompt.get(prompt.id) || [],
    }));
  }

  async updatePrompt(id: string, data: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    const [prompt] = await db
      .update(prompts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(prompts.id, id))
      .returning();
    return prompt;
  }

  async forkPrompt(promptId: string, authorId: string): Promise<Prompt> {
    const original = await this.getPrompt(promptId);
    if (!original) {
      throw new Error("Original prompt not found");
    }
    
    const [forked] = await db
      .insert(prompts)
      .values({
        authorId,
        title: `${original.title} (Fork)`,
        promptBodyText: original.promptBodyText,
        promptBodyJson: original.promptBodyJson,
        rationale: original.rationale,
        version: 1,
        parentPromptId: promptId,
        status: 'draft',
      })
      .returning();
    return forked;
  }

  // Review operations
  async createReview(reviewData: InsertReview): Promise<Review> {
    const [review] = await db
      .insert(reviews)
      .values(reviewData)
      .returning();
    return review;
  }

  async getReviewsByPromptId(promptId: string): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.promptId, promptId));
  }

  async getReviewQueue(): Promise<Prompt[]> {
    // Returns all pending_review prompts
    // Access control (reputation check) is enforced in routes.ts
    return await db
      .select()
      .from(prompts)
      .where(eq(prompts.status, 'pending_review'))
      .orderBy(prompts.createdAt);
  }

  // Vote operations
  async createVote(voteData: InsertVote): Promise<Vote> {
    const [vote] = await db
      .insert(votes)
      .values(voteData)
      .onConflictDoUpdate({
        target: [votes.userId, votes.promptId],
        set: { voteType: voteData.voteType },
      })
      .returning();
    return vote;
  }

  async getVotesByPromptId(promptId: string): Promise<Vote[]> {
    return await db.select().from(votes).where(eq(votes.promptId, promptId));
  }

  async getUserVoteForPrompt(userId: string, promptId: string): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.userId, userId), eq(votes.promptId, promptId)));
    return vote;
  }

  async deleteVote(userId: string, promptId: string): Promise<void> {
    await db
      .delete(votes)
      .where(and(eq(votes.userId, userId), eq(votes.promptId, promptId)));
  }

  // Comment operations
  async createComment(commentData: InsertComment): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values(commentData)
      .returning();
    return comment;
  }

  async getCommentsByPromptId(promptId: string): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.promptId, promptId))
      .orderBy(comments.createdAt);
  }

  // Reputation operations
  async createReputationEvent(eventData: InsertReputationEvent): Promise<ReputationEvent> {
    const [event] = await db
      .insert(reputationEvents)
      .values(eventData)
      .returning();
    return event;
  }

  async getReputationHistory(userId: string): Promise<ReputationEvent[]> {
    return await db
      .select()
      .from(reputationEvents)
      .where(eq(reputationEvents.userId, userId))
      .orderBy(desc(reputationEvents.createdAt));
  }

  // Badge operations
  async createBadge(badgeData: InsertBadge): Promise<Badge> {
    const [badge] = await db
      .insert(badges)
      .values(badgeData)
      .returning();
    return badge;
  }

  async getBadges(): Promise<Badge[]> {
    return await db.select().from(badges);
  }

  async awardBadge(userId: string, badgeId: number): Promise<UserBadge> {
    const [userBadge] = await db
      .insert(userBadges)
      .values({ userId, badgeId })
      .onConflictDoNothing()
      .returning();
    return userBadge;
  }

  async getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]> {
    const result = await db
      .select({
        userId: userBadges.userId,
        badgeId: userBadges.badgeId,
        awardedAt: userBadges.awardedAt,
        badge: badges,
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId));
    
    return result as (UserBadge & { badge: Badge })[];
  }

  // Technique operations
  async createTechnique(techniqueData: InsertPromptTechnique): Promise<PromptTechnique> {
    const [technique] = await db
      .insert(promptTechniques)
      .values(techniqueData)
      .returning();
    return technique;
  }

  async getTechniques(): Promise<PromptTechnique[]> {
    return await db.select().from(promptTechniques);
  }

  async getTechniqueTree(): Promise<PromptTechnique[]> {
    // Get all techniques ordered by parent relationship for tree structure
    return await db
      .select()
      .from(promptTechniques)
      .orderBy(promptTechniques.parentId, promptTechniques.id);
  }

  async linkPromptToTechnique(promptId: string, techniqueId: number): Promise<PromptTechniqueLink> {
    const [link] = await db
      .insert(promptTechniqueLinks)
      .values({ promptId, techniqueId })
      .onConflictDoNothing()
      .returning();
    return link;
  }

  async getPromptTechniques(promptId: string): Promise<PromptTechnique[]> {
    const result = await db
      .select({ technique: promptTechniques })
      .from(promptTechniqueLinks)
      .innerJoin(promptTechniques, eq(promptTechniqueLinks.techniqueId, promptTechniques.id))
      .where(eq(promptTechniqueLinks.promptId, promptId));
    
    return result.map(r => r.technique);
  }
}

export const storage = new DatabaseStorage();
