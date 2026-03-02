//! Interop tests: bolt-rendezvous ↔ bolt-core peer code validation.
//!
//! These tests verify that the rendezvous server's permissive peer code
//! validation and bolt-core's strict canonical validation agree where
//! they should and diverge where expected.

use bolt_core::peer_code::is_valid_peer_code;
use bolt_rendezvous::server::validate_peer_code;

#[test]
fn both_reject_empty() {
    assert!(validate_peer_code("").is_err());
    assert!(!is_valid_peer_code(""));
}

#[test]
fn canonical_codes_accepted_by_both() {
    // 6-char code using only unambiguous alphabet chars.
    assert!(validate_peer_code("ABCDEF").is_ok());
    assert!(is_valid_peer_code("ABCDEF"));

    // 8-char code (no dash — server rejects hyphens).
    assert!(validate_peer_code("ABCDEFGH").is_ok());
    assert!(is_valid_peer_code("ABCDEFGH"));
}

#[test]
fn rendezvous_accepts_codes_bolt_core_rejects() {
    // Ambiguous chars (I, L, O, 0, 1) — excluded from bolt-core alphabet.
    assert!(validate_peer_code("IL0O1X").is_ok());
    assert!(!is_valid_peer_code("IL0O1X"));

    // Length 16 (max server allows) — bolt-core only accepts 6 or 8.
    assert!(validate_peer_code("ABCDEF1234567890").is_ok());
    assert!(!is_valid_peer_code("ABCDEF1234567890"));

    // Lowercase alphanumeric — server accepts, bolt-core normalizes
    // to uppercase but still rejects if chars outside alphabet.
    assert!(validate_peer_code("a1b2c3").is_ok());
    assert!(!is_valid_peer_code("a1b2c3"));
}
