#include "daemon.h"
#include "loopback_transport.h"
#include <iostream>
#include <thread>
#include <chrono>
int main (){
    std::cout << "creating Daemon\n";
    Daemon daemon;
    std::cout << "creating loopback\n";
    Loopback_transport loopback(daemon);
    std::cout << "transport to damon\n";
    daemon.set_transport(&loopback);
    std::cout << "starting Daemon\n";
    daemon.start();
    Daemon::Event eve;
    eve.event_type=Daemon::EventType::peerConnected;
    eve.peerid=1;
    daemon.enqueue_event(eve);
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    Daemon::Event data_event;
    data_event.event_type=Daemon::EventType::dataReceived;
    data_event.peerid=1;
    data_event.peerData="hello\nis is echoining\n";
    daemon.enqueue_event(data_event);
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    std::cout << "stopping daemon\n";
    daemon.stop();;
    std::cout << "over\n";
    return 0;
}
