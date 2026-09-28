import { Logger } from '@nestjs/common';

const SUBZERO_URL = process.env.SUBZERO_URL ?? 'https://api.sub-zero.dev/incidents/external';
const PROJECT_KEY = process.env.SUBZERO_PROJECT_KEY ?? 'TRELLO';
const INGEST_KEY = process.env.SUBZERO_INGEST_KEY ?? '';
const SERVICE = 'TRELLO-CLONE-API';

/**
 * How long one subject stays quiet after it is reported.
 *
 * A broken endpoint is rediscovered by every request that touches it. One
 * incident per window is the signal; fifty is noise that gets muted by whoever
 * is on call, which is worse than silence.
 */
const REPEAT_AFTER_MS = 10 * 60 * 1000;

/**
 * Files a SubZero incident when the API fails in a way nobody asked it to.
 *
 * Only unhandled failures — a 500 — are reported. A 404, a rejected login or a
 * validation error is the API doing its job, and a queue full of those teaches
 * everyone to ignore the queue.
 *
 * Every failure here is swallowed: an error reporter that throws would take
 * down the request it was reporting on.
 */
export class SubZeroNotifier {
  private static readonly logger = new Logger('SubZeroNotifier');
  private static readonly mutedUntil = new Map<string, number>();

  static report(params: {
    subject: string;
    method: string;
    path: string;
    error: unknown;
    userId?: string;
  }): void {
    const { subject, method, path, error, userId } = params;

    const mutedUntil = this.mutedUntil.get(subject);
    if (mutedUntil && Date.now() < mutedUntil) return;
    this.mutedUntil.set(subject, Date.now() + REPEAT_AFTER_MS);

    const stack = error instanceof Error ? (error.stack ?? error.message) : String(error);
    const description = [
      `${method} ${path} failed with an unhandled error.`,
      userId ? `User: ${userId}` : 'User: unauthenticated',
      '',
      stack,
    ].join('\n');

    void fetch(SUBZERO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(INGEST_KEY ? { Authorization: `Bearer ${INGEST_KEY}` } : {}),
      },
      body: JSON.stringify({
        projectKey: PROJECT_KEY,
        subject: `[AUTOMATION] : ${subject}`,
        service: SERVICE,
        description,
        priority: 'P2',
      }),
    })
      .then((res) => {
        if (res.ok) {
          this.logger.log(`SubZero incident raised: ${subject}`);
          return;
        }
        // A refused report is worth retrying on the next failure rather than
        // sitting on a mute for something SubZero never received.
        this.mutedUntil.delete(subject);
        this.logger.warn(`SubZero refused the incident (${res.status}): ${subject}`);
      })
      .catch((err: unknown) => {
        this.mutedUntil.delete(subject);
        this.logger.warn(
          `Could not reach SubZero for "${subject}": ${err instanceof Error ? err.message : String(err)}`,
        );
      });
  }
}
