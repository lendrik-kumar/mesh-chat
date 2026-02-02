#include "loopback_transport.h"
#include "daemon.h"
    Loopback_transport::Loopback_transport(Daemon&d):daemon(d){}
    void Loopback_transport::send(uint64_t peerkiid,const std::string& data){
    Daemon::Event eventy;
    eventy.event_type=Daemon::EventType::dataReceived;
    eventy.peerid=peerkiid;
    eventy.peerData=data;
    daemon.enqueue_event(std::move(eventy));
    }

