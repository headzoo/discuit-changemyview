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
