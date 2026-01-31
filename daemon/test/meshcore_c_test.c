#include "meshcore.h"
#include <stdio.h>
#include <unistd.h>
int main (){
    printf("c-test creating meshcore\n");
    meshcore* core=meshcore_create();
    if (!core){
        printf("test failed to create meshcore\n");
        return 1;
    }
    printf("test starting daemon\n");
    sleep(1); // soja bhadve
    printf("test destroying meshcore\n");
    meshcore_destroy(core);
    printf("test done,existing cleanly\n");
    return 0;
}
