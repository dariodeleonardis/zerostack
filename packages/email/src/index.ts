import { render } from "react-email";
import * as React from "react";

export * from "./NewsletterEmail";
export * from "./WelcomeEmail";
export * from "./SubscriptionConfirmationEmail";
export * from "./PasswordResetEmail";
export * from "./VerifyEmail";

export async function renderEmail(component: React.ReactElement): Promise<string> {
  return render(component);
}
export * from "./transport";
export * from "./messages";
