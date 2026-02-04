/**
 * Loopback Transport Implementation
 *
 * A simple transport that echoes messages back as received events.
 * Used for testing the daemon without actual network connectivity.
 */

#include "loopback_transport.h"
#include "daemon.h"

Loopback_transport::Loopback_transport(Daemon& d) : daemon_(d) {
}

void Loopback_transport::send(uint64_t peer_id, const std::string& data) {
    // Create a "received" event that echoes the message back
    Daemon::Event event;
    event.type = Daemon::EventType::DataReceived;
    event.peer_id = peer_id;
    event.data = data;
    
    daemon_.enqueue_event(std::move(event));
}

