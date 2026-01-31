#include "daemon.h"
#include <iostream>
#include <thread>
#include <chrono>
int main() {
    std::cout << "test creating daemon\n";
    Daemon d;
    std::cout << "test starting daemon\n";
    d.start();
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    std::cout << "test submitting work\n";
    d.work();
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    std::cout << "test stopping daemon\n";
    d.stop();
    std::cout << "test done exiting\n";
    return 0;
}

