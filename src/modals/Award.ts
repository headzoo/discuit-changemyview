import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize';

/**
 * Modal for the awards.
 */
export const Award = sequelize.define(
  'awards',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    community: {
      type: DataTypes.STRING,
    },
    postTitle: {
      type: DataTypes.STRING,
    },
    postId: {
      type: DataTypes.STRING,
    },
    commentId: {
      type: DataTypes.STRING,
    },
    awardeeUsername: {
      type: DataTypes.STRING,
    },
    awardeeCommentId: {
      type: DataTypes.STRING,
    }
  },
  {
    timestamps: true,
    createdAt: true,
    updatedAt: false,
  },
);
