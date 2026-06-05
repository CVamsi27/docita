# WebSocket scaling boundary

The current Socket.io gateways are appropriate while a single API replica owns
the connected clients for a deployment. React Query remains the browser-side
source of server state; socket messages only trigger invalidation.

## Before horizontal API scaling

Choose and verify one of these deployment strategies:

1. Route a reconnecting client consistently with load-balancer affinity and
   accept that broadcasts still need cross-replica delivery.
2. Introduce a Socket.io-compatible pub/sub adapter so every API replica sees
   broadcast events.

Sticky sessions alone are insufficient for fan-out: a mutation handled by one
replica must invalidate clients connected to another replica.

## Verification matrix

- Connect two clients through different API replicas.
- Trigger appointment, payment, and notification invalidation events.
- Confirm both clients receive the event and refetch through React Query.
- Restart one replica and confirm reconnect behavior.
- Confirm socket payloads contain identifiers and event metadata only, not PHI
  snapshots.

## Adoption trigger

Do not add a pub/sub dependency preemptively. Add it before running more than
one socket-serving API replica in an environment where cross-replica
invalidation matters, or after monitoring proves missed invalidations.
