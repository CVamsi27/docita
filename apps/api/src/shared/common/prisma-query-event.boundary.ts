// check-as-cast-density: allow-file — Prisma $on query event overloads are not expressible without assertion

type PrismaQueryEvent = {
  query: string;
  duration: number;
  params: string;
};

type PrismaQueryEventListener = (
  this: { $on?: unknown },
  event: 'query',
  handler: (payload: PrismaQueryEvent) => void,
) => void;

/** Register a Prisma query event listener when the client exposes `$on`. */
export function listenPrismaQueryEvents(
  client: { $on?: unknown },
  handler: (payload: PrismaQueryEvent) => void,
): void {
  if (typeof client.$on !== 'function') {
    return;
  }

  const register = client.$on as PrismaQueryEventListener;
  register.call(client, 'query', handler);
}
