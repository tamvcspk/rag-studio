# RAG Studio Semantic Components Library

Comprehensive documentation for the semantic UI components that provide higher-level, domain-specific functionality built on top of atomic components.

## 📋 Overview

Semantic components are composed UI elements that encapsulate specific business logic and user interactions. They combine multiple atomic components to create meaningful, reusable patterns specific to the RAG Studio application domain.

### Component Architecture

```
Semantic Components (Domain-specific, business logic)
    ↓ compose
Atomic Components (Basic UI primitives)  
    ↓ use
Design Tokens (Consistent styling)
    ↓ organized by
Component Archetype Patterns (Standardized interaction patterns)
```

## 🎨 Enhanced Archetype System

Our semantic components now fully utilize the **archetype system** - standardized design patterns that provide consistent styling and behavior across similar component types:

### 🎭 Overlay Archetype
Components that appear above content:
- **Dialog**: Modal dialogs with backdrop, header, content, and footer styling
- **Dropdown**: Contextual menus with container, item states, and separators
- **Context Menu**: Right-click menus using dropdown archetype patterns

### 🧭 Navigation Archetype
Components for app navigation:
- **Tabs**: Content switching with container and trigger state styling
- **Breadcrumb**: Hierarchical navigation with item states and separators
- **Stepper**: Multi-step progress indication with completion states
- **Sidebar**: Main navigation menu

### 📋 Data Display Archetype
Components for presenting data:
- **Card**: Content containers using card archetype variants
- **Stat Card**: Metrics display with card archetype foundation
- **Code Block**: Code presentation
- **Stats Overview**: Statistics display with comprehensive archetype styling for containers, items, icons, and loading states

### � Form Archetype
Components for data input:
- **Form Field**: Wrapper with label, description, error, and required indicator styling
- **Search Input**: Search-specific input patterns
- **Version Input**: Version number input
- **Cron Input**: Cron expression builder

### Status Update: Component Archetype Integration

✅ **Completed**: All overlay components (dialog, dropdown, context-menu) now use archetype patterns  
✅ **Completed**: All navigation components (tabs, breadcrumb) now use archetype patterns  
✅ **Completed**: Data display components (card, stat-card) now use archetype patterns  
✅ **Completed**: Form components (form-field) now use archetype patterns  

All semantic components have been updated to use the enhanced archetype system for consistent styling and behavior patterns.
Components for presenting data:
- **Card**: Content container
- **Table**: Tabular data display
- **List**: Item collections

### 🎭 Overlay Archetype
Components that appear above content:
- **Modal**: Focused interactions
- **Dialog**: Confirmations/forms
- **Dropdown**: Contextual content

For detailed archetype documentation and implementation details, see [ARCHETYPE_SYSTEM.md](../src/app/shared/tokens/archetypes/ARCHETYPE_SYSTEM.md).

### Categories

| Category | Components | Purpose |
|----------|------------|---------|
| **Data Display** | 6 components | Presenting information and data visualization |
| **Forms** | 7 components | Advanced form controls and input patterns |
| **Navigation** | 5 components | User navigation and wayfinding |
| **Overlay** | 3 components | Modal dialogs, dropdowns, and layered content |

---

## 📊 Data Display Components

### RagCard
**Purpose**: Container component for grouping related content with consistent styling and interaction states.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `variant` | `'default' \| 'elevated' \| 'floating'` | `'default'` | Visual style variant |
| `padding` | `boolean` | `true` | Apply internal padding |
| `interactive` | `boolean` | `false` | Enable hover/focus interactions |
| `loading` | `boolean` | `false` | Show loading overlay with spinner |
| `loadingText` | `string` | `'Loading...'` | Text displayed during loading state |

#### Usage
```html
<!-- Basic card -->
<rag-card>
  <h3>Card Title</h3>
  <p>Card content goes here...</p>
</rag-card>

<!-- Elevated interactive card -->
<rag-card variant="elevated" [interactive]="true">
  <div>Clickable card content</div>
</rag-card>

<!-- Floating card without padding -->
<rag-card variant="floating" [padding]="false">
  <img src="image.jpg" alt="Full width image">
</rag-card>

<!-- Loading card with custom text -->
<rag-card [loading]="isLoading()" loadingText="Processing data...">
  <h3>Data Processing</h3>
  <p>This content will be dimmed while loading</p>
</rag-card>
```

#### Variants
- **Default**: Subtle shadow, standard appearance
- **Elevated**: Prominent shadow, elevated appearance  
- **Floating**: Enhanced shadow with floating effect

#### Loading States
The RagCard component includes built-in loading functionality:
- **Loading Overlay**: Semi-transparent overlay with centered spinner
- **Content Dimming**: Card content becomes dimmed (opacity 0.3) during loading
- **Custom Loading Text**: Configurable loading message
- **Smooth Transitions**: Loading states fade in/out smoothly
- **No Skeleton**: Uses spinner overlay instead of skeleton placeholders for cleaner UX

---

### RagStatCard
**Purpose**: Display key metrics and statistics with trend indicators and visual hierarchy.

#### Props
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `data` | `StatCardData` | ✅ | Metric data and configuration |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `variant` | `'default' \| 'minimal'` | `'default'` | Visual style |

#### StatCardData Interface
```typescript
interface StatCardData {
  label: string;                    // Metric label
  value: string | number;           // Main value
  change?: {                        // Optional trend data
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: string;                    // Lucide icon name
}
```

