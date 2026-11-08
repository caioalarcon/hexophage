// Build: g++ -O3 -std=c++17 -fopenmp sweep.cpp -o sweep
// Full search: ./sweep [count=262144] [step_generations=1000]  > full.csv
// Revalidation: ./sweep --replay finalists.csv [step_generations=1] > precise.csv
// finalists.csv: id,p,beta,d,T, one numeric row per line (optional later columns).
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <limits>
#include <sstream>
#include <string>
#include <vector>
using std::max; using std::min;
constexpr int RATE=200, MINUTE=60*RATE, END=120*MINUTE, LIFE=MINUTE;
constexpr double LN2=.6931471805599453094;
bool massFamily=false, polyFamily=false;
double poly(double h,double x,int a){
    if(a==1)return h+x/2;
    if(a==2)return h*h+h*x+x*x/3;
    return h*h*h+1.5*h*h*x+h*x*x+x*x*x/4;
}
struct Price { int id; double p,beta,d,T; };
struct Pattern { double s, income, slope, biomass, biomassSlope, runway; bool dies; };
// p2, glider, p4f, gun20; same phase averages and first-turn centring as macro-profiles.js.
constexpr Pattern SEED[]={{3,1,0,3,0,0,false},{6,3.5,0,6.5,0,0,true},
                         {5,2,0,6,0,0,false},{52,-15.1-9.5*.175,.175,57-9.5*.325,.325,829,false}};
