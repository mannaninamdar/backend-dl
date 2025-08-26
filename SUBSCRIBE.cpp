#include <bits/stdc++.h>
using namespace std;

int main() {
	int T;
	cin >> T;
	while(T--){
	    int n,x;
	    cin >> n >> x;
	    int m=n/6;
	    if(n%6!=0)m++;
	    cout << m*x << endl;
	}
	return 0;
}