import { EnvironmentProviders, makeEnvironmentProviders, APP_INITIALIZER } from '@angular/core';
import { DesignTokenService, DesignTokenConfig } from './design-tokens.service';

export function provideDesignTokens(config?: DesignTokenConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    DesignTokenService,
    {
      provide: APP_INITIALIZER,
      useFactory: (tokenService: DesignTokenService) => {
        return () => {
          if (config?.overrides) {
            tokenService.updateTokens(config.overrides);
          }
        };
      },
      deps: [DesignTokenService],
      multi: true
    }
  ]);
}