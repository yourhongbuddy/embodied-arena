import { status } from "../../../verified/server";
import { billingDependencies } from "../../../verified/runtime";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return status(request, billingDependencies); }
