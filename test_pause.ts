import { ConvexHttpClient } from "convex/browser";
const client = new ConvexHttpClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

async function run() {
  console.log("Fetching todos...");
  const res = await fetch(process.env.EXPO_PUBLIC_CONVEX_URL!.replace("convex.cloud", "convex.site") + "/api/any_query_here");
}
