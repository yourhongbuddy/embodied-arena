import { redirect } from "next/navigation";
import { dailyExperienceForDate } from "./daily-rotation";

export const dynamic = "force-dynamic";

export default function Home(){redirect(dailyExperienceForDate().path)}
