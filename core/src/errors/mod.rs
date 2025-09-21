/*!
 * Application-wide Error Handling
 *
 * Core error types and conversions used across the application.
 */

pub mod core_errors;

// Re-export common error types
pub use core_errors::*;