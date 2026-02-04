/**
 * Daemon - Core Event Processing Engine
 *
 * This class manages the main event loop for mesh networking.
 * It processes events from a queue in a background thread.
 *
 * Thread Model:
 *   - Single worker thread processes events sequentially
 *   - Thread-safe event submission from any thread
 *   - Callbacks invoked on the worker thread (caller must dispatch)
 *
 * Event Types:
 *   - Peer connection/disconnection
 *   - Data received from peers
 *   - Internal commands (send, etc.)
 */

#pragma once

#include <mutex>
#include <condition_variable>
#include <thread>
#include <queue>
#include <cstdint>
#include <string>
#include <functional>
#include <unordered_map>
#include "transport.h"

class Transport;

// =============================================================================
// MARK: - Callback Types
// =============================================================================

/**
 * Callback signatures for Daemon events
 */
struct DaemonCallbacks {
    using MessageCallback = std::function<void(
        uint64_t peer_id,
        const std::string& peer_uid,
        const std::string& message,
        int64_t timestamp
    )>;
    
    using StatusCallback = std::function<void(int status, const std::string& message)>;
    
    using PeerCallback = std::function<void(
        uint64_t peer_id,
        const std::string& peer_uid,
        bool connected
    )>;
    
    MessageCallback on_message;
    StatusCallback  on_status;
    PeerCallback    on_peer;
};

// =============================================================================
// MARK: - Peer Info
// =============================================================================

struct PeerInfo {
    uint64_t    peer_id;
    std::string uid;
    bool        connected;
    int64_t     connected_at;
};

// =============================================================================
// MARK: - Daemon Class
// =============================================================================

class Daemon {
public:
    // Event types for the work queue
    enum class EventType {
        PeerConnected,
        PeerDisconnected,
        DataReceived,
        SendMessage,
        Shutdown
    };
    
    // Event structure
    struct Event {
        EventType   type;
        uint64_t    peer_id;
        std::string peer_uid;
        std::string data;
        int64_t     timestamp;
        
        Event() : type(EventType::DataReceived), peer_id(0), timestamp(0) {}
    };
    
    // Constructor/Destructor
    Daemon();
    ~Daemon();
    
    // Non-copyable
    Daemon(const Daemon&) = delete;
    Daemon& operator=(const Daemon&) = delete;
    
    // Lifecycle
    void start();
    void stop();
    bool is_running() const;
    bool is_busy() const;
    
    // Event submission (thread-safe)
    void enqueue_event(Event event);
    
    // Transport
    void set_transport(Transport* t);
    
    // Callbacks (set before start())
    void set_callbacks(const DaemonCallbacks& callbacks);
    
    // Peer management
    uint32_t get_peer_count() const;
    void add_peer(uint64_t peer_id, const std::string& uid);
    void remove_peer(uint64_t peer_id);
    bool has_peer(uint64_t peer_id) const;
    
    // Direct send (bypasses queue for low latency)
    void send_to_peer(uint64_t peer_id, const std::string& data);
    void send_to_uid(const std::string& uid, const std::string& data);
    
private:
    // Worker thread function
    void worker_loop();
    
    // Event handlers
    void handle_peer_connected(const Event& event);
    void handle_peer_disconnected(const Event& event);
    void handle_data_received(const Event& event);
    void handle_send_message(const Event& event);
    
    // Get current timestamp
    static int64_t current_timestamp_ms();
    
    // State
    bool running_;
    bool busy_;
    
    // Threading
    mutable std::mutex mutex_;
    std::condition_variable cv_;
    std::thread worker_thread_;
    
    // Event queue
    std::queue<Event> event_queue_;
    
    // Transport layer
    Transport* transport_;
    
    // Callbacks
    DaemonCallbacks callbacks_;
    
    // Connected peers
    std::unordered_map<uint64_t, PeerInfo> peers_;
    mutable std::mutex peers_mutex_;
};

