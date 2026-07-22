export class SynchronizationPolicy {
  constructor(
    public readonly enabled: boolean,
    public readonly intervalMinutes: number | null,
    public readonly supportsIncrementalSync: boolean,
  ) {}

  static disabled(): SynchronizationPolicy {
    return new SynchronizationPolicy(false, null, false);
  }
}
