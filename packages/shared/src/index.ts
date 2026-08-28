export class ForgeTrackError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
    public readonly details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'ForgeTrackError';
  }
}
