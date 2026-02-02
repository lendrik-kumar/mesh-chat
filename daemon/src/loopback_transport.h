#pragma once
#include "transport.h"
#include "daemon.h"
class Loopback_transport:public Transport{
    private:
        Daemon& daemon;
    public:
        explicit Loopback_transport(Daemon& daemon);
        void send(uint64_t peerid,const std::string& data)override;

};
