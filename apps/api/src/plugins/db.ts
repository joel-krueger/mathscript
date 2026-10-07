import fp from 'fastify-plugin';
import { createPrismaClient, type PrismaClient } from '../db.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** Prisma client for the app database. */
    db: PrismaClient;
  }
}

export interface DbPluginOptions {
  /** Connection URL used to create a new client (ignored when `client` is given). */
  databaseUrl?: string;
  /**
   * An existing client to expose as `app.db`. The caller owns it, so the plugin does
   * not disconnect it when the app closes.
   */
  client?: PrismaClient;
}

/** Decorates the app with `app.db` and disconnects the client it created on close. */
export const dbPlugin = fp<DbPluginOptions>(
  async (app, opts) => {
    let client = opts.client;
    if (!client) {
      if (!opts.databaseUrl) throw new Error('dbPlugin: pass either `databaseUrl` or `client`');
      const owned = createPrismaClient(opts.databaseUrl);
      app.addHook('onClose', async () => {
        await owned.$disconnect();
      });
      client = owned;
    }
    app.decorate('db', client);
  },
  { name: 'db' },
);
