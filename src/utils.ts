import { sequelize } from './sequelize';
import { Award } from './modals';

/**
 * Delta symbol.
 */
export const delta = '∆';

/**
 * String that triggers the bot.
 */
export const deltaTrigger = '!delta';

/**
 * The community description.
 */
export const communityDescription = `A place to post opinions you want challenged.

OP makes a post to have an opinion challenged, i.e. "Hot dogs taste better with ketchup." Everyone else tries to change OP's view.

Any user (OP or not) should reply with a !delta when their view has been changed in order to give the other person a delta ∆ award. A leaderboard will be kept of users with the most deltas.

**Leaderboard**
{{ leaderboard }}

Complete leaderboard at https://changemyview.org/`;

/**
 * Generates the leaderboard.
 *
 * @param limit Max number of results.
 */
export const generateLeaderboard = async (limit = 10): Promise<string[]> => {
  const awards = await Award.findAll({
    attributes: ['awardeeUsername', [
      sequelize.fn('COUNT', sequelize.col('awardeeUsername')), 'awards']
    ],
    group: ['awardeeUsername'],
    order: [
      [sequelize.fn('COUNT', sequelize.col('awardeeUsername')), 'DESC']
    ],
    limit,
  });

  const leaderboard: string[] = [];
  for (let i = 0; i < awards.length; i++) {
    const award = awards[i];
    leaderboard.push(`${i + 1}. @${(award as any).awardeeUsername} (${award.dataValues.awards} ${delta})`);
  }

  return leaderboard;
}

/**
 * Returns a boolean value indicating whether the given string contains a delta.
 *
 * It excludes lines that start with `>`, which are blockquotes.
 *
 * @param str The string to check.
 */
export const containsDelta = (str: string): boolean => {
  const lines = str.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().indexOf('>') === 0) {
      continue;
    }

    if (line.includes(delta) || line.includes(deltaTrigger)) {
      return true;
    }
  }

  return false;
}
