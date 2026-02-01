#pragma once
#include <cstdint>
#include <string>
class Transport{
    public:
        virtual ~Transport()=default;
        virtual void send(uint64_t peerid,const std::string &data)=0;
};