#### Usage
```html
<!-- Basic metric -->
<rag-stat-card [data]="{
  label: 'Total Users',
  value: 1234,
  icon: 'users'
}" />

<!-- Metric with trend -->
<rag-stat-card 
  size="lg"
  [data]="{
    label: 'Revenue',
    value: '$45,230',
    change: { value: '+12.5%', trend: 'up' },
    icon: 'dollar-sign'
  }" />
```

---

### RagCodeBlock  
**Purpose**: Display formatted code with syntax highlighting, copy functionality, and line numbers.

#### Props
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `code` | `string` | ✅ | Code content to display |
| `language` | `string` | `''` | Programming language for highlighting |
| `title` | `string` | `''` | Optional code block title |
| `showCopy` | `boolean` | `true` | Show copy to clipboard button |
| `showLineNumbers` | `boolean` | `false` | Display line numbers |
| `maxHeight` | `string` | `''` | Maximum height with scrolling |

#### Usage
```html
<!-- Basic code block -->
<rag-code-block 
  [code]="'console.log(\"Hello World\");'"
  language="javascript" />

<!-- Advanced code block -->
<rag-code-block
  [code]="longCodeExample"
  language="typescript"
  title="Component Example"
  [showLineNumbers]="true"
  maxHeight="300px" />
```

---

### RagMetricDisplay
**Purpose**: Advanced performance metric visualization with thresholds, targets, and status indicators.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `metric` | `PerformanceMetric` | ✅ | Metric configuration |
| `showTarget` | `boolean` | `true` | Display target progress |
| `variant` | `'default' \| 'compact' \| 'detailed'` | `'default'` | Display style |

#### PerformanceMetric Interface
```typescript
interface PerformanceMetric {
  label: string;
  value: number;
  unit: string;
  target?: number;                  // Target value for progress
  threshold?: {                     // Status thresholds
    good: number;
    warning: number;
  };
  format?: 'number' | 'percentage' | 'duration' | 'bytes';
}
```

#### Usage
```html
<!-- Response time metric -->
<rag-metric-display [metric]="{
  label: 'Response Time',
  value: 245,
  unit: 'ms',
  target: 500,
  threshold: { good: 200, warning: 400 },
  format: 'duration'
}" />

<!-- Memory usage with progress -->
<rag-metric-display
  variant="detailed"
  [metric]="{
    label: 'Memory Usage',
    value: 1536,
    unit: 'MB',
    target: 2048,
    format: 'bytes'
  }" />
```

---

### RagKeyValue
**Purpose**: Display key-value pairs in a structured, scannable format.

#### Usage
```html
<rag-key-value [pairs]="[
  { key: 'Model', value: 'GPT-4' },
  { key: 'Temperature', value: '0.7' },
  { key: 'Max Tokens', value: '2048' }
]" />
```

---

### RagTimestamp  
**Purpose**: Intelligent timestamp display with relative time and formatting options.

#### Usage
```html
<!-- Relative time -->
<rag-timestamp [value]="lastUpdated" format="relative" />

<!-- Absolute time with custom format -->
<rag-timestamp 
  [value]="createdDate" 
  format="absolute"
  dateFormat="MMM dd, yyyy" />
```

---

## 📝 Forms Components

### RagFormField
**Purpose**: Wrapper component that provides consistent labeling, validation, and layout for form inputs.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | `string` | | Field label text |
| `description` | `string` | | Optional help text |
| `error` | `string` | | Error message |
| `required` | `boolean` | `false` | Show required indicator |
| `size` | `RagFormFieldSize` | `'md'` | Field size |
| `disabled` | `boolean` | `false` | Disabled state |
| `htmlFor` | `string` | | Label association |

#### Usage
```html
<!-- Basic form field -->
<rag-form-field 
  label="Email Address"
  description="We'll never share your email"
  [required]="true">
  <rag-input 
    type="email" 
    placeholder="Enter your email" />
</rag-form-field>

<!-- Field with validation error -->
<rag-form-field
  label="Password"
  [error]="passwordError"
  [required]="true">
  <rag-input 
    type="password"
    placeholder="Enter password" />
</rag-form-field>
```

---

### RagSearchInput
**Purpose**: Specialized search input with debouncing, clear functionality, and search-specific UX patterns.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `placeholder` | `string` | `'Search...'` | Placeholder text |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Input size |
| `disabled` | `boolean` | `false` | Disabled state |
| `showClearButton` | `boolean` | `true` | Show clear button |
| `debounceTime` | `number` | `300` | Search debounce in ms |

#### Events
| Event | Type | Description |
|-------|------|-------------|
| `search` | `string` | Emitted when search value changes (debounced) |
| `clear` | `void` | Emitted when clear button clicked |

#### Usage
```html
<!-- Basic search -->
<rag-search-input 
  placeholder="Search documents..."
  (search)="onSearch($event)"
  (clear)="onClearSearch()" />

<!-- Large search with custom debounce -->
<rag-search-input
  size="lg"
  [debounceTime]="500"
  placeholder="Search knowledge bases..."
  (search)="performSearch($event)" />
```

#### Form Integration
```typescript
// Reactive forms integration
<rag-search-input 
  [formControl]="searchControl"
  (search)="handleSearch($event)" />
```

---

### RagVersionInput
**Purpose**: Specialized input for version specifications with support for exact versions, ranges, and latest.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `placeholder` | `string` | `'e.g., 1.0.0'` | Input placeholder |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Input size |
| `disabled` | `boolean` | `false` | Disabled state |
| `allowLatest` | `boolean` | `true` | Allow "latest" option |
| `allowRange` | `boolean` | `true` | Allow version ranges |

