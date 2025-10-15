// API Routes implementation - from blueprints and Issuepedia API specification
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  handlePromptVote, 
  handleReviewSubmission,
  initializeDefaultBadges 
} from "./reputationSystem";
import { 
  insertPromptSchema, 
  insertReviewSchema, 
  insertVoteSchema,
  insertCommentSchema,
  insertPromptTechniqueSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Initialize default badges on startup
  await initializeDefaultBadges();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Prompts API - /api/v1/prompts
  app.get('/api/v1/prompts', async (req, res) => {
    try {
      const { status, authorId, limit, offset } = req.query;
      const prompts = await storage.getPromptsWithTechniques({
        status: status as string,
        authorId: authorId as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      res.status(500).json({ message: "Failed to fetch prompts" });
    }
  });

  app.post('/api/v1/prompts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertPromptSchema.parse({
        ...req.body,
        authorId: userId,
      });
      const prompt = await storage.createPrompt(validatedData);
      res.status(201).json(prompt);
    } catch (error: any) {
      console.error("Error creating prompt:", error);
      res.status(400).json({ message: error.message || "Failed to create prompt" });
    }
  });

  app.get('/api/v1/prompts/:id', async (req, res) => {
    try {
      const prompt = await storage.getPrompt(req.params.id);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching prompt:", error);
      res.status(500).json({ message: "Failed to fetch prompt" });
    }
  });

  app.put('/api/v1/prompts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const prompt = await storage.getPrompt(req.params.id);
      
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      if (prompt.authorId !== userId) {
        return res.status(403).json({ message: "Unauthorized to edit this prompt" });
      }
      
      const updated = await storage.updatePrompt(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating prompt:", error);
      res.status(500).json({ message: "Failed to update prompt" });
    }
  });

  app.post('/api/v1/prompts/:id/fork', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const forked = await storage.forkPrompt(req.params.id, userId);
      res.status(201).json(forked);
    } catch (error: any) {
      console.error("Error forking prompt:", error);
      res.status(400).json({ message: error.message || "Failed to fork prompt" });
    }
  });

  // Reviews API - /api/v1/reviews
  app.get('/api/v1/reviews/queue', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || user.reputation < 500) {
        return res.status(403).json({ message: "Insufficient reputation to access review queue" });
      }
      
      const queue = await storage.getReviewQueue(500);
      res.json(queue);
    } catch (error) {
      console.error("Error fetching review queue:", error);
      res.status(500).json({ message: "Failed to fetch review queue" });
    }
  });

  app.post('/api/v1/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.reputation < 500) {
        return res.status(403).json({ message: "Insufficient reputation to review" });
      }
      
      const validatedData = insertReviewSchema.parse({
        ...req.body,
        reviewerId: userId,
      });
      
      const review = await storage.createReview(validatedData);
      
      // Update prompt status based on review
      if (validatedData.vote === 'approve') {
        await storage.updatePrompt(validatedData.promptId, { status: 'approved' });
      } else {
        await storage.updatePrompt(validatedData.promptId, { status: 'rejected' });
      }
      
      // Handle reputation changes from review
      await handleReviewSubmission(validatedData.promptId, userId, validatedData.vote);
      
      res.status(201).json(review);
    } catch (error: any) {
      console.error("Error creating review:", error);
      res.status(400).json({ message: error.message || "Failed to create review" });
    }
  });

  // Votes API - /api/v1/votes
  app.post('/api/v1/votes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertVoteSchema.parse({
        ...req.body,
        userId,
      });
      
      // Check for existing vote to handle vote changes
      const existingVote = await storage.getUserVoteForPrompt(userId, validatedData.promptId);
      
      const vote = await storage.createVote(validatedData);
      
      // Handle reputation changes
      await handlePromptVote(
        validatedData.promptId, 
        validatedData.voteType,
        existingVote?.voteType as 'upvote' | 'downvote' | undefined
      );
      
      res.status(201).json(vote);
    } catch (error: any) {
      console.error("Error creating vote:", error);
      res.status(400).json({ message: error.message || "Failed to create vote" });
    }
  });

  app.delete('/api/v1/votes/:promptId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteVote(userId, req.params.promptId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vote:", error);
      res.status(500).json({ message: "Failed to delete vote" });
    }
  });

  // Comments API - /api/v1/comments
  app.post('/api/v1/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        authorId: userId,
      });
      
      const comment = await storage.createComment(validatedData);
      res.status(201).json(comment);
    } catch (error: any) {
      console.error("Error creating comment:", error);
      res.status(400).json({ message: error.message || "Failed to create comment" });
    }
  });

  app.get('/api/v1/prompts/:id/comments', async (req, res) => {
    try {
      const comments = await storage.getCommentsByPromptId(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Users API - /api/v1/users
  app.get('/api/v1/users/:username', async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return public profile only
      const { id, username, reputation, createdAt, profileImageUrl, firstName, lastName } = user;
      res.json({ id, username, reputation, createdAt, profileImageUrl, firstName, lastName });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/v1/users/:id/reputation', async (req, res) => {
    try {
      const history = await storage.getReputationHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching reputation history:", error);
      res.status(500).json({ message: "Failed to fetch reputation history" });
    }
  });

  app.get('/api/v1/users/:id/badges', async (req, res) => {
    try {
      const badges = await storage.getUserBadges(req.params.id);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching user badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Techniques API - /api/v1/techniques
  app.get('/api/v1/techniques', async (req, res) => {
    try {
      const techniques = await storage.getTechniques();
      res.json(techniques);
    } catch (error) {
      console.error("Error fetching techniques:", error);
      res.status(500).json({ message: "Failed to fetch techniques" });
    }
  });

  app.get('/api/v1/techniques/tree', async (req, res) => {
    try {
      const tree = await storage.getTechniqueTree();
      res.json(tree);
    } catch (error) {
      console.error("Error fetching technique tree:", error);
      res.status(500).json({ message: "Failed to fetch technique tree" });
    }
  });

  app.post('/api/v1/techniques', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Only allow moderators (reputation > 2000) to create techniques
      if (!user || user.reputation < 2000) {
        return res.status(403).json({ message: "Insufficient reputation to create techniques" });
      }
      
      const validatedData = insertPromptTechniqueSchema.parse(req.body);
      const technique = await storage.createTechnique(validatedData);
      res.status(201).json(technique);
    } catch (error: any) {
      console.error("Error creating technique:", error);
      res.status(400).json({ message: error.message || "Failed to create technique" });
    }
  });

  app.get('/api/v1/prompts/:id/techniques', async (req, res) => {
    try {
      const techniques = await storage.getPromptTechniques(req.params.id);
      res.json(techniques);
    } catch (error) {
      console.error("Error fetching prompt techniques:", error);
      res.status(500).json({ message: "Failed to fetch prompt techniques" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
