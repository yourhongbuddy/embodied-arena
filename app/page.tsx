import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isDispatchHost } from "./news/domain";
import { Newsroom } from "./news/Newsroom";

export const dynamic = "force-dynamic";

export default async function Home(){
  if (isDispatchHost((await headers()).get("host"))) return <Newsroom />;
  redirect("/studio");
}
