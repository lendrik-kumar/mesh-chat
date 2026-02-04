/**
 * Daemon Implementation
 *
 * Core event processing engine for mesh networking.
 * All heavy lifting happens here in a background thread.
 */

#include "daemon.h"
#include <iostream>
#include <chrono>

// =============================================================================
// MARK: - Constructor/Destructor
// =============================================================================

Daemon::Daemon()
    : running_(false)
    , busy_(false)
    , transport_(nullptr)
{
}

Daemon::~Daemon() {
    stop();
}

// =============================================================================
// MARK: - Lifecycle
// =============================================================================

void Daemon::start() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (running_) {
        return; // Already running
    }
    
    running_ = true;
    worker_thread_ = std::thread(&Daemon::worker_loop, this);
    
    // Notify status change
    if (callbacks_.on_status) {
        callbacks_.on_status(1, "Daemon started");
    }
}

void Daemon::stop() {
    {
        std::lock_guard<std::mutex> lock(mutex_);
        
        if (!running_) {
            return; // Already stopped
        }
        
        running_ = false;
    }
    
    // Wake up the worker
    cv_.notify_one();
    
    // Wait for worker to finish
    if (worker_thread_.joinable()) {
        worker_thread_.join();
    }
    
    // Notify status change
    if (callbacks_.on_status) {
        callbacks_.on_status(0, "Daemon stopped");
    }
}

bool Daemon::is_running() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return running_;
}

bool Daemon::is_busy() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return busy_;
}

// =============================================================================
// MARK: - Event Submission
// =============================================================================

void Daemon::enqueue_event(Event event) {
    {
        std::lock_guard<std::mutex> lock(mutex_);
        
        if (!running_) {
            return; // Don't accept events when stopped
        }
        
        if (event.timestamp == 0) {
            event.timestamp = current_timestamp_ms();
        }
        
        event_queue_.push(std::move(event));
    }
    
    cv_.notify_one();
}

// =============================================================================
// MARK: - Transport
// =============================================================================

void Daemon::set_transport(Transport* t) {
    std::lock_guard<std::mutex> lock(mutex_);
    transport_ = t;
}

// =============================================================================
// MARK: - Callbacks
// =============================================================================

void Daemon::set_callbacks(const DaemonCallbacks& callbacks) {
    std::lock_guard<std::mutex> lock(mutex_);
    callbacks_ = callbacks;
}

// =============================================================================
// MARK: - Peer Management
// =============================================================================

uint32_t Daemon::get_peer_count() const {
    std::lock_guard<std::mutex> lock(peers_mutex_);
    return static_cast<uint32_t>(peers_.size());
}

void Daemon::add_peer(uint64_t peer_id, const std::string& uid) {
    std::lock_guard<std::mutex> lock(peers_mutex_);
    
    PeerInfo info;
    info.peer_id = peer_id;
    info.uid = uid;
    info.connected = true;
    info.connected_at = current_timestamp_ms();
    
    peers_[peer_id] = info;
}

void Daemon::remove_peer(uint64_t peer_id) {
    std::lock_guard<std::mutex> lock(peers_mutex_);
    peers_.erase(peer_id);
}

bool Daemon::has_peer(uint64_t peer_id) const {
    std::lock_guard<std::mutex> lock(peers_mutex_);
    return peers_.find(peer_id) != peers_.end();
}

// =============================================================================
// MARK: - Direct Send
// =============================================================================

void Daemon::send_to_peer(uint64_t peer_id, const std::string& data) {
    Transport* t = nullptr;
    
    {
        std::lock_guard<std::mutex> lock(mutex_);
        t = transport_;
    }
    
    if (t) {
        t->send(peer_id, data);
    }
}

void Daemon::send_to_uid(const std::string& uid, const std::string& data) {
    uint64_t peer_id = 0;
    
    {
        std::lock_guard<std::mutex> lock(peers_mutex_);
        
        for (const auto& pair : peers_) {
            if (pair.second.uid == uid) {
                peer_id = pair.first;
                break;
            }
        }
    }
    
    if (peer_id != 0) {
        send_to_peer(peer_id, data);
    }
}

// =============================================================================
// MARK: - Worker Thread
// =============================================================================

void Daemon::worker_loop() {
    std::unique_lock<std::mutex> lock(mutex_);
    
    while (running_) {
        // Wait for work or shutdown
        cv_.wait(lock, [this] {
            return !event_queue_.empty() || !running_;
        });
        
        if (!running_) {
            break;
        }
        
        // Get next event
        Event event = std::move(event_queue_.front());
        event_queue_.pop();
        
        busy_ = true;
        lock.unlock();
        
        // Process event (outside the lock)
        switch (event.type) {
            case EventType::PeerConnected:
                handle_peer_connected(event);
                break;
                
            case EventType::PeerDisconnected:
                handle_peer_disconnected(event);
                break;
                
            case EventType::DataReceived:
                handle_data_received(event);
                break;
                
            case EventType::SendMessage:
                handle_send_message(event);
                break;
                
            case EventType::Shutdown:
                lock.lock();
                running_ = false;
                continue;
        }
        
        lock.lock();
        busy_ = false;
    }
}

// =============================================================================
// MARK: - Event Handlers
// =============================================================================

void Daemon::handle_peer_connected(const Event& event) {
    std::cout << "[Daemon] Peer connected: " << event.peer_id 
              << " (uid: " << event.peer_uid << ")\n";
    
    // Add to peer list
    add_peer(event.peer_id, event.peer_uid);
    
    // Notify via callback
    if (callbacks_.on_peer) {
        callbacks_.on_peer(event.peer_id, event.peer_uid, true);
    }
}

void Daemon::handle_peer_disconnected(const Event& event) {
    std::cout << "[Daemon] Peer disconnected: " << event.peer_id << "\n";
    
    // Get UID before removing
    std::string uid;
    {
        std::lock_guard<std::mutex> lock(peers_mutex_);
        auto it = peers_.find(event.peer_id);
        if (it != peers_.end()) {
            uid = it->second.uid;
        }
    }
    
    // Remove from peer list
    remove_peer(event.peer_id);
    
    // Notify via callback
    if (callbacks_.on_peer) {
        callbacks_.on_peer(event.peer_id, uid, false);
    }
}

void Daemon::handle_data_received(const Event& event) {
    std::cout << "[Daemon] Data received from peer " << event.peer_id 
              << ": " << event.data << "\n";
    
    // Get peer UID
    std::string uid;
    {
        std::lock_guard<std::mutex> lock(peers_mutex_);
        auto it = peers_.find(event.peer_id);
        if (it != peers_.end()) {
            uid = it->second.uid;
        }
    }
    
    // Notify via callback
    if (callbacks_.on_message) {
        callbacks_.on_message(event.peer_id, uid, event.data, event.timestamp);
    }
    
    // NOTE: Removed echo - loopback transport already handles this for testing
    // In production, the transport would send to the actual peer
}

void Daemon::handle_send_message(const Event& event) {
    std::cout << "[Daemon] Sending message to peer " << event.peer_id 
              << ": " << event.data << "\n";
    
    send_to_peer(event.peer_id, event.data);
}

// =============================================================================
// MARK: - Utilities
// =============================================================================

int64_t Daemon::current_timestamp_ms() {
    auto now = std::chrono::system_clock::now();
    auto epoch = now.time_since_epoch();
    return std::chrono::duration_cast<std::chrono::milliseconds>(epoch).count();
}
