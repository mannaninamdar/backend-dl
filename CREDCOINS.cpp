#include <bits/stdc++.h>
using namespace std;

#define int long long int
#define inf INT_MAX
#define mod 998244353

void f() {
    int x, y;
    cin >> x >> y;
    cout << (y * x) / 100 << "\n";
}

int32_t main() {
    ios::sync_with_stdio(0); cin.tie(0);
    int t; cin >> t;
    while (t--) f();
}