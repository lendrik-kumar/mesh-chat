/**
 * Loopback Transport - Test/Debug Transport
 *
 * This transport echoes messages back as received events.
 * Useful for testing the daemon without network connectivity.
 */

#pragma once

#include "transport.h"
#include "daemon.h"

class Loopback_transport : public Transport {
public:
    explicit Loopback_transport(Daemon& daemon);
    
    void send(uint64_t peer_id, const std::string& data) override;

private:
    Daemon& daemon_;
};
