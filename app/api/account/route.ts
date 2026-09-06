import { getD1 } from "../../../db/d1";
import { getChatGPTUser } from "../../chatgpt-auth";
import { sitesAuthEnabled } from "../../account/auth-mode";
import { handleProfile } from "../../account/profile-handler";

export const dynamic = "force-dynamic";
const dependencies = { authEnabled: sitesAuthEnabled, getUser: getChatGPTUser, getDB: getD1 };
export function GET(request: Request) { return handleProfile(request, dependencies); }
export function PUT(request: Request) { return handleProfile(request, dependencies); }
export function DELETE(request: Request) { return handleProfile(request, dependencies); }