#### VersionValue Interface
```typescript
interface VersionValue {
  type: 'exact' | 'range' | 'latest';
  version: string;
}
```

#### Usage
```html
<!-- Basic version input -->
<rag-version-input 
  placeholder="Enter version"
  (versionChange)="onVersionChange($event)" />

<!-- Exact versions only -->
<rag-version-input
  [allowLatest]="false"
  [allowRange]="false"
  placeholder="1.0.0" />
```

---

### RagCronInput
**Purpose**: User-friendly cron expression builder with presets and visual feedback.

#### Usage
```html
<rag-cron-input 
  [formControl]="cronControl"
  [showPresets]="true"
  (cronChange)="onCronChange($event)" />
```

---

### RagSettingsItem

A specialized form field wrapper designed for settings pages with flexible layout options and icon support.

**Selector:** `rag-settings-item`

#### Props

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | `string` | | Setting label text |
| `description` | `string` | | Optional description text |
| `icon` | `any` | | Lucide icon component |
| `required` | `boolean` | `false` | Show required indicator |
| `layout` | `'horizontal' \| 'vertical'` | `'horizontal'` | Field layout orientation |
| `htmlFor` | `string` | | Label association for form controls |

#### Usage

```html
<!-- Basic settings item -->
<rag-settings-item 
  label="Theme Preference"
  description="Choose your preferred color scheme">
  <rag-toggle-group 
    [options]="themeOptions"
    [formControl]="themeControl">
  </rag-toggle-group>
</rag-settings-item>

<!-- With icon and vertical layout -->
<rag-settings-item 
  label="Notifications"
  description="Configure your notification preferences"
  [icon]="BellIcon"
  layout="vertical">
  <rag-switch 
    label="Email notifications"
    [formControl]="emailNotificationsControl">
  </rag-switch>
  <rag-switch 
    label="Push notifications"
    [formControl]="pushNotificationsControl">
  </rag-switch>
</rag-settings-item>

<!-- Required field -->
<rag-settings-item 
  label="API Key"
  description="Your OpenAI API key for model access"
  [icon]="KeyIcon"
  [required]="true">
  <rag-input 
    type="password"
    [formControl]="apiKeyControl"
    placeholder="sk-...">
  </rag-input>
</rag-settings-item>
```

---


### RagSettingsSection

A section container component for organizing settings into logical groups with optional headers and dividers.

**Selector:** `rag-settings-section`

#### Props

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | | Section title |
| `description` | `string` | | Optional section description |
| `icon` | `any` | | Lucide icon component |
| `variant` | `'default' \| 'card' \| 'inline'` | `'default'` | Visual style variant |
| `spacing` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'lg'` | Section spacing |

#### Usage

```html
<!-- Default section with divider -->
<rag-settings-section 
  title="Account Settings"
  description="Manage your account preferences and profile information"
  [icon]="UserIcon">
  
  <rag-settings-item label="Display Name">
    <rag-input [formControl]="displayNameControl">
  </rag-settings-item>
  
  <rag-settings-item label="Email Address">
    <rag-input type="email" [formControl]="emailControl">
  </rag-settings-item>
</rag-settings-section>

<!-- Card variant for visual separation -->
<rag-settings-section 
  title="Privacy & Security"
  description="Configure your privacy settings and security preferences"
  [icon]="ShieldIcon"
  variant="card">
  
  <rag-settings-item 
    label="Two-Factor Authentication"
    description="Add an extra layer of security to your account">
    <rag-switch [formControl]="twoFactorControl">
  </rag-settings-item>
  
  <rag-settings-item 
    label="Session Timeout"
    description="Automatically log out after period of inactivity">
    <rag-select 
      [options]="timeoutOptions"
      [formControl]="sessionTimeoutControl">
  </rag-select>
  </rag-settings-item>
</rag-settings-section>

<!-- Inline variant for compact sections -->
<rag-settings-section 
  title="Quick Actions"
  variant="inline"
  spacing="sm">
  
  <div class="action-buttons">
    <rag-button variant="outline">Export Data</rag-button>
    <rag-button variant="outline">Clear Cache</rag-button>
    <rag-button variant="outline" color="red">Delete Account</rag-button>
  </div>
