cmake_minimum_required(VERSION 3.16)

project(meshcore
    VERSION 0.1
    LANGUAGES C CXX
)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(meshcore
    src/daemon.cpp
    src/meshcore_impl.cpp
)

target_include_directories(meshcore
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

find_package(Threads REQUIRED)
target_link_libraries(meshcore PRIVATE Threads::Threads)
add_executable(daemon_test
    test/daemon_test.cpp
)
target_link_libraries(daemon_test
    PRIVATE meshcore
)
target_include_directories(daemon_test
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)
add_executable(meshcore_c_test
    test/meshcore_c_test.c
)

target_link_libraries(meshcore_c_test
    PRIVATE meshcore
)

