import { Discuit, Comment } from '@headz/discuit';
import { createRedis, Redis } from './redis';
import { RedisSeenChecker } from './RedisSeenChecker';
import { logger } from './logger';
import { Award } from './modals';
import { eventDispatcher } from './events';
import { generateLeaderboard, containsDelta } from './utils';
import { communityId, communityDescription, isCommentingDisabled } from './constants';

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
    discuit.setLogger(logger);
    discuit.watchTimeout = 1000 * 60 * 5; // 5 minutes
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
 * Watches for new comments in changemyview.
 */
export const runDiscuitWatch = async () => {
  if (!process.env.DISCUIT_USERNAME) {
    logger.error('Missing DISCUIT_USERNAME');
    process.exit(1);
  }

  const redis = await createRedis();
  const discuit = await createDiscuit(redis);
  await redis.incr('discuit-changemyview-run-count');

  /**
   * Currently have to manually add the leaderboard to the community description because
   * the api endpoint isn't working. This displays the leaderboard, so I can copy & paste it.
   */
  const displayLeaderboard = async () => {
    try {
      const leaderboard = (await generateLeaderboard()).join('\n');
      const about = communityDescription.replace('{{ leaderboard }}', leaderboard);
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

  /**
   * Watches for new comments.
   */
  const watch = async (): Promise<void> => {
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

      const post = await discuit.getPost(comment.postPublicId);
      if (!post) {
        logger.error('Missing post.');
        return;
      }

      const award = await Award.findOne({
        where: {
          community,
          awardeeUsername: parent.username,
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
        postTitle: post.title,
        commentId: comment.id,
        postId: comment.postPublicId,
        awardeeUsername: parent.username,
        awardeeCommentId: parent.id,
      });
      if (!isCommentingDisabled) {
        const total = await Award.count({
          where: {
            awardeeUsername: parent.username,
          }
        });

        await discuit.postComment(
          comment.postPublicId,
          `You awarded a delta ∆ to @${parent.username}. They now have ${total} delta ∆ award(s).`,
          comment.id,
          'mods'
        );
      }

      await displayLeaderboard();
    });
  };

  // Listen for the admin site reloading the list of communities.
  eventDispatcher.on('reload', async () => {
    logger.debug('Reloading');
    discuit.unwatchComments();
    await watch();
  });

  await watch();
};
