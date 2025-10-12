// Reputation system logic for gamification
import { storage } from "./storage";
import type { InsertReputationEvent } from "@shared/schema";

// Reputation change amounts based on event type
const REPUTATION_VALUES = {
  PROMPT_UPVOTED: 10,
  PROMPT_DOWNVOTED: -2,
  REVIEW_APPROVED: 15,
  REVIEW_REJECTED: -5,
  ACCURATE_REVIEW: 5, // When reviewer's vote matches majority
  FIRST_PROMPT_APPROVED: 50,
  COMMENT_UPVOTED: 2,
};

// Badge trigger conditions
const BADGE_CONDITIONS = {
  FIRST_COT: async (userId: string) => {
    const prompts = await storage.getPrompts({ authorId: userId, status: 'approved' });
    const cotPrompts = [];
    
    for (const prompt of prompts) {
      const techniques = await storage.getPromptTechniques(prompt.id);
      if (techniques.some(t => t.name.toLowerCase().includes('chain-of-thought'))) {
        cotPrompts.push(prompt);
      }
    }
    
    return cotPrompts.length === 1; // First CoT prompt approved
  },
  
  REPUTATION_500: async (userId: string) => {
    const user = await storage.getUser(userId);
    return user ? user.reputation >= 500 : false;
  },
  
  REPUTATION_2000: async (userId: string) => {
    const user = await storage.getUser(userId);
    return user ? user.reputation >= 2000 : false;
  },
};

export async function handlePromptVote(
  promptId: string,
  voteType: 'upvote' | 'downvote',
  previousVoteType?: 'upvote' | 'downvote'
) {
  const prompt = await storage.getPrompt(promptId);
  if (!prompt) return;

  const authorId = prompt.authorId;
  
  // Calculate reputation change
  let changeAmount = 0;
  
  if (previousVoteType) {
    // User changed their vote, reverse previous effect
    if (previousVoteType === 'upvote') {
      changeAmount -= REPUTATION_VALUES.PROMPT_UPVOTED;
    } else {
      changeAmount -= REPUTATION_VALUES.PROMPT_DOWNVOTED;
    }
  }
  
  // Apply new vote
  if (voteType === 'upvote') {
    changeAmount += REPUTATION_VALUES.PROMPT_UPVOTED;
  } else {
    changeAmount += REPUTATION_VALUES.PROMPT_DOWNVOTED;
  }
  
  if (changeAmount !== 0) {
    await storage.updateUserReputation(authorId, changeAmount);
    await storage.createReputationEvent({
      userId: authorId,
      eventType: `prompt_${voteType}d`,
      changeAmount,
      relatedPromptId: promptId,
    });
  }
}

export async function handleReviewSubmission(
  promptId: string,
  reviewerId: string,
  vote: 'approve' | 'reject'
) {
  const prompt = await storage.getPrompt(promptId);
  if (!prompt) return;

  const authorId = prompt.authorId;
  const changeAmount = vote === 'approve' 
    ? REPUTATION_VALUES.REVIEW_APPROVED 
    : REPUTATION_VALUES.REVIEW_REJECTED;
  
  // Update author's reputation
  await storage.updateUserReputation(authorId, changeAmount);
  await storage.createReputationEvent({
    userId: authorId,
    eventType: `review_${vote}d`,
    changeAmount,
    relatedPromptId: promptId,
  });
  
  // Check for first approved prompt badge
  if (vote === 'approve') {
    const approvedPrompts = await storage.getPrompts({ 
      authorId, 
      status: 'approved' 
    });
    
    if (approvedPrompts.length === 1) {
      // First prompt approved! Award bonus reputation
      await storage.updateUserReputation(authorId, REPUTATION_VALUES.FIRST_PROMPT_APPROVED);
      await storage.createReputationEvent({
        userId: authorId,
        eventType: 'first_prompt_approved',
        changeAmount: REPUTATION_VALUES.FIRST_PROMPT_APPROVED,
        relatedPromptId: promptId,
      });
    }
  }
  
  // Check for badge triggers
  await checkAndAwardBadges(authorId, promptId);
}

export async function handleAccurateReview(reviewerId: string, promptId: string) {
  // Award small reputation for accurate review (matching majority opinion)
  await storage.updateUserReputation(reviewerId, REPUTATION_VALUES.ACCURATE_REVIEW);
  await storage.createReputationEvent({
    userId: reviewerId,
    eventType: 'accurate_review',
    changeAmount: REPUTATION_VALUES.ACCURATE_REVIEW,
    relatedPromptId: promptId,
  });
}

async function checkAndAwardBadges(userId: string, promptId?: string) {
  const allBadges = await storage.getBadges();
  const userBadges = await storage.getUserBadges(userId);
  const userBadgeIds = new Set(userBadges.map(ub => ub.badgeId));
  
  // Check First CoT badge
  const cotBadge = allBadges.find(b => b.name === 'First CoT Prompt');
  if (cotBadge && !userBadgeIds.has(cotBadge.id)) {
    if (await BADGE_CONDITIONS.FIRST_COT(userId)) {
      await storage.awardBadge(userId, cotBadge.id);
    }
  }
  
  // Check Reviewer badge (reputation >= 500)
  const reviewerBadge = allBadges.find(b => b.name === 'Reviewer');
  if (reviewerBadge && !userBadgeIds.has(reviewerBadge.id)) {
    if (await BADGE_CONDITIONS.REPUTATION_500(userId)) {
      await storage.awardBadge(userId, reviewerBadge.id);
    }
  }
  
  // Check Moderator badge (reputation >= 2000)
  const moderatorBadge = allBadges.find(b => b.name === 'Moderator');
  if (moderatorBadge && !userBadgeIds.has(moderatorBadge.id)) {
    if (await BADGE_CONDITIONS.REPUTATION_2000(userId)) {
      await storage.awardBadge(userId, moderatorBadge.id);
    }
  }
}

// Initialize default badges in database
export async function initializeDefaultBadges() {
  const existingBadges = await storage.getBadges();
  
  const defaultBadges = [
    {
      name: 'First CoT Prompt',
      description: 'Created your first Chain-of-Thought prompt that was approved',
      iconUrl: null,
    },
    {
      name: 'Reviewer',
      description: 'Achieved 500+ reputation and can participate in peer reviews',
      iconUrl: null,
    },
    {
      name: 'Moderator',
      description: 'Achieved 2000+ reputation and can moderate content',
      iconUrl: null,
    },
    {
      name: 'First Contribution',
      description: 'Made your first contribution to Issuepedia',
      iconUrl: null,
    },
  ];
  
  for (const badge of defaultBadges) {
    const exists = existingBadges.some(b => b.name === badge.name);
    if (!exists) {
      await storage.createBadge(badge);
    }
  }
}
