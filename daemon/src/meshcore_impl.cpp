/**
 * MeshCore Implementation
 *
 * This file provides the C-callable implementation that wraps the C++ Daemon.
 * It handles:
 *   - Memory management at the C/C++ boundary
 *   - Callback translation from C++ lambdas to C function pointers
 *   - Thread-safe access to the daemon instance
 */

#include "meshcore_impl.h"
#include "meshcore.h"
#include "daemon.h"
#include "loopback_transport.h"

#include <new>
#include <cstring>
#include <string>

struct MeshCore;

class HostCallbackTransport : public Transport {
public:
    explicit HostCallbackTransport(MeshCore* core)
        : core_(core) {}

    void send(uint64_t peer_id, const std::string& data) override;

private:
    MeshCore* core_;
};

// =============================================================================
// MARK: - Internal Structure
// =============================================================================

/**
 * MeshCore instance structure
 * Contains the daemon and associated objects
 */
struct MeshCore {
    Daemon*                      daemon;
    Loopback_transport*          loopback;      // Default fallback transport
    HostCallbackTransport*       host_transport;
    meshcore_callbacks           callbacks;
    bool                         has_callbacks;
    meshcore_transport_callbacks transport_callbacks;
    bool                         has_transport_callbacks;
};

// Version string
static const char* VERSION_STRING = "0.2.0";

static void configure_transport(MeshCore* core) {
    if (!core || !core->daemon) {
        return;
    }

    if (core->has_transport_callbacks && core->host_transport) {
        core->daemon->set_transport(core->host_transport);
        return;
    }

    core->daemon->set_transport(core->loopback);
}

void HostCallbackTransport::send(uint64_t peer_id, const std::string& data) {
    if (!core_ || !core_->has_transport_callbacks || !core_->transport_callbacks.send) {
        return;
    }

    core_->transport_callbacks.send(
        core_->transport_callbacks.user_data,
        peer_id,
        data.c_str(),
        data.length()
    );
}

// =============================================================================
// MARK: - Callback Adapter
// =============================================================================

/**
 * Sets up C++ callbacks that forward to C function pointers
 */
static void setup_daemon_callbacks(MeshCore* core) {
    if (!core || !core->daemon || !core->has_callbacks) {
        return;
    }
    
    DaemonCallbacks cpp_callbacks;
    
    // Message callback adapter
    if (core->callbacks.on_message) {
        cpp_callbacks.on_message = [core](
            uint64_t peer_id,
            const std::string& peer_uid,
            const std::string& message,
            int64_t timestamp
        ) {
            if (core->callbacks.on_message) {
                core->callbacks.on_message(
                    core->callbacks.user_data,
                    peer_id,
                    peer_uid.empty() ? nullptr : peer_uid.c_str(),
                    message.c_str(),
                    message.length(),
                    timestamp
                );
            }
        };
    }
    
    // Status callback adapter
    if (core->callbacks.on_status) {
        cpp_callbacks.on_status = [core](int status, const std::string& message) {
            if (core->callbacks.on_status) {
                core->callbacks.on_status(
                    core->callbacks.user_data,
                    status,
                    message.c_str()
                );
            }
        };
    }
    
    // Peer callback adapter
    if (core->callbacks.on_peer) {
        cpp_callbacks.on_peer = [core](
            uint64_t peer_id,
            const std::string& peer_uid,
            bool connected
        ) {
            if (core->callbacks.on_peer) {
                core->callbacks.on_peer(
                    core->callbacks.user_data,
                    peer_id,
                    peer_uid.empty() ? nullptr : peer_uid.c_str(),
                    connected
                );
            }
        };
    }
    
    core->daemon->set_callbacks(cpp_callbacks);
}

// =============================================================================
// MARK: - Lifecycle Implementation
// =============================================================================

meshcore* meshcore_create_impl(void) {
    // Allocate MeshCore structure
    MeshCore* core = new (std::nothrow) MeshCore;
    if (!core) {
        return nullptr;
    }
    
    // Initialize all fields
    core->daemon = nullptr;
    core->loopback = nullptr;
    core->host_transport = nullptr;
    core->has_callbacks = false;
    core->has_transport_callbacks = false;
    std::memset(&core->callbacks, 0, sizeof(core->callbacks));
    std::memset(&core->transport_callbacks, 0, sizeof(core->transport_callbacks));
    
    // Create daemon
    core->daemon = new (std::nothrow) Daemon;
    if (!core->daemon) {
        delete core;
        return nullptr;
    }

    core->host_transport = new (std::nothrow) HostCallbackTransport(core);
    
    // Create and attach loopback transport (for testing)
    core->loopback = new (std::nothrow) Loopback_transport(*core->daemon);
    if (!core->loopback) {
        delete core->host_transport;
        delete core->daemon;
        delete core;
        return nullptr;
    }
    configure_transport(core);
    
    // Start the daemon
    core->daemon->start();
    
    return core;
}

void meshcore_destroy_impl(meshcore* core) {
    if (!core) {
        return;
    }
    
    // Stop and delete daemon
    if (core->daemon) {
        core->daemon->stop();
        delete core->daemon;
        core->daemon = nullptr;
    }
    
    // Delete loopback transport
    if (core->loopback) {
        delete core->loopback;
        core->loopback = nullptr;
    }

    if (core->host_transport) {
        delete core->host_transport;
        core->host_transport = nullptr;
    }
    
    delete core;
}

bool meshcore_is_running_impl(const meshcore* core) {
    if (!core || !core->daemon) {
        return false;
    }
    return core->daemon->is_running();
}

