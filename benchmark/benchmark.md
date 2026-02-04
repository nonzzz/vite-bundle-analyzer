```txt
clk: ~4.60 GHz
cpu: AMD Ryzen 7 7800X3D 8-Core Processor
runtime: node 24.2.0 (x64-linux)

benchmark                   avg (min … max) p75 / p99    (min … top 1%)
------------------------------------------- -------------------------------
JavaScript SourceMap          13.56 ms/iter  13.57 ms  █▂                  
                      (12.07 ms … 21.91 ms)  19.89 ms  ██ ▂                
                    (  2.40 mb …  25.08 mb)  24.16 mb ▅██▄█▁▂▁▁▁▄▁▁▂▄▁▁▁▁▁▂

Zig SourceMap                 12.91 ms/iter  13.73 ms  █              ▃    
                      (11.49 ms … 16.88 ms)  14.26 ms  █             ▅█ ▅  
                    (  1.90 mb …   2.02 mb)   1.95 mb ▆█▃█▆▆█▃▁▁▁▃▃▁▁████▃▆
```
