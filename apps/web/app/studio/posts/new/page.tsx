import { PostEditor } from "../../../../components/PostEditor";
import { requireUser } from "../../../../lib/auth";
import { editorPublications } from "../../../../lib/studio";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const user = await requireUser("/studio/posts/new");
  return <PostEditor publications={await editorPublications(user.id)} />;
}
