import{experimentDesignLabContract}from"../design-lab.ts";

export function GET(){return Response.json(experimentDesignLabContract,{headers:{"cache-control":"public, max-age=3600"}})}