</rag-settings-section>
```

#### Variants

- **Default**: Section with header and divider separator
- **Card**: Section wrapped in elevated card container
- **Inline**: Compact section without divider, minimal spacing

#### Integration Example

```typescript
// Complete settings page component
@Component({
  selector: 'app-settings',
  imports: [
    RagTabs, RagSettingsSection, RagSettingsItem,
    RagInput, RagSwitch, RagSelect, RagToggleGroup
  ],
  template: `
    <rag-tabs 
      [tabs]="tabs"
      [activeTab]="activeTab()"
      variant="pills"
      (tabChange)="setActiveTab($event)">
    </rag-tabs>
      
    @switch (activeTab()) {
      @case ('general') {
        <rag-settings-section 
          title="Appearance"
          description="Customize the look and feel"
          [icon]="PaletteIcon">
          
          <rag-settings-item 
            label="Theme"
            description="Choose your preferred color scheme">
            <rag-toggle-group 
              [options]="themeOptions"
              [formControl]="themeControl">
            </rag-toggle-group>
          </rag-settings-item>
        </rag-settings-section>
      }
    }
  `
})
export class SettingsComponent {
  readonly tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'privacy', label: 'Privacy', icon: ShieldIcon }
  ];
  
  readonly activeTab = signal('general');
  
  readonly themeOptions = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: MonitorIcon }
  ];
}
```

---

## 🧭 Navigation Components

### RagTabs
**Purpose**: Revolutionary single-source-of-truth tab navigation that auto-discovers tabs from directive panels. No need to define tabs separately - everything is declared in the template directives for maximum simplicity and maintainability.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `selectedIndex` | `number` | `0` | Currently active tab index (two-way binding) |
| `variant` | `'primary' \| 'secondary' \| 'minimal'` | `'primary'` | Visual style variant |
| `disabled` | `boolean` | `false` | Disable all tabs |

#### TabItem Interface
```typescript
interface TabItem {
  id: string;
  label: string;
  icon?: any;                      // Lucide icon component
  disabled?: boolean;
}
```

#### Events
| Event | Type | Description |
|-------|------|-------------|
| `selectedIndexChange` | `number` | Emitted when tab selection changes (supports two-way binding) |

#### RagTabPanelDirective
**Purpose**: Enhanced directive that contains BOTH tab metadata and panel content in one place - the ultimate single source of truth.

```typescript
@Directive({
  selector: '[ragTabPanel]',
  standalone: true
})
export class RagTabPanelDirective {
  readonly id = input.required<string>({ alias: 'ragTabPanel' });
  readonly label = input.required<string>();          // Tab label
  readonly icon = input<any>();                       // Tab icon
  readonly disabled = input(false, { transform: Boolean }); // Tab disabled state
}
```

#### Key Features
- **🎯 Single Source of Truth**: Tab info (label, icon, disabled) defined directly on each panel directive
- **🚀 Auto-Discovery**: No need to define tabs array separately - automatically extracted from directives
- **⚡ Optimized Rendering**: Tab panels use `position: absolute` with `visibility` and `opacity` for smooth transitions  
- **🔄 No Re-rendering**: Content stays in DOM, preventing expensive re-creation when switching tabs
- **📡 Two-way Binding**: Supports `[(selectedIndex)]` syntax for seamless state management
- **🎨 Shared Styling**: Reuses CSS from `rag-tab-navigation` for consistent appearance
- **♿ Full Accessibility**: ARIA compliant with proper tab/tabpanel relationships
- **🧹 Simplified Usage**: Minimal boilerplate - just add directive attributes to your templates

#### Usage

**Revolutionary Simplified Usage - Single Source of Truth!**
```html
<!-- ✨ No tabs array needed - everything auto-discovered! -->
<rag-tabs 
  [selectedIndex]="selectedIndex()"
  (selectedIndexChange)="onSelectedIndexChange($event)"
  variant="primary">
  
  <!-- Tab info defined RIGHT HERE with the content - amazing! -->
  <ng-template 
    ragTabPanel="overview" 
    [label]="'Overview'" 
    [icon]="HomeIcon">
    <rag-card>
      <h3>Overview Panel</h3>
      <p>🎯 Single source of truth - tab label and icon defined here!</p>
      <p>No need to maintain separate tabs array anymore.</p>
      <rag-button (onClick)="navigateToSettings()">
        Go to Settings
      </rag-button>
    </rag-card>
  </ng-template>
  
  <ng-template 
    ragTabPanel="settings" 
    [label]="'Settings'" 
    [icon]="SettingsIcon">
    <rag-card>
      <h3>Settings Panel</h3>
      <p>Tab info stays perfectly in sync with content!</p>
      <rag-form-field label="Theme">
        <rag-select [options]="themeOptions" />
      </rag-form-field>
    </rag-card>
  </ng-template>
  
  <ng-template 
    ragTabPanel="profile" 
    [label]="'User Profile'" 
    [icon]="UserIcon"
    [disabled]="false">
    <rag-card>
      <h3>User Profile</h3>
      <p>Even disabled state managed right here!</p>
    </rag-card>
  </ng-template>
</rag-tabs>
```

**Drastically Simplified Component Setup**
```typescript
@Component({
  imports: [RagTabs, RagTabPanelDirective, RagCard, RagButton],
  template: `<!-- template above -->`
})
export class TabsPageComponent {
  // Only need icons for template use - no tabs array! 🎉
  readonly HomeIcon = HomeIcon;
  readonly SettingsIcon = SettingsIcon;
  readonly UserIcon = UserIcon;
  
  // Just state management - so much cleaner!
  readonly selectedIndex = signal<number>(0);
  
  onSelectedIndexChange(index: number): void {
    console.log('Tab changed to index:', index);
    this.selectedIndex.set(index);
  }
  
  navigateToSettings(): void {
    this.selectedIndex.set(1); // Programmatic navigation
  }
}
```

**Two-way Binding Syntax**
```html
<!-- Shorthand two-way binding - even cleaner! -->
<rag-tabs 
  [(selectedIndex)]="currentTabIndex"
  variant="secondary">
  
  <ng-template 
    ragTabPanel="documents" 
    [label]="'Documents'">
    <div>First tab content</div>
  </ng-template>
  
  <ng-template 
    ragTabPanel="settings" 
    [label]="'Settings'">
    <div>Second tab content</div>
  </ng-template>
</rag-tabs>
```

#### Variants

**Primary Variant (Default)**
```html
<rag-tabs variant="primary" [(selectedIndex)]="index">
  <ng-template ragTabPanel="tab1" [label]="'Tab 1'">Content 1</ng-template>
  <ng-template ragTabPanel="tab2" [label]="'Tab 2'">Content 2</ng-template>
