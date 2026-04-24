/**
 * Vercel serverless entry point.
 *
 * Wraps the existing Express app from `@workspace/api-server` so the same
 * codebase serves requests both in local dev (Express listening on PORT) and
 * on Vercel (each request invokes this function).
 *
 * Vercel routes `/api` and `/api/*` here via the rewrites in `vercel.json`,
 * preserving the original path on `req.url` so the Express router mounted at
 * `/api` matches as expected.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../artifacts/api-server/src/app";

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
    req,
    res,
  );
}
