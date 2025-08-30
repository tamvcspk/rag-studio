import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { DesignTokenService, DesignTokenConfig } from './design-tokens.service';

export function provideDesignTokens(config?: DesignTokenConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    DesignTokenService,
    {
      provide: 'DESIGN_TOKEN_CONFIG',
      useValue: config || {}
    },
    {
      provide: 'DESIGN_TOKEN_INITIALIZER',
      useFactory: (tokenService: DesignTokenService, tokenConfig: DesignTokenConfig) => {
        return () => {
          if (tokenConfig.overrides) {
            tokenService.updateTokens(tokenConfig.overrides);
          }
        };
      },
      deps: [DesignTokenService, 'DESIGN_TOKEN_CONFIG'],
      multi: true
    }
  ]);
}