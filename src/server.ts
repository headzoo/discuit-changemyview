import express, { Request, Response } from 'express';
import basicAuth from 'express-basic-auth';
import path from 'path';
import { logger } from './logger';
import { Award } from './modals';
import { generateLeaderboard, communityDescription } from './utils';
import packageJson from '../package.json';

if (!process.env.DISCUIT_ADMIN_USERNAME || !process.env.DISCUIT_ADMIN_PASSWORD) {
  logger.error('Missing DISCUIT_ADMIN_USERNAME or DISCUIT_ADMIN_PASSWORD');
  process.exit(1);
}

const app = express();
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'twig');
app.set('twig options', {
  allowAsync: true, // Allow asynchronous compiling
  strict_variables: false,
});

const auth = basicAuth({
  users: {
    [process.env.DISCUIT_ADMIN_USERNAME]: process.env.DISCUIT_ADMIN_PASSWORD,
  },
  challenge: true,
  realm: 'autotldr',
});

/**
 * Homepage.
 */
app.get('/', async (req: Request, res: Response) => {
  const leaders = await generateLeaderboard(500);

  res.render('index.html.twig', {
    activeTab: 'home',
    leaders,
  });
});

/**
 * Admin page.
 */
app.get('/theshadows', auth, async (req: Request, res: Response) => {
  const rows = await Award.findAll({
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  const awards: any = [];
  for (let i = 0; i < rows.length; i++) {
    awards.push(rows[i].dataValues);
  }

  const leaders = (await generateLeaderboard(10)).join('\n');
  const about = communityDescription.replace('{{ leaderboard }}', leaders);

  res.render('theshadows/index.html.twig', {
    shadows: true,
    version: packageJson.version,
    activeTab: 'home',
    about,
    awards,
  });
});

/**
 * Deletes an award.
 */
app.delete('/theshadows/awards/:id', auth, async (req: Request, res: Response) => {
  const award = await Award.findOne({
    where: {
      id: req.params.id,
    }
  });
  if (!award) {
    return res.status(404).send('Not found');
  }

  await award.destroy();

  return res.status(200).send('OK');
});

/**
 * Starts the admin web server.
 */
export const runAdminSite = (): Promise<void> => {
  if (!process.env.DISCUIT_ADMIN_PORT) {
    logger.error('Missing DISCUIT_ADMIN_PORT');
    process.exit(1);
  }

  app.listen(process.env.DISCUIT_ADMIN_PORT, () => {
    console.log(`Listening on port ${process.env.DISCUIT_ADMIN_PORT}`);
  });

  return Promise.resolve();
};
