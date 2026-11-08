// g++ -std=c++17 -O3 -fopenmp search.cpp -o search
// ./search n step-generations [replay-input.csv] > outcomes.csv
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>
using std::max;
constexpr int M=12000,END=120*M,AREA=1024002,LIFE=M;
constexpr double L2=.6931471805599453094;
enum Seed {P2,C6,G4,GUN,STALK};
enum Script {MINE,CIVIL,MIX,ARMS,IDLE};
struct Profile {int size,w;double births,surv,db,ds;bool dies, emits;};
// Measured means per complete window, extrapolated and phase-centered in run().
constexpr Profile plants[]={{3,2,2,1,0,0,false,false},{6,2,3,6,0,0,false,false},
  {6,4,5,1.5,0,0,true,false},{52,20,20.95,36.05,.25,.075,false,true},
  {36,20,5.958333333333333,39.625,0,.75,false,false}};
struct Economy {int id, family;double price, birthCost, scale, halfSec;};
enum Family {LINEAR, EXP, QUAD, RENT};
struct Out {double bank=0,peak=0,heat=0;int orders=1,first=-1,guard=-1,gun=-1,def=-1,area=-1,cap=-1,n5=0,n30=0,n60=0,n40=0,nmines=0,nguns=0;};
double price(Economy e,double h,double cells){
  const double x=cells/3;
  if(e.family==EXP){
    const double k=L2/e.scale;
    return 3*e.price*std::exp(k*h)*std::expm1(k*x)/std::expm1(k);
  }
  if(e.family==QUAD){
    const double inv2=1/(e.scale*e.scale);
    return 3*e.price*x*(1+(h*h+h*x+x*x/3)*inv2)/(1+inv2/3);
  }
  return e.price*cells;
}
int affordable(Economy e,const Out &r,int cells=3){
  if(r.def>=0)return 0;
  int lo=0,hi=1;while(hi<(1<<28) && price(e,r.heat,hi*cells)<=r.bank+1e-7){lo=hi;hi*=2;}
  while(hi-lo>1){int mid=lo+(hi-lo)/2;if(price(e,r.heat,mid*cells)<=r.bank+1e-7)lo=mid;else hi=mid;}
  return lo;
}
Seed plan(Script s,int orders){
  if(s==MINE)return STALK;
  if(s==CIVIL)return C6;
  if(s==ARMS)return GUN;
  // A support cycle: farms are productive. Ships/oscillators fund occupation or defence.
  constexpr Seed seq[]={C6,G4,C6,P2,C6,G4,C6,GUN};
  return seq[(orders-1)%8];
}
struct Due{double f=0,df=0,n=0,dn=0;};
Out run(Economy e,int step,Seed founder,Script script,bool save=false,int horizon=END,double endowment=0){
  Out r;r.bank=endowment;r.orders=0;
  std::vector<Due> dues(LIFE/step);int slot=0;
  double f=0,df=0,n=0,dn=0;
  const double decay=e.halfSec>0?std::exp(-L2*step/(e.halfSec*200)):1;
  auto plant=[&](Seed seed,int gen,bool grant){
    auto p=plants[seed];const double b=p.births-(p.w-1)*p.db/2, u=p.surv-(p.w-1)*p.ds/2;
    if(!grant){r.bank=std::max(0.,r.bank-price(e,r.heat,p.size));r.heat+=p.size/3.;if(r.first<0)r.first=gen;}
    f+=u-e.birthCost*b;df+=p.ds-e.birthCost*p.db;n+=u+b;dn+=p.ds+p.db;
    if(p.dies){dues[slot].f-=u-e.birthCost*b;dues[slot].n-=u+b;}
    if(p.emits){dues[slot].df-=p.ds-e.birthCost*p.db;dues[slot].dn-=p.ds+p.db;}
    r.orders++;r.nmines+=seed==STALK;r.nguns+=seed==GUN;if(seed==GUN&&r.gun<0)r.gun=gen;
    if(!grant && (seed==P2 || seed==G4 || seed==GUN) && r.guard<0)r.guard=gen;
  };
  plant(founder,0,true);
  const double d=step, tri=d*(d-1)/2,tri2=d*(d-1)*(2*d-1)/6;
  for(int t=step;t<=horizon;t+=step) {
    r.heat*=decay;
    double a=d*f+df*tri;
    if(e.family==RENT){
      // Sum the progressive territorial charge N(N-1)/scale across the interval.
      a-=(d*n*(n-1)+(2*n-1)*dn*tri+dn*dn*tri2)/e.scale;
    }
    if(e.family!=RENT&&f<0&&df>0){
      const double k=std::clamp(std::ceil(-f/df),0.,d);
      if(r.bank+k*f+df*k*(k-1)*.5< -1e-6){r.def=t;break;}
    }
    r.bank+=a;if(r.bank< -1e-6){r.def=t;break;}
    f+=df*d;n+=dn*d;
    auto &v=dues[slot]; f+=v.f;df+=v.df;n+=v.n;dn+=v.dn;v={};
    if(script!=IDLE && (!save||t<=110*M)){
      for(;;){
        const Seed next=plan(script,r.orders);
        if(r.bank+1e-8<price(e,r.heat,plants[next].size))break;
        plant(next,t,false);if(r.orders>=10000){r.cap=t;break;}
      }
    }
    r.peak=max(r.peak,n);if(n>=AREA&&r.area<0)r.area=t;
    if(t==5*M)r.n5=r.orders;
    if(t==30*M)r.n30=r.orders;
    if(t==40*M)r.n40=r.orders;
    if(t==60*M)r.n60=r.orders;
    if(r.cap>=0)break;
    if(++slot==int(dues.size()))slot=0;
  }return r;
}
double halton(int i,int b){double x=0,f=1;while(i){f/=b;x+=f*(i%b);i/=b;}return x;}
double geom(double a,double b,double u){return a*std::pow(b/a,u);}
int main(int argc,char** argv){
  int count=argc>1?std::atoi(argv[1]):32768;
  int step=argc>2?std::atoi(argv[2]):1000;
  if(step<=0||LIFE%step)return 2;
  std::vector<Economy> grid;
  if(argc>3){std::ifstream src(argv[3]);if(!src)return 2;std::string line;while(std::getline(src,line)){Economy e;if(std::sscanf(line.c_str(),"%d,%d,%lf,%lf,%lf,%lf",&e.id,&e.family,&e.price,&e.birthCost,&e.scale,&e.halfSec)==6)grid.push_back(e);}}
  else for(int i=0;i<count;i++){
    int j=1+i/4;auto fam=Family(i%4);
    // Linear rates don't depend on scale or half-life: vary only true inputs for that family.
    double p=geom(5,50000,halton(j,2)),b=(j%3==0?1:geom(.35,3.,halton(j,5)));
    double scale=fam==EXP?geom(.5,30,halton(j,3)):fam==QUAD?geom(.1,50,halton(j,3)):fam==RENT?geom(100,200000,halton(j,3)):0.;
    double life=(fam==EXP||fam==QUAD)?geom(60,21600,halton(j,7)):0.;
    grid.push_back({i,fam,p,b,scale,life});
  }
  std::puts("id,family,p,b,scale,half_s,founder,policy,save,n,first,gGuard,gGun,gDef,gArea,gCensor,n5,n30,n40,n60,E,peak,burst,nguns,nmines");
  #pragma omp parallel for schedule(dynamic,32)
  for(size_t i=0;i<grid.size();i++){
    Economy e=grid[i];for(Seed founder:{C6,STALK})for(Script pol:{MINE,CIVIL,MIX,ARMS}){
      for(int save=0;save<=(pol==MIX);save++){
        Out r=run(e,step,founder,pol,save);
        std::printf("%d,%d,%.11g,%.11g,%.10g,%.10g,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%.9g,%.8g,%d,%d,%d\n",e.id,e.family,e.price,e.birthCost,e.scale,e.halfSec,founder,pol,save,r.orders,r.first,r.guard,r.gun,r.def,r.area,r.cap,r.n5,r.n30,r.n40,r.n60,r.bank,r.peak,affordable(e,r),r.nguns,r.nmines);
      }
    }
  }
}
