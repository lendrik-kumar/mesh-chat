/**
 * MeshCore C API Test
 *
 * Tests the C API with callbacks from pure C.
 * This simulates what Objective-C would do.
 */

#include "meshcore.h"
#include <stdio.h>
#include <string.h>
#include <unistd.h>

// Global counters for test verification
static int g_messages_received = 0;
static int g_status_changes = 0;
static int g_peer_events = 0;

// Callback implementations
static void on_message(void* user_data, uint64_t peer_id, const char* peer_uid,
                       const char* message, size_t len, int64_t timestamp) {
    printf("  [CALLBACK] Message from peer %llu (%s): %.*s\n",
           (unsigned long long)peer_id,
           peer_uid ? peer_uid : "unknown",
           (int)len, message);
    g_messages_received++;
}

static void on_status(void* user_data, int status, const char* message) {
    printf("  [CALLBACK] Status: %d - %s\n", status, message);
    g_status_changes++;
}

static void on_peer(void* user_data, uint64_t peer_id, const char* peer_uid, bool connected) {
    printf("  [CALLBACK] Peer %llu (%s) %s\n",
           (unsigned long long)peer_id,
           peer_uid ? peer_uid : "unknown",
           connected ? "CONNECTED" : "DISCONNECTED");
    g_peer_events++;
}

int main() {
    printf("=== MeshCore C API Test ===\n\n");
    
    // Print version
    printf("[1] Version: %s\n\n", meshcore_get_version());
    
    // Create meshcore
    printf("[2] Creating meshcore...\n");
    meshcore* core = meshcore_create();
    if (!core) {
        printf("ERROR: Failed to create meshcore\n");
        return 1;
    }
    printf("    Created successfully!\n\n");
    
    // Set callbacks
    printf("[3] Setting callbacks...\n");
    meshcore_callbacks callbacks = {
        .on_message = on_message,
        .on_status = on_status,
        .on_peer = on_peer,
        .user_data = NULL
    };
    meshcore_set_callbacks(core, &callbacks);
    printf("    Callbacks set.\n\n");
    
    // Check running state
    printf("[4] Is running: %s\n\n", meshcore_is_running(core) ? "YES" : "NO");
    
    // Simulate peer connect
    printf("[5] Simulating peer connect...\n");
    meshcore_simulate_peer_connect(core, 42, "bob@mesh.local");
    usleep(100000); // 100ms
    printf("    Peer count: %u\n\n", meshcore_get_peer_count(core));
    
    // Simulate message
    printf("[6] Simulating message receive...\n");
    const char* test_msg = "Hello from the C test!";
    meshcore_simulate_message(core, 42, test_msg, strlen(test_msg));
    usleep(200000); // 200ms
    
    // Send a message
    printf("\n[7] Sending message...\n");
    meshcore_error err = meshcore_send_message(core, 42, "Reply from C!", 13);
    printf("    Send result: %d\n", err);
    usleep(200000);
    
    // Test send by UID
    printf("\n[8] Sending message by UID...\n");
    err = meshcore_send_message_to_uid(core, "bob@mesh.local", "Hello Bob!", 10);
    printf("    Send result: %d\n", err);
    usleep(100000);
    
    // Destroy
    printf("\n[9] Destroying meshcore...\n");
    meshcore_destroy(core);
    
    // Summary
    printf("\n=== Test Summary ===\n");
    printf("Messages received: %d\n", g_messages_received);
    printf("Status changes:    %d\n", g_status_changes);
    printf("Peer events:       %d\n", g_peer_events);
    printf("\nTest complete!\n");
    
    return 0;
}
