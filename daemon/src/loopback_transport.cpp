#include "loopback_transport.h"
    Loopback_transport::Loopback_transport(Daemon&d):daemon(d){}
    void Loopback_transport::send(uint64_t peerkiid,const std::string& data){}{
    Daemon::Event event;
    event.event_type=Daemon::EventType::dataReceived;
    event.peerid=peerkiid;
    event.peerData=data;
    daemon.enqueue_event(std::move(event));
}
