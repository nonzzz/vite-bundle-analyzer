```txt
clk: ~4.53 GHz
cpu: AMD Ryzen 7 7800X3D 8-Core Processor
runtime: node 24.2.0 (x64-linux)

benchmark                   avg (min … max) p75 / p99    (min … top 1%)
------------------------------------------- -------------------------------
JavaScript SourceMap          14.94 ms/iter  16.62 ms   █                  
                      (11.39 ms … 24.01 ms)  22.93 ms  ▃█▆                 
                    (  2.10 mb …  25.08 mb)  23.82 mb ▅███▃▅▅▁▃▅▃▃▇▁▃▁▃▁▃▃▃

Zig SourceMap                167.03 ms/iter 168.55 ms     █ █              
                    (164.63 ms … 170.27 ms) 170.13 ms ▅ ▅▅█ █ ▅     ▅   ▅ ▅
                    (  2.45 mb …   2.48 mb)   2.46 mb █▁███▁█▁█▁▁▁▁▁█▁▁▁█▁█
```
