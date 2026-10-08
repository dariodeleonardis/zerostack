import { savePost } from "../../../../lib/post-save";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return savePost(req, params.id);
}
