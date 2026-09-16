import Planner from "@/components/planner";
import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
 const user=await getChatGPTUser();
 return <Planner signedIn={!!user} signInUrl={chatGPTSignInPath("/")} />;
}
