import React from "react";
import { prisma } from "@zerostack/database";
import { requireUser } from "../../../lib/auth";
import { ProfileForms } from "./ProfileForms";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireUser("/account/profile");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { name: true, email: true, handle: true, bio: true, avatarUrl: true, emailVerified: true }
  });
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-black text-gray-900">Il tuo account</h1>
      <ProfileForms profile={{ ...user, emailVerified: Boolean(user.emailVerified) }} />
    </div>
  );
}
