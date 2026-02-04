/**
 * MeshCore C Bridge
 *
 * This file provides the pure C API that can be called from Objective-C.
 * It delegates all calls to the C++ implementation via the impl header.
 *
 * Why this file exists:
 *   - Objective-C can only call C functions directly
 *   - This provides a clean C ABI
 *   - Allows the C++ implementation to change without affecting callers
 */

#include "meshcore.h"
#include "meshcore_impl.h"

// =============================================================================
// MARK: - Lifecycle
// =============================================================================

meshcore* meshcore_create(void) {
    return meshcore_create_impl();
}

void meshcore_destroy(meshcore* core) {
    meshcore_destroy_impl(core);
}

bool meshcore_is_running(const meshcore* core) {
    return meshcore_is_running_impl(core);
}

const char* meshcore_get_version(void) {
    return meshcore_get_version_impl();
}

// =============================================================================
// MARK: - Callbacks
// =============================================================================

void meshcore_set_callbacks(meshcore* core, const meshcore_callbacks* callbacks) {
    meshcore_set_callbacks_impl(core, callbacks);
}

// =============================================================================
// MARK: - Messaging
// =============================================================================

meshcore_error meshcore_send_message(
    meshcore* core,
    uint64_t peer_id,
    const char* message,
    size_t message_len
) {
    return meshcore_send_message_impl(core, peer_id, message, message_len);
}

meshcore_error meshcore_send_message_to_uid(
    meshcore* core,
    const char* uid,
    const char* message,
    size_t message_len
) {
    return meshcore_send_message_to_uid_impl(core, uid, message, message_len);
}

// =============================================================================
// MARK: - Peer Management
// =============================================================================

uint32_t meshcore_get_peer_count(const meshcore* core) {
    return meshcore_get_peer_count_impl(core);
}

// =============================================================================
// MARK: - Test Helpers
// =============================================================================

void meshcore_simulate_peer_connect(meshcore* core, uint64_t peer_id, const char* uid) {
    meshcore_simulate_peer_connect_impl(core, peer_id, uid);
}

void meshcore_simulate_message(meshcore* core, uint64_t peer_id, const char* message, size_t len) {
    meshcore_simulate_message_impl(core, peer_id, message, len);
}
