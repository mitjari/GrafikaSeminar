#include <iostream>
#include <fstream>
#include <iostream>
#include <limits.h>
#include <math.h>
#include <string>

#include "Node.h"

#include "lasreader.hpp"
#include "laswriter.hpp"

using namespace std;

int main(int argc, char* argv[])
{
    /*
    if( argc != 7 ){
        cout<< "---Neustrezno število argumentov!---\n";
        cout<< "Uporaba: QuadtreeBuider file depth xMin xMax yMin yMax\n";
        return -1;
    }

    string filename= argv[1];

    int depth;
    long minX, maxX, minY, maxY;
    try
    {
        depth= stoi(argv[2]);

        minX= stoi(argv[3]);
        maxX= stoi(argv[4]);
        minY= stoi(argv[5]);
        maxY= stoi(argv[6]);
    } catch(...)
    {
        cout<< "---Neustrezni argumenti!---\n";
        cout<< "Uporaba: QuadtreeBuider file depth xMin xMax yMin yMax\n";
    }
    */

    if( argc != 5 ){
        cout<< "---Neustrezno število argumentov!---\n";
        cout<< "Uporaba: QuadtreeBuider depth probability file outdir";
        return -1;
    }

    int depth= stoi(argv[1]);
    double keepProb= stod(argv[2]);
    string filename= argv[3];
    string outdir= argv[4];

    LASreadOpener lasreadopener;
    lasreadopener.set_file_name(filename.c_str());
    LASreader* lasreader = lasreadopener.open();

    I32 minX= lasreader->header.min_x;
    I32 maxX= lasreader->header.max_x;
    I32 minY= lasreader->header.min_y;
    I32 maxY= lasreader->header.max_y;
    I32 minZ= lasreader->header.min_z;
    I32 maxZ= lasreader->header.max_z;

    cout<< "Zapisujem konfiguracijsko datoteko..."; cout.flush();
    ofstream myfile;
    myfile.open (outdir + "/config.txt");
    myfile<< depth << endl << minX << endl << maxX << endl << minY << endl << maxY << endl << minZ << endl << maxZ;
    myfile.close();
    cout<< "OK\n";

    long pointCount= 0;
    Node root(NULL, 1 / pow(4, depth), minX, maxX, minY, maxY, outdir +"/r");

    cout<< "Dodanih točk: 0"; cout.flush();
    while( lasreader->read_point() )
    {
        double rnd= (double) rand() / RAND_MAX;
        if( rnd <= keepProb){
             Point* p= new Point();

            p->coordinates[0]= lasreader->point.X * lasreader->header.x_scale_factor;
            p->coordinates[1]= lasreader->point.Y * lasreader->header.y_scale_factor;
            p->coordinates[2]= lasreader->point.Z * lasreader->header.z_scale_factor;

            p->intensity= lasreader->point.intensity;

             /*
            Enable for RGB support
            U16* tmp= lasreader->point.rgb;
            p->color[0]= tmp[0];
            p->color[1]= tmp[1];
            p->color[2]= tmp[2];
            p->classification= lasreader->point.classification;
            */

            root.addPoint(p);
        }

        pointCount++;
        if( pointCount % 1000000 == 0 ) cout << "\r" << "Obdelanih točk: " << pointCount; cout.flush();
    }
    cout<< endl << "******Skupaj dodanih " << pointCount << " točk******"  << endl;
}
