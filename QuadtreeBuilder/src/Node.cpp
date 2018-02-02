#include <iostream>
#include <cstddef>
#include <string>
#include <fstream>
#include <cstdlib>

#include "Node.h"

#define CHUNK 0x4000

using namespace std;

Node::Node(Node* par, double prob, long x_min, long x_max, long y_min, long y_max, string fn)
{
    parrent= par;

    xMin= x_min;
    xMax= x_max;
    yMin= y_min;
    yMax= y_max;

    childs[0]= NULL;
    childs[1]= NULL;
    childs[2]= NULL;
    childs[3]= NULL;

    probability= prob;
    filename= fn;

    xSplit= 0;
    ySplit= 0;

    zfile = gzopen(filename.c_str(), "wb");
}

void Node::addPoint(Point* point)
{
    double rnd= (double) rand() / RAND_MAX;
    if(rnd <= probability)
    {
        //Only intensity
        void* buffer= malloc(14);
        memcpy(buffer, point->coordinates, 12);
        memcpy(buffer+12, &(point->intensity), 2);
        gzwrite(zfile, buffer, 14);

        /*
        enable fro RGB support
        void* buffer= malloc(24);
        memcpy(buffer, point->coordinates, 12);
        memcpy(buffer+12, point->normal, 3);
        memcpy(buffer+15, point->color, 6);
        memcpy(buffer+21, &(point->intensity), 2);
        memcpy(buffer+23, &(point->classification), 1);
        gzwrite(zfile, buffer, 24);
        */
    }
    else
    {
        if( xSplit == 0 && ySplit == 0 )
        //Check if childes exists and create them if not
        {
            xSplit= (xMin+xMax)/2;
            ySplit= (yMin+yMax)/2;

            childs[0]= new Node(this, (probability*4), xMin, xSplit, yMin, ySplit, filename + "0");
            childs[1]= new Node(this, (probability*4), xMin, xSplit, ySplit, yMax, filename + "1");
            childs[2]= new Node(this, (probability*4), xSplit, xMax, yMin, ySplit, filename + "2");
            childs[3]= new Node(this, (probability*4), xSplit, xMax, ySplit, yMax, filename + "3");
        }

        //Determine in whitch child node to put new point
        if( point->coordinates[0] < xSplit )
        {
            if( point->coordinates[1] < ySplit )
            {
                childs[0]->addPoint(point);
            }
            else
            {
                childs[1]->addPoint(point);
            }
        }
        else
        {
            if( point->coordinates[1] < ySplit )
            {
                childs[2]->addPoint(point);
            }
            else
            {
                childs[3]->addPoint(point);
            }
        }
    }
}

void Node::saveStructure()
{
    if( childs[0] != NULL )
    {
    }
}

Node::~Node()
{
    delete(childs[0]);
    delete(childs[1]);
    delete(childs[2]);
    delete(childs[3]);

    gzclose(zfile);
    file.close();
}
