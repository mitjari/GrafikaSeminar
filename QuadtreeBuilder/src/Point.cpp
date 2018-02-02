#include "Point.h"

Point::Point()
{
    this->coordinates[0]= 0;
    this->coordinates[1]= 0;
    this->coordinates[2]= 0;

    this->normal[0]= 0;
    this->normal[1]= 0;
    this->normal[2]= 0;

    this->color[0]= 0;
    this->color[1]= 0;
    this->color[2]= 0;

    this->intensity= 0;
    this->classification= 0;
}
