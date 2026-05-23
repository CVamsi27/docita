describe('worker entrypoint', () => {
  it('defaults WORKER_ENTRYPOINT for worker process', () => {
    expect(process.env.WORKER_ENTRYPOINT ?? 'worker').toBe('worker');
  });
});
