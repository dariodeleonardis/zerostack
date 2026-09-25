import { render } from "@react-email/render";
import * as React from "react";

export * from "./NewsletterEmail";
export * from "./WelcomeEmail";
export * from "./SubscriptionConfirmationEmail";

export async function renderEmail(component: React.ReactElement): Promise<string> {
  return render(component);
}
