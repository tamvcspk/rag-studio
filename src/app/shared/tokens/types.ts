/**
 * RAG Studio Design System Types
 * 
 * Simple, practical types for design tokens and components.
 * No over-engineering, just what's needed.
 */

// ===== CORE TYPES =====

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ColorName = 'gray' | 'blue' | 'green' | 'red' | 'amber';

// ===== COMPONENT TYPES =====

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'soft';
export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
export type InputState = 'default' | 'focus' | 'error' | 'disabled';
export type CardVariant = 'flat' | 'elevated' | 'floating';
export type AlertVariant = 'info' | 'success' | 'warning' | 'error';
export type SelectState = 'default' | 'focus' | 'error' | 'disabled';
export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';
export type SwitchState = 'default' | 'checked' | 'disabled';
export type IconVariant = 'default' | 'subtle' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';
export type SkeletonVariant = 'text' | 'circular' | 'rectangular';
export type FocusVariant = 'primary' | 'danger' | 'success';
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ToastVariant = 'success' | 'warning' | 'error' | 'info';
export type DropdownItemState = 'default' | 'hover' | 'active' | 'disabled';
export type TabState = 'default' | 'hover' | 'active' | 'disabled';
export type BreadcrumbItemState = 'default' | 'hover' | 'current';
export type NavigationVariant = 'primary' | 'secondary' | 'minimal';
export type TabNavItemState = 'default' | 'hover' | 'active' | 'disabled';

// ===== COMPONENT INTERFACES =====

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: Size;
  disabled?: boolean;
}

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: Size;
}

export interface InputProps {
  state?: InputState;
  size?: Size;
  disabled?: boolean;
}

export interface CardProps {
  variant?: CardVariant;
  size?: Size;
}

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  closable?: boolean;
  icon?: string;
}

export interface SelectProps {
  state?: SelectState;
  size?: Size;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
}

export interface ProgressProps {
  variant?: ProgressVariant;
  size?: Size;
  value?: number;
  showLabel?: boolean;
}

export interface SwitchProps {
  state?: SwitchState;
  size?: Size;
  disabled?: boolean;
}

export interface IconProps {
  variant?: IconVariant;
  size?: Size | number;
}

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
}

export interface DialogProps {
  size?: DialogSize;
  title?: string;
  description?: string;
  open?: boolean;
  showCloseButton?: boolean;
}

export interface ToastProps {
  variant?: ToastVariant;
  title?: string;
  duration?: number;
  dismissible?: boolean;
}

export interface DropdownProps {
  items?: DropdownItem[];
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'click' | 'hover';
}

export interface DropdownItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  separator?: boolean;
}

export interface TabNavItem {
  id: string;
  label: string;
  icon?: string;
  routerLink?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export interface FormFieldProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  size?: Size;
}

export interface NavigationProps {
  items?: TabNavItem[];
  variant?: NavigationVariant;
  activeItem?: string;
  orientation?: 'horizontal' | 'vertical';
}

// ===== UTILITY TYPES =====

export type TokenPath = string;
export type ThemeMode = 'light' | 'dark';