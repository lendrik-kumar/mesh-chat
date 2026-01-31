#include "daemon.h"
#include <iostream>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>
Daemon::Daemon(){
    running=0;
    busy=0;
}
void Daemon::start(){
    std::lock_guard<std::mutex>lock(mtx);
    if (running){return ;}
    running=true;
    worker=std::thread(&Daemon::loopy,this);
}
void Daemon::stop(){
    {
    std::lock_guard<std::mutex>lock(mtx);
    
    if (!running){return ;}
    running=false;
    }
    cv.notify_one();
    if (worker.joinable()){
        worker.join();
    }
}
bool Daemon::is_running()const{
    std::lock_guard<std::mutex>lock(mtx);
    return running;
}
bool Daemon::is_busy()const{
    std::lock_guard<std::mutex>lock(mtx);
    return busy;
}
void Daemon::work(){
    {
        std::lock_guard<std::mutex>lock(mtx);
        if (!running){
            return ;
        }
        // need to insert here for worker queue , queue will contain what data type int ??? or like what 
    }
    cv.notify_one();
}
void Daemon::loopy(){
    std::unique_lock<std::mutex>lock(mtx);
    while(running){
        cv.wait(lock,[&]{
            return !work_queue.empty() || !running;
        });
        if (!running){
            break;
        }
        busy=true;
        lock.unlock();
        // queeue se pop karo aur bc kaam karo zindagi mein
        lock.lock();
        busy=false;
    }
};
Daemon::~Daemon(){
    stop();
}
