/*!
 * Common Helper Functions
 *
 * Utility functions and helpers used throughout the application.
 */

use std::collections::HashMap;
use serde_json::Value;

/// Generate a unique ID for various entities
pub fn generate_id(prefix: &str) -> String {
    format!("{}_{}", prefix, uuid::Uuid::new_v4().to_string().replace('-', "")[..12].to_lowercase())
}

/// Format bytes into human-readable string
pub fn format_bytes(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = bytes as f64;
    let mut unit_index = 0;

    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }

    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.1} {}", size, UNITS[unit_index])
    }
}

/// Sanitize string for use as filename
pub fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect()
}

/// Deep merge two JSON values
pub fn merge_json(a: &mut Value, b: Value) {
    match (a, b) {
        (Value::Object(ref mut a), Value::Object(b)) => {
            for (k, v) in b {
                merge_json(a.entry(k).or_insert(Value::Null), v);
            }
        }
        (a, b) => *a = b,
    }
}

/// Convert HashMap to JSON Value
pub fn hashmap_to_json(map: HashMap<String, String>) -> Value {
    let mut json_map = serde_json::Map::new();
    for (key, value) in map {
        json_map.insert(key, Value::String(value));
    }
    Value::Object(json_map)
}

/// Extract string from JSON Value
pub fn extract_string_from_json(value: &Value, key: &str) -> Option<String> {
    value.get(key)?.as_str().map(|s| s.to_string())
}

/// Calculate similarity between two strings (simple)
pub fn string_similarity(a: &str, b: &str) -> f64 {
    if a == b {
        return 1.0;
    }

    let a_len = a.len();
    let b_len = b.len();

    if a_len == 0 || b_len == 0 {
        return 0.0;
    }

    // Simple character overlap calculation
    let a_chars: std::collections::HashSet<char> = a.chars().collect();
    let b_chars: std::collections::HashSet<char> = b.chars().collect();

    let intersection = a_chars.intersection(&b_chars).count();
    let union = a_chars.union(&b_chars).count();

    intersection as f64 / union as f64
}

/// Truncate string to specified length with ellipsis
pub fn truncate_string(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else if max_len <= 3 {
        "...".to_string()
    } else {
        format!("{}...", &s[..max_len - 3])
    }
}

/// Validate email format (simple regex)
pub fn is_valid_email(email: &str) -> bool {
    let email_regex = regex::Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").unwrap();
    email_regex.is_match(email)
}

/// Parse semver version string
pub fn parse_version(version: &str) -> Result<(u32, u32, u32), String> {
    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() != 3 {
        return Err("Version must have 3 parts (major.minor.patch)".to_string());
    }

    let major = parts[0].parse::<u32>().map_err(|_| "Invalid major version")?;
    let minor = parts[1].parse::<u32>().map_err(|_| "Invalid minor version")?;
    let patch = parts[2].parse::<u32>().map_err(|_| "Invalid patch version")?;

    Ok((major, minor, patch))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_id() {
        let id = generate_id("test");
        assert!(id.starts_with("test_"));
        assert!(id.len() > 5);
    }

    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(1024), "1.0 KB");
        assert_eq!(format_bytes(1048576), "1.0 MB");
        assert_eq!(format_bytes(500), "500 B");
    }

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("file/name.txt"), "file_name.txt");
        assert_eq!(sanitize_filename("normal_name.txt"), "normal_name.txt");
    }

    #[test]
    fn test_string_similarity() {
        assert_eq!(string_similarity("hello", "hello"), 1.0);
        assert_eq!(string_similarity("", ""), 0.0);
        assert_eq!(string_similarity("hello", ""), 0.0);
        assert!(string_similarity("hello", "hallo") > 0.0);
    }

    #[test]
    fn test_truncate_string() {
        assert_eq!(truncate_string("hello", 10), "hello");
        assert_eq!(truncate_string("hello world", 5), "he...");
        assert_eq!(truncate_string("hi", 2), "hi");
    }

    #[test]
    fn test_is_valid_email() {
        assert!(is_valid_email("test@example.com"));
        assert!(!is_valid_email("invalid-email"));
        assert!(!is_valid_email("@example.com"));
    }

    #[test]
    fn test_parse_version() {
        assert_eq!(parse_version("1.2.3"), Ok((1, 2, 3)));
        assert!(parse_version("1.2").is_err());
        assert!(parse_version("a.b.c").is_err());
    }
}