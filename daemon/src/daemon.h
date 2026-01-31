#pragma once
#include <mutex>
#include <condition_variable>
#include <thread>
#include <queue>
class Daemon{
    private:
        bool running;
        bool busy;
        void loopy();
        mutable std::mutex mtx;
        std::condition_variable cv;
        std::thread worker;
        std::queue<int>work_queue;
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
};