struct Due {double flow=0,slope=0,field=0,fieldSlope=0;};
struct Result {int total=0, at5=0,at10=0,at15=0,at20=0,at25=0,at30=0,at40=0,at60=0,second=-1,firstGun=-1,deficit=-1,stop=-1;double fieldMax=0,field40=0,bank=0,h=0;};
enum class Policy {mixed, flipper, guns, gliders};
int nextPattern(Policy policy,int n) {
    if (n==0 || policy==Policy::flipper) return 0;
    if (policy==Policy::guns) return n<4 ? 0 : 3;
    if (policy==Policy::gliders) return 1;
    constexpr int sequence[]={1,0,1,2};
    return sequence[(n-1)%4];
}
Result simulate(Price a, Policy policy, int step, int holdFrom=END) {
    Result r;
    std::vector<Due> expire(LIFE/step); // steps must exactly divide LIFE
    const int nslot=expire.size();
    double quote[4], multipliers[4], heatUnit[4];
    const int degree=polyFamily?int(a.beta):0;
    const double invScale=polyFamily?1/std::pow(a.d,degree):0;
    const double norm=3*a.p/(1+invScale/(degree+1));
    for(int i=0;i<4;i++){
        heatUnit[i]=massFamily?SEED[i].s/3:1;
        multipliers[i]=std::exp2(heatUnit[i]/a.d);
        quote[i]=3*a.p*(massFamily?std::expm1(LN2*SEED[i].s/(3*a.d))/std::expm1(LN2/a.d)
            :std::pow(SEED[i].s/3,1+a.beta));
    }
    double bank=3*a.p, flow=0,slope=0,field=0,fieldSlope=0, heat=0;
    const double decay=std::exp(-LN2*step/(RATE*a.T));
    const double invD=1/a.d, premium=std::exp2(invD), advance=step*(step-1.)/2;
    int slot=0;
    for(int t=0;t<=END;t+=step){
        if(t>0){
            // Sum per-generation operating income exactly between purchases/expirations.
            const double delta=step*flow+advance*slope;
            if (flow<0 && slope>0){
                const double m=std::clamp(std::ceil(-flow/slope),0.,double(step));
                if(bank+m*flow+m*(m-1)*slope*.5 < -1e-7) {r.deficit=t;break;}
            }
            bank+=delta;
            if(bank < -1e-7){r.deficit=t;break;}
            heat*=decay; flow+=slope*step; field+=fieldSlope*step;
            auto &due=expire[slot]; flow+=due.flow; slope+=due.slope;
            field+=due.field; fieldSlope+=due.fieldSlope; due={};
        }
        if(t<=holdFrom){
            double factor=polyFamily?1:std::exp2(heat*invD);
            for(;;){
                const auto index=nextPattern(policy,r.total); const auto p=SEED[index];
                const double cost=polyFamily?norm*heatUnit[index]*(1+poly(heat,heatUnit[index],degree)*invScale):quote[index]*factor;
                if(bank+1e-8 < cost+p.runway)break;
                bank=max(0.,bank-cost); heat+=heatUnit[index]; factor*=multipliers[index];
                flow+=p.income; slope+=p.slope; field+=p.biomass; fieldSlope+=p.biomassSlope;
                if(p.dies){expire[slot].flow-=p.income;expire[slot].field-=p.biomass;}
                if(p.slope!=0){expire[slot].slope-=p.slope; expire[slot].fieldSlope-=p.biomassSlope;}
                if(++r.total==2)r.second=t;
                if(index==3 && r.firstGun<0)r.firstGun=t;
                if(r.total>=10000){r.stop=t;break;}
            }
        }
        r.fieldMax=max(r.fieldMax,field);
        if(t==5*MINUTE)r.at5=r.total;
        if(t==10*MINUTE)r.at10=r.total;
        if(t==15*MINUTE)r.at15=r.total;
        if(t==20*MINUTE)r.at20=r.total;
        if(t==25*MINUTE)r.at25=r.total;
        if(t==30*MINUTE)r.at30=r.total;
        if(t==40*MINUTE){r.at40=r.total;r.field40=r.fieldMax;}
        if(t==60*MINUTE)r.at60=r.total;
        if(r.stop>=0)break;
        if(++slot==nslot)slot=0;
    }
    r.bank=bank;r.h=heat;return r;
}
int burst(const Price& a, const Result& r) {
    if(polyFamily){
        const int degree=int(a.beta);const double invScale=1/std::pow(a.d,degree);
        const double factor=3*a.p/(1+invScale/(degree+1));
        auto cost=[&](int x){return factor*x*(1+poly(r.h,x,degree)*invScale);};
        int lo=0,hi=1;while(hi<(1<<29)&&cost(hi)<=r.bank+1e-8){lo=hi;hi*=2;}
        while(hi-lo>1){int mid=lo+(hi-lo)/2;if(cost(mid)<=r.bank+1e-8)lo=mid;else hi=mid;}
        return lo;
    }
    const double k=LN2/a.d;
    return int(std::floor(std::log1p(max(0.,r.bank)*std::expm1(k)/(3*a.p*std::exp(k*r.h)))/k+1e-10));
}
double gap(double v,double lo,double hi) {
    if(v<lo)return (lo-v)/lo;
    if(v>hi)return std::log1p((v-hi)/hi);
    return 0;
}
double halton(unsigned i, unsigned base) {
    double x=0,f=1;
    while(i){f/=base;x+=f*(i%base);i/=base;} return x;
}
double geom(double lo,double hi,double u){return lo*std::pow(hi/lo,u);}
Price candidate(unsigned id){
    if(polyFamily){
        unsigned j=1+id/3;
        return {int(id),geom(5,2500,halton(j,2)),double(1+id%3),
                geom(.02,40,halton(j,3)),(j%13==0?std::numeric_limits<double>::infinity():geom(120,43200,halton(j,5)))};
    }
    const unsigned j=1+id/2;
    return {int(id),geom(5,2500,halton(j,2)),id%2?1.6*halton(j,7):0.,
            geom(.18,35,halton(j,3)),geom(15,2400,halton(j,5))};
}
struct Summary {Price a;double score;int valid;Result mixed,cheap,gun,ship,bank;};
Summary measure(Price a,int step){
    const Result m=simulate(a,Policy::mixed,step), f=simulate(a,Policy::flipper,step),
        g=simulate(a,Policy::guns,step), s=simulate(a,Policy::gliders,step),
        b=simulate(a,Policy::mixed,step,110*MINUTE);
    const double early=(m.at30-m.at5)/25., middle=(m.at60-m.at30)/30., late=(m.total-m.at60)/60.;
    const double r2=m.second/double(RATE), g1=g.firstGun/double(MINUTE);
    const int saved=burst(a,b);
    const double exceed=gap(r2,15,90)+gap(early,1,6)+gap(middle,1,6)+gap(late,1,6)
        +gap(saved,2,12)+gap(g1,4,25)+gap((f.total-f.at60)/60.,0,10)
        +gap(g.fieldMax,0,1024002);
    const bool failed=(m.stop>=0||m.deficit>=0||g.stop>=0||g.deficit>=0||f.stop>=0||f.deficit>=0
                      ||s.stop>=0||s.deficit>=0||b.stop>=0||b.deficit>=0);
    // Prefer balanced tempo, some bankable latitude, fiscal viability and no
    // major incentive to subdivide a single stamp. Log distances compare ratios.
    const auto err=[](double v,double target){return std::abs(std::log(max(.01,v)/target));};
    const double preference=.24*err((early+middle+late)/3,2.5)+.23*err(saved,6)+.16*err(r2,40)
        +.15*err(g1,10)+.12*err((g.total-g.at60)/60.,2.5)+.10*err((f.total-f.at60)/60.,2.5);
    return {a,preference+12*exceed+100*failed,exceed<1e-10&&!failed,m,f,g,s,b};
}
int main(int argc,char** argv){
    polyFamily=std::getenv("HEX_SWEEP_POLY")!=nullptr;
    massFamily=polyFamily||std::getenv("HEX_SWEEP_MASS")!=nullptr;
    std::vector<Price> grid;
    int step=1000;
    if(argc>2 && std::string(argv[1])=="--replay"){
        std::ifstream in(argv[2]);std::string line;
        if(!in) return 2;
        while(std::getline(in,line)){Price a;if(std::sscanf(line.c_str(),"%d,%lf,%lf,%lf,%lf",&a.id,&a.p,&a.beta,&a.d,&a.T)==5)grid.push_back(a);}
        if(argc>3)step=std::atoi(argv[3]);
    }else{
        const int n=argc>1?std::atoi(argv[1]):262144;
        for(int i=0;i<n;i++)grid.push_back(massFamily&&!polyFamily?candidate(i*2):candidate(i));
        if(argc>2)step=std::atoi(argv[2]);
    }
    if(step<=0||LIFE%step||grid.empty())return 2;
    std::vector<Summary> all(grid.size());
    #pragma omp parallel for schedule(dynamic,128)
    for(size_t i=0;i<grid.size();++i)all[i]=measure(grid[i],step);
    std::printf("id,p,beta,d,T,score,feasible,second_s,mixed5,mixed30,mixed60,mixed120,guns_first_min,gun120,gun60,gun_fieldpeak,flipper120,flipper60,glider120,burst10,savedE,mixed10,mixed15,mixed20,mixed25,mixed40,gun40,gunField40\n");
    for(const auto &r:all){
        auto a=r.a;std::printf("%d,%.12g,%.12g,%.12g,%.12g,%.8g,%d,%.4f,%d,%d,%d,%d,%.6f,%d,%d,%.6f,%d,%d,%d,%d,%.8g,%d,%d,%d,%d,%d,%d,%.6f\n",
            a.id,a.p,a.beta,a.d,a.T,r.score,r.valid,r.mixed.second/double(RATE),r.mixed.at5,r.mixed.at30,r.mixed.at60,
            r.mixed.total,r.gun.firstGun/double(MINUTE),r.gun.total,r.gun.at60,r.gun.fieldMax,r.cheap.total,r.cheap.at60,r.ship.total,burst(a,r.bank),r.bank.bank,r.mixed.at10,r.mixed.at15,r.mixed.at20,r.mixed.at25,r.mixed.at40,r.gun.at40,r.gun.field40);
    }
}
