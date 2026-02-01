#include "meshcore_impl.h"
#include "meshcore.h"
#include <stdlib.h>
#include <string.h>
#include "daemon.h"
#include <new>
struct MeshCore{
    Daemon* daemon;
};
meshcore* meshcore_create_impl(){
    meshcore* core = new (std::nothrow)meshcore;
    if (!core){
        return nullptr;
    }
    core->daemon=new (std::nothrow)Daemon;
    if (!core->daemon){
        delete core;
        return nullptr;
    }
    core->daemon->start();
    return core;
}
void meshcore_destroy_impl(meshcore* core){
    if (!core){
        return ;
    }
    if (core->daemon){
        core->daemon->stop();
        delete core->daemon;
        core->daemon=nullptr;
    }
    delete core;
}
bool meshcore_is_running_impl(const meshcore* core){
    if (!core||!core->daemon){
        return false;
    }
    return core->daemon->is_running();
}
