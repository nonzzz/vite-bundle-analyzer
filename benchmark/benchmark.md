```txt
clk: ~4.61 GHz
cpu: AMD Ryzen 7 7800X3D 8-Core Processor
runtime: node 24.2.0 (x64-linux)

benchmark                   avg (min … max) p75 / p99    (min … top 1%)
------------------------------------------- -------------------------------
JavaScript SourceMap            1.03 s/iter    1.08 s  █          █        
                       (896.85 ms … 1.33 s)    1.21 s ▅█▅▅▅   ▅▅  █       ▅
                    (224.11 mb … 328.62 mb) 314.19 mb █████▁▁▁██▁▁█▁▁▁▁▁▁▁█

Zig SourceMap                210.35 ms/iter 211.30 ms ███ █  ██  █ █    ███
                    (202.63 ms … 244.52 ms) 212.37 ms ███ █  ██  █ █    ███
                    (  8.48 kb …   8.49 mb)   2.98 mb ███▁█▁▁██▁▁█▁█▁▁▁▁███
```
