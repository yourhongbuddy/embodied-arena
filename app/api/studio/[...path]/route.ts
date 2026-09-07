import { handleStudioRequest } from "../../../studio/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => handleStudioRequest(request);
export const POST = (request: Request) => handleStudioRequest(request);
export const PUT = (request: Request) => handleStudioRequest(request);
export const DELETE = (request: Request) => handleStudioRequest(request);
export const OPTIONS = (request: Request) => handleStudioRequest(request);
