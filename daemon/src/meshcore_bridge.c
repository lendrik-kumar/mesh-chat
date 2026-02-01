#include "meshcore.h"
#include "meshcore_impl.h"
meshcore* meshcore_create(){
    return meshcore_create_impl();
}
void meshcore_destroy(meshcore* core){
    meshcore_destroy_impl(core);
}
bool is_meshcore_running(const meshcore* core){
    return meshcore_is_running_impl(core);
}
