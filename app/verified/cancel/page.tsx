import { PaymentResult } from "../PaymentResult";
export default async function Page({ searchParams }: { searchParams: Promise<{ application?: string }> }) { const params = await searchParams; return <PaymentResult reference={typeof params.application === "string" ? params.application : ""} cancelled />; }
