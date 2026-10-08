import { savePost } from "../../../lib/post-save";

export async function POST(req: Request) {
  return savePost(req);
}
