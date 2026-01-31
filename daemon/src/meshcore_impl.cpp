#include "meshcore_impl.h"
#include "meshcore.h"
#include <stdlib.h>
#include <string.h>
meshcore* meshcore_create(){
    meshcore* core = new (std::nothrow)meshcore;
    if (!core){
        return NULL;
    }
    core->daemon=new (std::nothrow)Daemon;
    if (!core->daemon){
        delete core;
        return nullptr;
    }
    core->daemon->start();
    return core;
}
void meshcore_destroy(meshcore* core){
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
bool meshcore_is_running(const meshcore* core){
    if (!core||!core->daemon){
        return false;
    }
    return core->daemon->is_running();
}
