#include "meshcore_impl.h"
#include "meshcore.h"
#include <stdlib.h>
#include <string.h>
meshcore* meshcore_create(){
    meshcore* core=(meshcore*)malloc(sizeof(struct MeshCore));
    if (!core){
        return NULL;
    }
    memset(core,0,sizeof(*core));
    core->running=1;
    core->daemon=NULL;
    return core;
}
void meshcore_destroy(meshcore* core){
    if (!core){
        return ;
    }
    core->running=0;
    free(core);
}
bool meshcore_is_running(const meshcore* core){
    if (!core){
        return false;
    }
    return core->running!=0;
}
