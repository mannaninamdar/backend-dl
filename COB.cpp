#include <iostream>
using namespace std;

int main() {
	int t;
	cin>>t;
	while(t--){
	    int x, y;
	    cin>>x>>y;
	    if(x<y){
	        cout<<"BIKE";
	    }
	    else if(x>y){
	        cout<<"CAR";
	    }
	    else{
	        cout<<"SAME";
	    }
	    cout<<endl;
	}
	return 0;
}