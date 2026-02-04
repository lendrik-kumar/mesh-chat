/**
 * Daemon Test
 *
 * Tests the Daemon class directly with the new API.
 */

#include "daemon.h"
#include <iostream>
#include <thread>
#include <chrono>
#include <atomic>

std::atomic<int> messages_received(0);

int main() {
    std::cout << "=== Daemon Test ===\n\n";
    
    // Create daemon
    std::cout << "[1] Creating daemon...\n";
    Daemon daemon;
    
    // Set up callbacks
    std::cout << "[2] Setting up callbacks...\n";
    DaemonCallbacks callbacks;
    
    callbacks.on_message = [](uint64_t peer_id, const std::string& uid, 
                              const std::string& message, int64_t timestamp) {
        std::cout << "  >> MESSAGE from peer " << peer_id << " (" << uid << "): " 
                  << message << " @ " << timestamp << "\n";
        messages_received++;
    };
    
    callbacks.on_status = [](int status, const std::string& message) {
        std::cout << "  >> STATUS: " << status << " - " << message << "\n";
    };
    
    callbacks.on_peer = [](uint64_t peer_id, const std::string& uid, bool connected) {
        std::cout << "  >> PEER: " << peer_id << " (" << uid << ") " 
                  << (connected ? "CONNECTED" : "DISCONNECTED") << "\n";
    };
    
    daemon.set_callbacks(callbacks);
    
    // Start daemon
    std::cout << "[3] Starting daemon...\n";
    daemon.start();
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    std::cout << "[4] Daemon running: " << (daemon.is_running() ? "YES" : "NO") << "\n";
    
    // Test peer connect
    std::cout << "\n[5] Simulating peer connect...\n";
    Daemon::Event connect_event;
    connect_event.type = Daemon::EventType::PeerConnected;
    connect_event.peer_id = 1001;
    connect_event.peer_uid = "alice@mesh";
    daemon.enqueue_event(connect_event);
    
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    std::cout << "    Peer count: " << daemon.get_peer_count() << "\n";
    
    // Test data received
    std::cout << "\n[6] Simulating data received...\n";
    Daemon::Event data_event;
    data_event.type = Daemon::EventType::DataReceived;
    data_event.peer_id = 1001;
    data_event.peer_uid = "alice@mesh";
    data_event.data = "Hello from Alice!";
    daemon.enqueue_event(data_event);
    
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    
    // Test send message
    std::cout << "\n[7] Testing send message...\n";
    Daemon::Event send_event;
    send_event.type = Daemon::EventType::SendMessage;
    send_event.peer_id = 1001;
    send_event.data = "Reply to Alice";
    daemon.enqueue_event(send_event);
    
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    
    // Test peer disconnect
    std::cout << "\n[8] Simulating peer disconnect...\n";
    Daemon::Event disconnect_event;
    disconnect_event.type = Daemon::EventType::PeerDisconnected;
    disconnect_event.peer_id = 1001;
    daemon.enqueue_event(disconnect_event);
    
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    std::cout << "    Peer count: " << daemon.get_peer_count() << "\n";
    
    // Stop daemon
    std::cout << "\n[9] Stopping daemon...\n";
    daemon.stop();
    
    std::cout << "\n=== Test Complete ===\n";
    std::cout << "Messages received via callback: " << messages_received.load() << "\n";
    
    return 0;
}

