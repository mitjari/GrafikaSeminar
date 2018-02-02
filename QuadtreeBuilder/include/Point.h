#ifndef POINT_H
#define POINT_H

#include <vector>

#include "lasreader.hpp"

using namespace std;

struct Point
{
    Point();
    I32 coordinates[3];
    U8 normal[3];
    U16 color[3];
    U16 intensity;
    U8 classification;
    U16 elevation;
};

#endif // POINT_H