</rag-tabs>
```

**Secondary Variant** 
```html
<rag-tabs variant="secondary" [(selectedIndex)]="index">
  <ng-template ragTabPanel="tab1" [label]="'Tab 1'">Content 1</ng-template>
  <ng-template ragTabPanel="tab2" [label]="'Tab 2'">Content 2</ng-template>
</rag-tabs>
```

**Minimal Variant**
```html
<rag-tabs variant="minimal" [(selectedIndex)]="index">
  <ng-template ragTabPanel="tab1" [label]="'Tab 1'">Content 1</ng-template>
  <ng-template ragTabPanel="tab2" [label]="'Tab 2'">Content 2</ng-template>
</rag-tabs>
```

#### Performance Benefits
- **🚀 No DOM Manipulation**: Switching tabs only changes CSS properties, not DOM structure
- **⚡ Faster Transitions**: Opacity/visibility changes are GPU accelerated  
- **💾 Form State Preservation**: Form inputs maintain their state when switching tabs
- **🧠 Memory Efficient**: All content loaded once, then cached in hidden panels
- **🔄 Zero Re-renders**: Content components never re-initialize when switching tabs
- **📦 Single Source Management**: Eliminates sync issues between tabs array and content

#### Accessibility Features
- **Keyboard Navigation**: Arrow keys, Tab, Enter support
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Focus is properly managed when switching tabs
- **High Contrast Mode**: Compatible with system accessibility settings

---

### RagBreadcrumb
**Purpose**: Hierarchical navigation with home link, truncation, and click handling.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `items` | `BreadcrumbItem[]` | ✅ | Breadcrumb items |
| `separator` | `string` | `'chevron-right'` | Separator icon |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `maxItems` | `number \| null` | `null` | Maximum items to show |
| `showHome` | `boolean` | `true` | Include home link |
| `homeIcon` | `string` | `'house'` | Home icon |
| `homeLabel` | `string` | `'Home'` | Home label |
| `homeUrl` | `string` | `'/'` | Home URL |

#### BreadcrumbItem Interface
```typescript
interface BreadcrumbItem {
  label: string;
  url?: string;                     // Router link or external URL
  icon?: string;                    // Lucide icon name
  disabled?: boolean;
  current?: boolean;                // Mark as current page
}
```

#### Usage
```html
<!-- Basic breadcrumb -->
<rag-breadcrumb [items]="[
  { label: 'Knowledge Bases', url: '/knowledge-bases' },
  { label: 'Documents', url: '/knowledge-bases/docs' },
  { label: 'Current Document', current: true }
]" />

<!-- Custom home and truncation -->
<rag-breadcrumb
  homeLabel="Dashboard"
  homeUrl="/dashboard"
  [maxItems]="4"
  [items]="longBreadcrumbPath" />
```

---

### RagPageHeader
**Purpose**: Reusable page header component with title, description, icon, action buttons, and integrated search input for consistent page layouts.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | ✅ | Page title text |
| `description` | `string` | `''` | Optional page description |
| `icon` | `any` | | Lucide icon component for page icon |
| `actions` | `PageHeaderAction[]` | `[]` | Action buttons configuration |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `showSearch` | `boolean` | `false` | Enable search input functionality |
| `searchPlaceholder` | `string` | `'Search...'` | Search input placeholder text |
| `searchValue` | `string` | `''` | Current search value binding |

#### PageHeaderAction Interface
```typescript
interface PageHeaderAction {
  label: string;                    // Button label
  icon?: any;                      // Lucide icon component  
  variant?: ButtonVariant;         // Button style variant
  size?: ButtonSize;               // Button size
  disabled?: boolean;              // Disabled state
  loading?: boolean;               // Loading state
  action: () => void;              // Click handler function
}
```

#### Events
| Event | Type | Description |
|-------|------|-------------|
| `actionClick` | `PageHeaderAction` | Emitted when action button clicked |
| `searchChange` | `string` | Emitted when search query changes |
| `searchClear` | `void` | Emitted when search is cleared |

#### Usage
```html
<!-- Basic page header -->
<rag-page-header
  [title]="'Page Title'"
  [description]="'Page description text'"
  [icon]="HomeIcon">
</rag-page-header>

<!-- Page header with actions -->
<rag-page-header
  [title]="'Complete Flows'"
  [description]="'End-to-end RAG processes combining tools, knowledge bases, and pipelines'"
  [icon]="GitBranchIcon"
  [actions]="[
    {
      label: 'Flow Designer',
      icon: LayoutIcon,
      variant: 'outline',
      action: () => openDesigner()
    },
    {
      label: 'Create Flow',
      icon: PlusIcon,
      variant: 'solid',
      action: () => openCreateWizard()
    }
  ]"
  [size]="'lg'">
</rag-page-header>

<!-- Page header with search functionality -->
<rag-page-header
  [title]="'Tools Overview'"
  [description]="'Manage and monitor your RAG tools'"
  [icon]="WrenchIcon"
  [showSearch]="true"
  [searchPlaceholder]="'Search tools by name or endpoint...'"
  [searchValue]="currentSearchQuery()"
  [actions]="headerActions()"
  (searchChange)="onSearchChange($event)"
  (searchClear)="onSearchClear()"
  (actionClick)="onActionClick($event)">
