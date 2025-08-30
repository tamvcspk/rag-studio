import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { appConfig } from "./app/app.config";
import { injectDesignTokens } from "./app/shared/tokens/design-tokens";

// Initialize design tokens before app bootstrap
injectDesignTokens();

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
