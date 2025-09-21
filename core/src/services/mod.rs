/*!
 * Infrastructure Services Module
 *
 * Cross-cutting technical services that can be injected via the Manager.
 * Each service is implemented as a single file following Rust conventions.
 */

pub mod sql;
pub mod vector;

// Future services to be implemented when needed:
// pub mod cache;
// pub mod storage;
// pub mod embedding;
// pub mod logging;