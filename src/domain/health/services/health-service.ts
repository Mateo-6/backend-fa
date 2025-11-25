export class HealthService {
  /**
   * Produces a simple service status snapshot including uptime and timestamp metrics.
   *
   * @returns {{ status: string; uptime: number; timestamp: number }} Health information.
   */
  public check(): { status: string; uptime: number; timestamp: number } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
    };
  }
}