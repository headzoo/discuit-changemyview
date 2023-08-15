import { hostname } from 'os';
import { Discuit, Comment } from '@headz/discuit';
import { createRedis, Redis } from './redis';
import { RedisSeenChecker } from './RedisSeenChecker';
import { logger } from './logger';
import { Award } from './modals';
import { generateLeaderboard, containsDelta } from './utils';

/**
 * Run the bot without posting comments. Primarily for testing.
 */
const isCommentingDisabled = hostname() === 'sean-ubuntu';

/**
 * ID of the change my view community.
 */
const communityId = '177b549f4e8a6b2e36c80f82';

/**
 * The community description.
 */
const communityDescription = `A place to post opinions you want challenged.

Any user (OP or not) should reply to comments with !delta when their view has been changed in order to give the other person a delta ∆ award. A leaderboard will be kept of users with the most deltas.`;

/**
 * Creates a new Discuit instance and logs in the bot.
 */
export const createDiscuit = async (redis: Redis): Promise<Discuit> => {
  if (!process.env.DISCUIT_USERNAME || !process.env.DISCUIT_PASSWORD) {
    logger.error('Missing DISCUIT_USERNAME or DISCUIT_PASSWORD');
    process.exit(1);
  }

  try {
    const discuit = new Discuit();
    discuit.logger = logger;
    discuit.watchTimeout = 1000 * 60 * 10; // 10 minutes
    discuit.seenChecker = new RedisSeenChecker(redis);
    const bot = await discuit.login(process.env.DISCUIT_USERNAME, process.env.DISCUIT_PASSWORD);
    if (!bot) {
      logger.error('Failed to login');
      process.exit(1);
    }

    return discuit;
  } catch (error) {
    logger.error('Failed to login');
    process.exit(1);
  }
};

/**
 * Watches for new posts in the given communities.
 */
export const runDiscuitWatch = async () => {
  const redis = await createRedis();
  const discuit = await createDiscuit(redis);
  await redis.incr('discuit-changemyview-run-count');

  if (!process.env.DISCUIT_USERNAME) {
    logger.error('Missing DISCUIT_USERNAME');
    process.exit(1);
  }

  /**
   * Currently have to manually add the leaderboard to the community description because
   * the api endpoint isn't working. This displays the leaderboard, so I can copy & paste it.
   */
  const displayLeaderboard = async () => {
    try {
      const leaderboard = (await generateLeaderboard()).join('\n');
      const about = `${communityDescription}\n\n**Leaderboard**\n${leaderboard}`;
      console.log(`----\n${about}\n----`);
      /*const c = await discuit.getCommunity(communityId);
      if (!c) {
        logger.error('Missing community.');
        return;
      }*/
    } catch (error) {
      // @ts-ignore
      console.log(error.response);
    }
  }

  await displayLeaderboard();

  discuit.watchComments([communityId], async (community: string, comment: Comment) => {
    if (comment.username === process.env.DISCUIT_USERNAME) {
      logger.debug('Found comment from the bot.');
      return;
    }
    if (!comment.parentId || !containsDelta(comment.body)) {
      logger.debug(`No delta found ${comment.id}`);
      return;
    }

    if (comment.body.length < 50) {
      if (!isCommentingDisabled) {
        await discuit.postComment(
          comment.postPublicId,
          'Cannot give delta Δ because your comment is too short. Please provide a reason for awarding the delta Δ.',
          comment.id,
          'mods'
        );
      }
      logger.debug(`Comment too short ${comment.id}`);
      return;
    }

    const parent = await discuit.getComment(comment.parentId);
    if (!parent) {
      logger.error('Missing parent.');
      return;
    }
    if (comment.username === parent.username) {
      logger.debug('Found comment from the same user.');
      return;
    }

    const award = await Award.findOne({
      where: {
        community,
        commentId: comment.id,
        postId: comment.postId,
      }
    });
    if (award) {
      logger.debug(`Already awarded @${comment.username}`);
      return;
    }

    logger.info(`Awarded https://discuit.net/${community}/post/${comment.postPublicId}/${comment.id}`);
    await Award.create({
      community,
      commentId: comment.id,
      postId: comment.postId,
      awardeeUsername: parent.username,
      awardeeCommentId: parent.id,
    });
    if (!isCommentingDisabled) {
      await discuit.postComment(
        comment.postPublicId,
        `You awarded a delta ∆ to @${parent.username}.`,
        comment.id,
        'mods'
      );
    }

    await displayLeaderboard();
  });
};