const char* meshcore_get_version_impl(void) {
    return VERSION_STRING;
}

// =============================================================================
// MARK: - Callback Implementation
// =============================================================================

void meshcore_set_callbacks_impl(meshcore* core, const meshcore_callbacks* callbacks) {
    if (!core) {
        return;
    }
    
    if (callbacks) {
        core->callbacks = *callbacks;
        core->has_callbacks = true;
    } else {
        std::memset(&core->callbacks, 0, sizeof(core->callbacks));
        core->has_callbacks = false;
    }
    
    // Update daemon callbacks
    setup_daemon_callbacks(core);
}

void meshcore_set_transport_callbacks_impl(meshcore* core, const meshcore_transport_callbacks* callbacks) {
    if (!core) {
        return;
    }

    if (callbacks && callbacks->send) {
        core->transport_callbacks = *callbacks;
        core->has_transport_callbacks = true;
    } else {
        std::memset(&core->transport_callbacks, 0, sizeof(core->transport_callbacks));
        core->has_transport_callbacks = false;
    }

    configure_transport(core);
}

// =============================================================================
// MARK: - Messaging Implementation
// =============================================================================

meshcore_error meshcore_send_message_impl(
    meshcore* core,
    uint64_t peer_id,
    const char* message,
    size_t len
) {
    if (!core || !core->daemon) {
        return MESHCORE_ERROR_UNKNOWN;
    }
    
    if (!core->daemon->is_running()) {
        return MESHCORE_ERROR_NOT_RUNNING;
    }
    
    if (!message || len == 0) {
        return MESHCORE_ERROR_INVALID_PARAM;
    }
    
    if (len > MESHCORE_MAX_MESSAGE_SIZE) {
        return MESHCORE_ERROR_MESSAGE_TOO_LONG;
    }

    if (peer_id != 0 && !core->daemon->has_peer(peer_id)) {
        return MESHCORE_ERROR_PEER_NOT_FOUND;
    }
    
    // Create send event
    Daemon::Event event;
    event.type = Daemon::EventType::SendMessage;
    event.peer_id = peer_id;
    event.data = std::string(message, len);
    
    core->daemon->enqueue_event(std::move(event));
    
    return MESHCORE_OK;
}

meshcore_error meshcore_send_message_to_uid_impl(
    meshcore* core,
    const char* uid,
    const char* message,
    size_t len
) {
    if (!core || !core->daemon) {
        return MESHCORE_ERROR_UNKNOWN;
    }
    
    if (!core->daemon->is_running()) {
        return MESHCORE_ERROR_NOT_RUNNING;
    }
    
    if (!uid || !message || len == 0) {
        return MESHCORE_ERROR_INVALID_PARAM;
    }
    
    if (len > MESHCORE_MAX_MESSAGE_SIZE) {
        return MESHCORE_ERROR_MESSAGE_TOO_LONG;
    }
    
    // Direct send by UID (doesn't go through queue for lower latency)
    if (!core->daemon->send_to_uid(uid, std::string(message, len))) {
        return MESHCORE_ERROR_PEER_NOT_FOUND;
    }

    return MESHCORE_OK;
}

// =============================================================================
// MARK: - Peer Management Implementation
// =============================================================================

uint32_t meshcore_get_peer_count_impl(const meshcore* core) {
    if (!core || !core->daemon) {
        return 0;
    }
    return core->daemon->get_peer_count();
}

void meshcore_ingest_peer_connected_impl(meshcore* core, uint64_t peer_id, const char* uid) {
    if (!core || !core->daemon || !core->daemon->is_running()) {
        return;
    }

    Daemon::Event event;
    event.type = Daemon::EventType::PeerConnected;
    event.peer_id = peer_id;
    event.peer_uid = uid ? uid : "";

    core->daemon->enqueue_event(std::move(event));
}

void meshcore_ingest_peer_disconnected_impl(meshcore* core, uint64_t peer_id) {
    if (!core || !core->daemon || !core->daemon->is_running()) {
        return;
    }

    Daemon::Event event;
    event.type = Daemon::EventType::PeerDisconnected;
    event.peer_id = peer_id;

    core->daemon->enqueue_event(std::move(event));
}

void meshcore_ingest_message_impl(meshcore* core, uint64_t peer_id, const char* message, size_t len) {
    if (!core || !core->daemon || !core->daemon->is_running() || !message || len == 0) {
        return;
    }

    Daemon::Event event;
    event.type = Daemon::EventType::DataReceived;
    event.peer_id = peer_id;
    event.data = std::string(message, len);

    core->daemon->enqueue_event(std::move(event));
}

// =============================================================================
// MARK: - Test Helpers Implementation
// =============================================================================

void meshcore_simulate_peer_connect_impl(meshcore* core, uint64_t peer_id, const char* uid) {
    if (!core || !core->daemon) {
        return;
    }
    
    Daemon::Event event;
    event.type = Daemon::EventType::PeerConnected;
    event.peer_id = peer_id;
    event.peer_uid = uid ? uid : "";
    
    core->daemon->enqueue_event(std::move(event));
}

void meshcore_simulate_message_impl(meshcore* core, uint64_t peer_id, const char* message, size_t len) {
    if (!core || !core->daemon || !message) {
        return;
    }
    
    Daemon::Event event;
    event.type = Daemon::EventType::DataReceived;
    event.peer_id = peer_id;
    event.data = std::string(message, len);
    
    core->daemon->enqueue_event(std::move(event));
}
