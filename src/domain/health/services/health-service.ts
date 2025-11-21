export class HealthService {
  public check(): { status: string; uptime: number; timestamp: number } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
    };
  }
}