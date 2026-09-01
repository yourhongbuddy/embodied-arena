import { experimentRotatorContract } from "../experiments/rotator.ts";
import { experimentAssignmentReceiptContract } from "../experiments/assignment-receipt.ts";

export async function GET() {
  return Response.json({...experimentRotatorContract,assignment_receipt:experimentAssignmentReceiptContract}, { headers: { "cache-control": "public, max-age=300" } });
}
