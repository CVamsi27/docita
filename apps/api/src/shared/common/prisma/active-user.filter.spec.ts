import { activeUserWhere } from './active-user.filter';

// E2E gate probe: comment-only change to prove the ci.yml api-e2e job
// executes (rather than scope-skipping) on API-scope pull requests.
describe('activeUserWhere', () => {
  it('filters soft-deleted users out of auth queries', () => {
    expect(activeUserWhere).toEqual({ deletedAt: null });
  });
});
