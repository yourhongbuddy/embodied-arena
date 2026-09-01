import{experimentAssignmentLabContract}from"../assignment-lab.ts";

export function GET(){return Response.json(experimentAssignmentLabContract,{headers:{"cache-control":"public, max-age=3600"}})}
