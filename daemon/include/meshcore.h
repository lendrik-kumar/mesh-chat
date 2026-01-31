#ifndef MESHCORE_H
#define MESHCORE_H
#include <stdint.h>
#include <stdbool.h>
#ifdef __cplusplus
extern "C"{
#endif
typedef struct MeshCore meshcore;
meshcore* meshcore_create();
void meshcore_destroy(meshcore* core);
bool meshcore_is_running(const meshcore* core);
#ifdef __cplusplus
}
#endif
#endif
