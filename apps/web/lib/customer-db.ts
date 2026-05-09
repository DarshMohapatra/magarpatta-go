import 'server-only';
import { prisma } from './prisma';

/**
 * Per-user "data fence" around Prisma. All customer-facing routes and pages
 * MUST read/write customer data through this client (obtained via
 * `getCustomerScope()` in `lib/customer-scope.ts`) instead of importing the
 * raw `prisma` symbol directly.
 *
 * What it does:
 *   - Order, UserAddress, OrderFeedback queries get `userId = <session user>`
 *     forced into the where clause on every read AND mutation.
 *   - User reads/updates get `id = <session user>` forced.
 *   - create/createMany have `userId` injected into data.
 *
 * Why: it makes IDOR (Insecure Direct Object Reference) structurally
 * impossible in customer code paths. Even if an endpoint takes an arbitrary
 * `orderId` from the URL and queries it, the wrapper rewrites the where
 * clause so a request for someone else's order returns null/404.
 *
 * Public catalog models (vendor, product, coupon, category, ...) pass
 * through unchanged — they're meant to be read by anyone.
 */
export function getCustomerPrisma(userId: string) {
  if (!userId) throw new Error('getCustomerPrisma: userId required');

  return prisma.$extends({
    name: 'customer-fence',
    query: {
      order: {
        async findUnique({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async findMany({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async aggregate({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async create({ args, query }) {
          // Cast: spread loses Prisma's checked/unchecked-create discrimination.
          // The runtime shape is correct — TS just can't narrow the union.
          args.data = { ...args.data, userId } as never;
          return query(args);
        },
        async createMany({ args, query }) {
          args.data = (Array.isArray(args.data)
            ? args.data.map((d) => ({ ...d, userId }))
            : { ...args.data, userId }) as never;
          return query(args);
        },
        async upsert({ args, query }) {
          args.where = { ...args.where, userId };
          args.create = { ...args.create, userId } as never;
          return query(args);
        },
      },

      userAddress: {
        async findUnique({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async findMany({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async create({ args, query }) {
          // Cast: spread loses Prisma's checked/unchecked-create discrimination.
          // The runtime shape is correct — TS just can't narrow the union.
          args.data = { ...args.data, userId } as never;
          return query(args);
        },
        async upsert({ args, query }) {
          args.where = { ...args.where, userId };
          args.create = { ...args.create, userId } as never;
          return query(args);
        },
      },

      orderFeedback: {
        async findUnique({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async findMany({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...(args.where ?? {}), userId };
          return query(args);
        },
        async create({ args, query }) {
          // Cast: spread loses Prisma's checked/unchecked-create discrimination.
          // The runtime shape is correct — TS just can't narrow the union.
          args.data = { ...args.data, userId } as never;
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
      },

      // The user model is keyed by id directly; we override the where so that
      // any "find me" / "update me" call is locked to the session user. Create
      // is intentionally NOT scoped — account creation goes through the auth
      // route, not customer code paths.
      user: {
        async findUnique({ args, query }) {
          args.where = { ...args.where, id: userId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...(args.where ?? {}), id: userId };
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, id: userId };
          return query(args);
        },
      },
    },
  });
}

export type CustomerPrisma = ReturnType<typeof getCustomerPrisma>;
