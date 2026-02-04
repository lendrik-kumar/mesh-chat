/**
 * MeshCore Implementation - Internal Header
 *
 * This header declares the implementation functions called by the C bridge.
 * These functions wrap the C++ Daemon class.
 */

#pragma once

#include "meshcore.h"

#ifdef __cplusplus
extern "C" {
#endif

// Lifecycle
meshcore* meshcore_create_impl(void);
void meshcore_destroy_impl(meshcore* core);
bool meshcore_is_running_impl(const meshcore* core);
const char* meshcore_get_version_impl(void);

// Callbacks
void meshcore_set_callbacks_impl(meshcore* core, const meshcore_callbacks* callbacks);

// Messaging
meshcore_error meshcore_send_message_impl(meshcore* core, uint64_t peer_id, const char* message, size_t len);
meshcore_error meshcore_send_message_to_uid_impl(meshcore* core, const char* uid, const char* message, size_t len);

// Peer management
uint32_t meshcore_get_peer_count_impl(const meshcore* core);

// Test helpers
void meshcore_simulate_peer_connect_impl(meshcore* core, uint64_t peer_id, const char* uid);
void meshcore_simulate_message_impl(meshcore* core, uint64_t peer_id, const char* message, size_t len);

#ifdef __cplusplus
}
#endif
