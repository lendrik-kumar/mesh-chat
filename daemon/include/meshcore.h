/**
 * MeshCore C API - Public Interface
 *
 * This header provides the C-callable API for the mesh networking core.
 * It's designed to be imported by Objective-C/Swift while hiding C++ internals.
 *
 * Architecture:
 *   Swift → Objective-C → This C API → C++ Daemon
 *
 * Thread Safety:
 *   - All functions are thread-safe
 *   - Callbacks are delivered on an internal thread (caller must dispatch to main)
 *
 * Memory:
 *   - Strings passed to callbacks are valid only during the callback
 *   - Caller must copy if needed beyond the callback scope
 */

#ifndef MESHCORE_H
#define MESHCORE_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// =============================================================================
// MARK: - Opaque Types
// =============================================================================

/**
 * Opaque handle to the mesh core instance
 */
typedef struct MeshCore meshcore;

// =============================================================================
// MARK: - Callback Types
// =============================================================================

/**
 * Callback when a message is received from a peer
 *
 * @param user_data   Context pointer passed during registration
 * @param peer_id     Unique identifier of the sending peer
 * @param peer_uid    String identifier of the peer (can be NULL)
 * @param message     The message content (null-terminated, valid during callback only)
 * @param message_len Length of message in bytes
 * @param timestamp   Unix timestamp in milliseconds
 */
typedef void (*meshcore_message_callback)(
    void* user_data,
    uint64_t peer_id,
    const char* peer_uid,
    const char* message,
    size_t message_len,
    int64_t timestamp
);

/**
 * Callback when core status changes
 *
 * @param user_data Context pointer
 * @param status    New status code (0=stopped, 1=running, -1=error)
 * @param message   Human-readable status message
 */
typedef void (*meshcore_status_callback)(
    void* user_data,
    int status,
    const char* message
);

/**
 * Callback when a peer connects or disconnects
 *
 * @param user_data  Context pointer
 * @param peer_id    Unique identifier of the peer
 * @param peer_uid   String identifier (can be NULL for anonymous)
 * @param connected  true if connected, false if disconnected
 */
typedef void (*meshcore_peer_callback)(
    void* user_data,
    uint64_t peer_id,
    const char* peer_uid,
    bool connected
);

/**
 * Grouped callbacks structure
 */
typedef struct {
    meshcore_message_callback on_message;
    meshcore_status_callback  on_status;
    meshcore_peer_callback    on_peer;
    void* user_data;
} meshcore_callbacks;

/**
 * Transport send callback invoked by the daemon when a message
 * needs to be sent to a connected peer.
 *
 * The host platform (Objective-C/Swift layer) is responsible for
 * actually delivering the payload over BLE/Wi-Fi/etc.
 */
typedef int (*meshcore_transport_send_callback)(
    void* user_data,
    uint64_t peer_id,
    const char* message,
    size_t message_len
);

/**
 * Transport callbacks provided by the host platform.
 */
typedef struct {
    meshcore_transport_send_callback send;
    void* user_data;
} meshcore_transport_callbacks;

// =============================================================================
// MARK: - Error Codes
// =============================================================================

typedef enum meshcore_error {
    MESHCORE_OK = 0,
    MESHCORE_ERROR_NOT_RUNNING = -1,
    MESHCORE_ERROR_INVALID_PARAM = -2,
    MESHCORE_ERROR_MESSAGE_TOO_LONG = -3,
    MESHCORE_ERROR_PEER_NOT_FOUND = -4,
    MESHCORE_ERROR_QUEUE_FULL = -5,
    MESHCORE_ERROR_UNKNOWN = -99
} meshcore_error;

// =============================================================================
// MARK: - Constants
// =============================================================================

#define MESHCORE_MAX_MESSAGE_SIZE 4096
#define MESHCORE_VERSION_MAJOR 0
#define MESHCORE_VERSION_MINOR 2
#define MESHCORE_VERSION_PATCH 0

// =============================================================================
// MARK: - Lifecycle Functions
// =============================================================================

/**
 * Create a new mesh core instance
 *
 * @return Handle to the core, or NULL on failure
 */
meshcore* meshcore_create(void);

/**
 * Destroy a mesh core instance and free resources
 *
 * @param core Handle to destroy (safe to pass NULL)
 */
void meshcore_destroy(meshcore* core);

/**
 * Check if the core is running
 *
 * @param core Handle to check
 * @return true if running, false otherwise
 */
bool meshcore_is_running(const meshcore* core);

/**
 * Get the version string
 *
 * @return Static version string (e.g., "0.2.0")
 */
const char* meshcore_get_version(void);

// =============================================================================
// MARK: - Callback Registration
// =============================================================================

/**
 * Set callbacks for receiving events
 *
 * Call with NULL callbacks to unregister.
 * Must be called before start or after stop (not while running).
 *
 * @param core      Handle to the core
 * @param callbacks Pointer to callbacks struct (copied internally)
 */
void meshcore_set_callbacks(meshcore* core, const meshcore_callbacks* callbacks);

/**
 * Set transport callbacks used by daemon -> host message delivery.
 *
 * If NULL is provided, meshcore falls back to loopback transport.
 */
void meshcore_set_transport_callbacks(meshcore* core, const meshcore_transport_callbacks* callbacks);

// =============================================================================
// MARK: - Messaging Functions
// =============================================================================

/**
 * Send a message to a specific peer
 *
 * Non-blocking. Message is queued for delivery.
 *
 * @param core        Handle to the core
 * @param peer_id     Target peer ID (0 for broadcast)
 * @param message     Message content (null-terminated)
 * @param message_len Length of message
 * @return MESHCORE_OK on success, error code on failure
 */
meshcore_error meshcore_send_message(
    meshcore* core,
    uint64_t peer_id,
    const char* message,
    size_t message_len
);

/**
 * Send a message to a peer by UID string
 *
 * @param core    Handle to the core
 * @param uid     Target peer UID string
 * @param message Message content
 * @param message_len Length of message
 * @return MESHCORE_OK on success, error code on failure
 */
meshcore_error meshcore_send_message_to_uid(
    meshcore* core,
    const char* uid,
    const char* message,
    size_t message_len
);

// =============================================================================
// MARK: - Peer Management (Future)
// =============================================================================

/**
 * Get number of connected peers
 *
 * @param core Handle to the core
 * @return Number of peers, or 0 if not running
 */
uint32_t meshcore_get_peer_count(const meshcore* core);

/**
 * Ingest a peer connected event from the host transport.
 */
void meshcore_ingest_peer_connected(meshcore* core, uint64_t peer_id, const char* uid);

/**
 * Ingest a peer disconnected event from the host transport.
 */
void meshcore_ingest_peer_disconnected(meshcore* core, uint64_t peer_id);

/**
 * Ingest an incoming message from the host transport.
 */
void meshcore_ingest_message(meshcore* core, uint64_t peer_id, const char* message, size_t len);

/**
 * Simulate a peer connection (for testing)
 *
 * @param core    Handle to the core
 * @param peer_id ID to assign to the simulated peer
 * @param uid     Optional UID string
 */
void meshcore_simulate_peer_connect(meshcore* core, uint64_t peer_id, const char* uid);

/**
 * Simulate receiving a message (for testing)
 *
 * @param core      Handle to the core
 * @param peer_id   Peer ID the message is from
 * @param message   Message content
 * @param len       Message length
 */
void meshcore_simulate_message(meshcore* core, uint64_t peer_id, const char* message, size_t len);

#ifdef __cplusplus
}
#endif

#endif /* MESHCORE_H */
