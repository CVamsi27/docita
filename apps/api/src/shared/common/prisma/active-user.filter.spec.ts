import { activeUserWhere } from './active-user.filter';

describe('activeUserWhere', () => {
  it('filters soft-deleted users out of auth queries', () => {
    expect(activeUserWhere).toEqual({ deletedAt: null });
  });
});
