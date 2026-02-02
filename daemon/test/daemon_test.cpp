#include "daemon.h"
#include <iostream>
#include <thread>
#include <chrono>
int main() {
    std::cout << "test creating daemon\n";
    Daemon d;
    std::cout << "test starting daemon\n";
    d.start();
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    std::cout << "test submitting events\n";
    Daemon::Event connect_event;
    connect_event.event_type=Daemon::EventType::peerConnected;
    connect_event.peerid=1;
    d.enqueue_event(connect_event);
    Daemon::Event data_event;
    data_event.event_type=Daemon::EventType::dataReceived;
    //data_event.peer_id=1;
    data_event.peerData="hello is daemon working\n";
    d.enqueue_event(data_event);
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    std::cout << "test stopping daemon\n";
    d.stop();
    std::cout << "test done exiting\n";
    return 0;
}

