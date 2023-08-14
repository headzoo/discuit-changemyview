import { Sequelize } from 'sequelize';
import { sequelize } from './sequelize';
import { Award } from './modals';

/**
 * Sets up the database and returns a Sequelize instance.
 */
export const createDatabase = async (): Promise<Sequelize> => {
  await Award.sync({ alter: true });

  return sequelize;
};