</rag-page-header>
```

#### Responsive Behavior
- Search and actions stack vertically on mobile devices
- Title truncates with ellipsis on narrow screens  
- Description shows up to 2-3 lines based on screen size
- Icon, search, and actions maintain proper spacing across breakpoints
- Search input has a minimum width of 280px on desktop, full width on mobile

#### Search Integration
The RagPageHeader uses the RagSearchInput component to provide:
- **Positioned Search**: Search input appears on the right side, before action buttons
- **Debounced Input**: Built-in search debouncing (300ms default)
- **Clear Functionality**: Clear button with dedicated event
- **Responsive Layout**: Search and actions adapt to different screen sizes
- **Clean Integration**: Direct search input without statistics overlay

---

### RagStepper
**Purpose**: Multi-step progress indicator and content wizard for step-by-step workflows. Steps are defined using the `ragStepPanel` directive with automatic progress tracking and content display.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `currentStep` | `number` | `1` | Currently active step number |
| `totalSteps` | `number` | `1` | Total number of steps |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout orientation |
| `variant` | `'default' \| 'compact'` | `'default'` | Display variant |

#### Usage
```html
<!-- Basic horizontal stepper -->
<rag-stepper
  [currentStep]="currentStep()"
  [totalSteps]="3"
  size="md"
  variant="default"
  (stepClick)="onStepClick($event)"
  (currentStepChange)="onStepChange($event)">

  <div ragStepPanel="step1" label="Basic Information" [stepNumber]="1">
    <h3>Basic Information</h3>
    <p>Configure the basic settings for your wizard...</p>
    <!-- Your step 1 content here -->
  </div>

  <div ragStepPanel="step2" label="Configuration" [stepNumber]="2">
    <h3>Configuration</h3>
    <p>Configure advanced settings and options...</p>
    <!-- Your step 2 content here -->
  </div>

  <div ragStepPanel="step3" label="Review & Create" [stepNumber]="3">
    <h3>Review & Create</h3>
    <p>Review your configuration and create the item...</p>
    <!-- Your step 3 content here -->
  </div>
</rag-stepper>

<!-- Compact variant without labels -->
<rag-stepper
  [currentStep]="currentStep()"
  [totalSteps]="3"
  variant="compact"
  size="sm">

  <div ragStepPanel="setup" label="Setup" [stepNumber]="1">
    <p>Setup content...</p>
  </div>

  <div ragStepPanel="config" label="Config" [stepNumber]="2">
    <p>Configuration content...</p>
  </div>

  <div ragStepPanel="finish" label="Finish" [stepNumber]="3">
    <p>Completion content...</p>
  </div>
</rag-stepper>

<!-- Vertical orientation -->
<rag-stepper
  [currentStep]="currentStep()"
  [totalSteps]="3"
  orientation="vertical">

  <div ragStepPanel="start" label="Start" [stepNumber]="1">
    <p>Starting step content...</p>
  </div>

  <div ragStepPanel="middle" label="Process" [stepNumber]="2">
    <p>Processing step content...</p>
  </div>

  <div ragStepPanel="end" label="Complete" [stepNumber]="3">
    <p>Completion step content...</p>
  </div>
</rag-stepper>
```

```typescript
// Component setup
readonly currentStep = signal(1);

onStepClick(event: { step: number; id: string }) {
  console.log('Step clicked:', event);
  this.currentStep.set(event.step);
}

onStepChange(stepNumber: number) {
  this.currentStep.set(stepNumber);
}
```

#### RagStepPanel Directive
For content steppers, use the `ragStepPanel` directive:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `ragStepPanel` | `string` | ✅ | Unique step ID |
| `label` | `string` | ✅ | Step label shown in stepper |
| `stepNumber` | `number` | ✅ | Step number (1-based) |
| `completed` | `boolean` | ❌ | Mark step as completed |
| `disabled` | `boolean` | ❌ | Mark step as disabled |

#### Events
| Event | Type | Description |
|-------|------|-------------|
| `stepClick` | `{ step: number; id: string }` | Emitted when a step is clicked (disabled steps cannot be clicked) |
| `currentStepChange` | `number` | Emitted when the current step changes |

#### Features
- **Content-First Design**: Steps are defined through `ragStepPanel` directives with automatic discovery
- **Visual Progress**: Clear indication of completed, current, and pending steps with automatic state management
- **Check Icons**: Completed steps show check marks automatically based on current step
- **Connector Lines**: Visual flow between steps with completion state indicators
- **Clickable Navigation**: All non-disabled steps are clickable for direct navigation
- **Content Display**: Automatic content panel switching based on current step
- **Responsive Design**: Adapts to different screen sizes and orientations
- **Accessibility**: Screen reader support with step progress announcements and ARIA labels
- **Size Variants**: Multiple size options (sm, md, lg) for different use cases
- **Layout Orientations**: Both horizontal and vertical layouts supported
- **Variant Support**: Default (with labels) and compact (minimal) display variants

---

### RagSidebarItem
**Purpose**: Sidebar navigation item with nested children, chips, and state management.

#### Usage
```html
<rag-sidebar-item
  label="Knowledge Bases"
  icon="database"
  [chip]="5"
  [active]="currentRoute === '/knowledge-bases'" />
```

---

## 🎭 Overlay Components

### RagDialog
**Purpose**: Template wrapper component for consistent dialog styling. Dialogs are opened programmatically using `RagDialogService`.

#### Service Usage
Use `RagDialogService` to open components as dialogs:

```typescript
import { RagDialogService } from './shared/components/semantic/overlay/rag-dialog/rag-dialog.service';

export class MyComponent {
  constructor(private dialogService: RagDialogService) {}

