import { hostname } from 'os';

/**
 * Run the bot without posting comments. Primarily for testing.
 */
export const isCommentingDisabled = hostname() === 'sean-ubuntu';

/**
 * ID of the change my view community.
 */
export const communityId = '177b549f4e8a6b2e36c80f82';

/**
 * The community description.
 */
export const communityDescription = `A place to post opinions you want challenged.

OP makes a post to have an opinion challenged, i.e. "Hot dogs taste better with ketchup." Everyone else tries to change OP's view.

Any user (OP or not) should reply with a !delta when their view has been changed in order to give the other person a delta ∆ award. A leaderboard will be kept of users with the most deltas.

Wiki https://discuit.wiki/changemyview/home

**Leaderboard**
{{ leaderboard }}

Complete leaderboard at https://changemyview.org/`;

/**
 * Delta symbol.
 */
export const delta = '∆';

/**
 * String that triggers the bot.
 */
export const deltaTrigger = '!delta';
