import { Injectable, signal, computed, effect } from '@angular/core';
import { 
  RagTokens, 
  injectDesignTokens, 
  generateCSSVariables, 
  flattenTokens,
  CSS_VAR_PREFIX 
} from './design-tokens';

export interface DesignTokenOverrides {
  primitive?: Partial<typeof RagTokens.primitive>;
  semantic?: Partial<typeof RagTokens.semantic>;
  archetypes?: Partial<typeof RagTokens.archetypes>;
}

export interface DesignTokenConfig {
  overrides?: DesignTokenOverrides;
}

@Injectable({
  providedIn: 'root'
})
export class DesignTokenService {
  private readonly _overrides = signal<DesignTokenOverrides>({});
  
  readonly overrides = this._overrides.asReadonly();
  
  readonly effectiveTokens = computed(() => {
    const overrides = this._overrides();
    return {
      primitive: { ...RagTokens.primitive, ...overrides.primitive },
      semantic: { ...RagTokens.semantic, ...overrides.semantic },
      archetypes: { ...RagTokens.archetypes, ...overrides.archetypes }
    };
  });
  
  readonly cssVariables = computed(() => {
    return generateCSSVariables(this.effectiveTokens());
  });

  constructor() {
    // Auto-inject tokens when they change
    effect(() => {
      this.injectTokensToDOM();
    });
  }

  updateTokens(overrides: DesignTokenOverrides): void {
    this._overrides.set({ ...this._overrides(), ...overrides });
    this.injectTokensToDOM();
  }

  resetTokens(): void {
    this._overrides.set({});
  }

  getToken(path: string): string {
    const flattened = flattenTokens(this.effectiveTokens());
    return flattened[path] || '';
  }

  getCSSVariable(path: string): string {
    return `var(--${CSS_VAR_PREFIX}-${path.replace(/\./g, '-')})`;
  }

  private injectTokensToDOM(): void {
    if (typeof document === 'undefined') return;
    
    const cssContent = this.cssVariables();
    const styleContent = `:root {\n${cssContent}\n}`;
    
    const styleId = `${CSS_VAR_PREFIX}-design-tokens-service`;
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = styleContent;
  }
}