  openDialog() {
    const dialogRef = this.dialogService.open(MyDialogComponent, {
      data: { message: 'Hello from dialog' },
      panelClass: 'custom-dialog',
      disableClose: false,
      backdropClass: 'custom-backdrop'
    });

    dialogRef.closed.subscribe(result => {
      console.log('Dialog closed with result:', result);
    });
  }
}
```

#### Template Component Properties
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | `''` | Dialog title |
| `description` | `string` | `''` | Dialog description |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Dialog size |
| `showCloseButton` | `boolean` | `true` | Show close button |

#### Dialog Component Structure
Create dialog components that use `<rag-dialog>` as a template wrapper:

```typescript
import { Component, inject } from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { RagDialog } from './shared/components/semantic/overlay/rag-dialog/rag-dialog';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [RagDialog, RagButton],
  template: `
    <rag-dialog
      title="Confirm Deletion"
      description="This action cannot be undone."
      size="sm">
      
      <div class="dialog-content">
        <p>Are you sure you want to delete "{{ data.itemName }}"?</p>
      </div>
      
      <div slot="footer" class="dialog-actions">
        <rag-button variant="outline" (click)="cancel()">Cancel</rag-button>
        <rag-button variant="solid" (click)="confirm()">Delete</rag-button>
      </div>
    </rag-dialog>
  `
})
export class ConfirmationDialogComponent {
  private dialogRef = inject(DialogRef);
  readonly data = inject(DIALOG_DATA);

  cancel() {
    this.dialogRef.close(false);
  }

  confirm() {
    this.dialogRef.close(true);
  }
}
```

#### Form Dialog Example
```typescript
@Component({
  selector: 'app-create-item-dialog',
  standalone: true,
  imports: [RagDialog, RagFormField, RagInput, RagButton],
  template: `
    <rag-dialog
      title="Create New Item"
      size="lg">
      
      <form [formGroup]="createForm">
        <rag-form-field label="Name" [required]="true">
          <rag-input formControlName="name" />
        </rag-form-field>
        <rag-form-field label="Description">
          <rag-textarea formControlName="description" />
        </rag-form-field>
      </form>
      
      <div slot="footer" class="dialog-actions">
        <rag-button variant="outline" (click)="cancel()">Cancel</rag-button>
        <rag-button 
          variant="solid" 
          [disabled]="createForm.invalid"
          (click)="save()">
          Create Item
        </rag-button>
      </div>
    </rag-dialog>
  `
})
export class CreateItemDialogComponent {
  private dialogRef = inject(DialogRef);
  readonly data = inject(DIALOG_DATA);
  
  readonly createForm = this.fb.group({
    name: ['', Validators.required],
    description: ['']
  });

  cancel() {
    this.dialogRef.close();
  }

  save() {
    if (this.createForm.valid) {
      this.dialogRef.close(this.createForm.value);
    }
  }
}
```

---

### RagDropdown
**Purpose**: Context-aware dropdown menu with positioning, keyboard navigation, and nested items.

#### Usage
```html
<rag-dropdown [items]="menuItems" (itemSelect)="onMenuSelect($event)">
  <rag-button variant="outline">
    Actions
    <rag-icon [img]="ChevronDownIcon" />
  </rag-button>
</rag-dropdown>
```

---

### RagContextMenu
**Purpose**: Right-click context menu with dynamic positioning and hierarchical items.

#### Usage
```html
<div rag-context-menu [items]="contextItems">
  Right-click for context menu
</div>
```

---

## 📊 Composite Components

### RagStatsOverview
**Purpose**: Statistics overview display with interactive filtering for data-heavy pages. This component provides a clean solution for displaying key metrics with clickable filtering capabilities.

#### Props
| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `stats` | `StatItem[]` | ✅ | | Array of statistical items to display |
| `loading` | `boolean` | | `false` | Loading state for all statistics |

#### Interfaces

**StatItem Interface**
```typescript
interface StatItem {
  id: string;                          // Unique identifier
  label: string;                       // Display label  
  value: number | string;              // Statistical value
  icon: any;                          // Lucide icon component
  color?: 'gray' | 'green' | 'red' | 'amber' | 'blue'; // Color scheme
  variant?: 'solid' | 'soft' | 'outline'; // Chip variant
  clickable?: boolean;                 // Whether item is clickable (default: true)
}
```


#### Events
| Event | Type | Description |
|-------|------|-------------|
| `filterChange` | `string[]` | Emitted when filter selection changes |
| `statClick` | `string` | Emitted when a stat item is clicked (passes stat ID) |

#### Usage

**Basic Usage**
```html
<rag-stats-overview
  [stats]="statisticItems()"
  (filterChange)="onFilterChange($event)"
  (statClick)="onStatClick($event)">
</rag-stats-overview>
```

**Advanced Usage with Loading State**
```typescript
// Component
readonly toolStats = computed(() => [
  {
    id: 'total',
    label: 'Total Tools',
    value: this.toolsService.getTotal(),
    icon: WrenchIcon,
    color: 'blue'
  },
  {
    id: 'active',
    label: 'Active',
    value: this.toolsService.getActive(),
    icon: CheckCircleIcon,
    color: 'green',
    clickable: true
  },
  {
    id: 'errors',
    label: 'Errors',
    value: this.toolsService.getErrors(),
    icon: AlertTriangleIcon,
    color: 'red',
    variant: 'solid'
  }
]);

onStatClick(statId: string) {
  // Filter by the clicked statistic
  if (statId === 'active') {
    this.filterBy(['ACTIVE']);
  } else if (statId === 'errors') {
    this.filterBy(['ERROR']);
  }
}
```

```html
<rag-stats-overview
  [stats]="toolStats()"
  [loading]="isLoading()"
  (filterChange)="onFilterChange($event)"
  (statClick)="onStatClick($event)">
