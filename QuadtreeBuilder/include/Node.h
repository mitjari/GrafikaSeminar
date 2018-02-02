#ifndef NODE_H
#define NODE_H

#include <vector>
#include <string>
#include <zlib.h>

#include "Point.h"

class Node
{
    public:
    Node(Node*, double, long, long, long, long, string);
    ~Node();

    void addPoint(Point*);
    void readFromDisk();

    void saveStructure();

    private:
    Node* parrent;
    Node* childs[4];

    long xMin, xMax;
    long yMin, yMax;

    long xSplit, ySplit;

    std::vector<Point*> points;

    double probability;
    string filename;

    ofstream file;
    gzFile zfile;
};

#endif // NODE_H
