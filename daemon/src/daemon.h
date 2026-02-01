#pragma once
#include <mutex>
#include <condition_variable>
#include <thread>
#include <queue>
#include <cstdint>
#include <string>
#include "transport.h"
class Transport;
class Daemon{
    private:
        bool running;
        bool busy;
        void loopy();
        mutable std::mutex mtx;
        std::condition_variable cv;
        std::thread worker;
        Transport* transport;
    public:
        Daemon();
        void start();
        void stop();
        bool is_running()const;
        bool is_busy()const;
        void work();
        Daemon(const Daemon&)=delete;
        Daemon&operator=(const Daemon&)=delete;
        ~Daemon();
        enum class EventType{peerConnected,peerDisconnected,dataReceived};
        struct Event{
            EventType event_type;
            uint64_t peerid;
            std::string peerData;
        };
        void enqueue_event(Event event);
        void set_transport(Transport* t);
        void sendy(uint64_t peerid,const std::string& data);
    private:
        std::queue<Event>work_queue;
};

