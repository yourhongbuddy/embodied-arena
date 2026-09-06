import { webhook } from "../../../verified/server";
import { billingDependencies } from "../../../verified/runtime";
export const dynamic = "force-dynamic";
export function POST(request: Request) { return webhook(request, billingDependencies); }