</rag-stats-overview>
```

#### Features
- **Interactive Statistics**: Click on stat items to filter data
- **Multi-selection Filtering**: Support for multiple filter selections
- **Loading States**: Built-in loading overlay for statistics
- **Responsive Design**: Mobile-first responsive layout
- **Color Coding**: Support for semantic color schemes
- **Icon Integration**: Full Lucide icon support with proper sizing
- **Accessibility**: Keyboard navigation and screen reader support
- **Auto-hide Zero Values**: Automatically hide statistics with zero values (except total)

#### Styling
The component uses the established design token system and follows the card archetype pattern:
- Statistics use elevated card styling with hover effects
- Consistent spacing and typography via design tokens
- Color variants map to semantic color tokens
- Responsive breakpoints for mobile adaptation

---

## 🎯 Design Principles

### 1. **Composition over Inheritance**
Semantic components compose atomic components rather than extending them, promoting reusability and maintainability.

### 2. **Single Responsibility**
Each component has a clear, focused purpose and handles specific user interaction patterns.

### 3. **Accessibility First**
All components include proper ARIA attributes, keyboard navigation, and focus management.

### 4. **Progressive Enhancement**
Components work with basic functionality and enhance with advanced features when needed.

### 5. **Modern Angular Patterns**
- Use `input()` and `output()` for component props and events
- Leverage `signal()` and `computed()` for reactive state
- Implement `ControlValueAccessor` for form integration
- Use `effect()` for side effects and lifecycle management

---

## 🧪 Testing Patterns

### Component Testing
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RagStatCard } from './rag-stat-card';

describe('RagStatCard', () => {
  let component: RagStatCard;
  let fixture: ComponentFixture<RagStatCard>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RagStatCard]
    });
    fixture = TestBed.createComponent(RagStatCard);
    component = fixture.componentInstance;
  });

  it('should display metric data correctly', () => {
    component.data.set({
      label: 'Test Metric',
      value: 100,
      icon: 'activity'
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Test Metric');
    expect(fixture.nativeElement.textContent).toContain('100');
  });

  it('should show trend indicator when change data provided', () => {
    component.data.set({
      label: 'Revenue',
      value: 1000,
      change: { value: '+10%', trend: 'up' }
    });
    fixture.detectChanges();

    const trendElement = fixture.nativeElement.querySelector('.rag-stat-card__change--up');
    expect(trendElement).toBeTruthy();
  });
});
```

### Integration Testing
```typescript
describe('Form Integration', () => {
  it('should work with reactive forms', fakeAsync(() => {
    const form = new FormGroup({
      search: new FormControl('')
    });

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.form = form;
    fixture.detectChanges();

    const searchInput = fixture.debugElement.query(By.directive(RagSearchInput));
    searchInput.nativeElement.value = 'test query';
    searchInput.nativeElement.dispatchEvent(new Event('input'));

    tick(300); // Wait for debounce

    expect(form.get('search')?.value).toBe('test query');
  }));
});
```

---

## 🚀 Best Practices

### 1. **Component Composition**
```html
<!-- ✅ Good: Compose semantic components -->
<rag-form-field label="Search Documents">
  <rag-search-input 
    (search)="performSearch($event)"
    [debounceTime]="500" />
</rag-form-field>

<!-- ❌ Avoid: Recreating existing functionality -->
<div class="custom-form-field">
  <label>Search Documents</label>
  <input type="text" (input)="onSearch($event)" />
</div>
```

### 2. **State Management**
```typescript
// ✅ Good: Use signals for reactive state
readonly isLoading = signal(false);
readonly searchResults = signal<SearchResult[]>([]);

readonly hasResults = computed(() => 
  this.searchResults().length > 0
);

// ✅ Good: Use effects for side effects
constructor() {
  effect(() => {
    if (this.searchQuery()) {
      this.performSearch(this.searchQuery());
    }
  });
}
```

### 3. **Form Integration**
```typescript
// ✅ Good: Implement ControlValueAccessor
@Component({
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => CustomInput),
    multi: true
  }]
})
export class CustomInput implements ControlValueAccessor {
  // Implementation...
}
```

### 4. **Accessibility**
```typescript
// ✅ Good: Accessible dialog component
@Component({
  template: `
    <rag-dialog
      title="Settings"
      description="Configure your preferences"
      role="dialog"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description">
      
      <div class="settings-form">
        <rag-form-field label="Theme">
          <rag-select formControlName="theme" />
        </rag-form-field>
      </div>
    </rag-dialog>
  `
})
export class SettingsDialogComponent {
  // Opened via RagDialogService
}
```

### 5. **Performance**
```typescript
// ✅ Good: Use computed for derived values
readonly filteredItems = computed(() => 
  this.items().filter(item => 
    item.name.toLowerCase().includes(this.searchTerm().toLowerCase())
  )
);

// ✅ Good: Use trackBy for large lists
readonly trackByFn = (index: number, item: any) => item.id;
```

---

## 📚 Summary

The RAG Studio semantic components provide:

- **17 high-level components** across 4 categories
- **Comprehensive form integration** with reactive forms support
- **Advanced interaction patterns** (search, version input, cron builder)
- **Accessibility features** built-in
- **Modern Angular 20 patterns** throughout
- **Design token integration** for consistent styling
- **Extensive customization options** via props and variants

These components form the building blocks for complex RAG Studio interfaces, providing consistent UX patterns and reducing development time while maintaining flexibility and accessibility standards.

---

**Last Updated**: September 28, 2025
**Version**: 2.1.1
**Total Components**: 20 semantic components
