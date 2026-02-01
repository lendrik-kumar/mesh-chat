#pragma once
#include "meshcore.h"
#ifdef __cplusplus
extern "C"{
#endif
    meshcore* meshcore_create_impl();
    void meshcore_destroy_impl(meshcore* core);
    bool meshcore_is_running_impl(const meshcore* core); 
#ifdef __cplusplus
}
#endif
