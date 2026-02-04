/**
 * Loopback Transport Test
 *
 * Tests the loopback transport which echoes messages back.
 */

#include "daemon.h"
#include "loopback_transport.h"
#include <iostream>
#include <thread>
#include <chrono>
#include <atomic>

std::atomic<int> echo_count(0);

int main() {
    std::cout << "=== Loopback Transport Test ===\n\n";
    
    // Create daemon
    std::cout << "[1] Creating daemon...\n";
    Daemon daemon;
    
    // Set up callback to count echoes
    DaemonCallbacks callbacks;
    callbacks.on_message = [](uint64_t peer_id, const std::string& uid,
                              const std::string& msg, int64_t ts) {
        std::cout << "  >> ECHO received: " << msg << "\n";
        echo_count++;
    };
    daemon.set_callbacks(callbacks);
    
    // Create loopback transport
    std::cout << "[2] Creating loopback transport...\n";
    Loopback_transport loopback(daemon);
    daemon.set_transport(&loopback);
    
    // Start daemon
    std::cout << "[3] Starting daemon...\n";
    daemon.start();
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    // Simulate peer connect
    std::cout << "[4] Connecting peer...\n";
    Daemon::Event connect_event;
    connect_event.type = Daemon::EventType::PeerConnected;
    connect_event.peer_id = 1;
    connect_event.peer_uid = "loopback-peer";
    daemon.enqueue_event(connect_event);
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    // Send data (should echo back via loopback)
    std::cout << "[5] Sending data (will echo)...\n";
    Daemon::Event data_event;
    data_event.type = Daemon::EventType::DataReceived;
    data_event.peer_id = 1;
    data_event.data = "Hello, this should echo!";
    daemon.enqueue_event(data_event);
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    // Send another
    std::cout << "[6] Sending more data...\n";
    data_event.data = "Second message test";
    daemon.enqueue_event(data_event);
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    // Stop
    std::cout << "\n[7] Stopping daemon...\n";
    daemon.stop();
    
    std::cout << "\n=== Test Complete ===\n";
    std::cout << "Echo count: " << echo_count.load() << "\n";
    
    return 0;
}
